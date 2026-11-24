import { pool } from "../config/database.js";
import argon2 from "argon2";
import { createAuditLog } from "./auditLog.service.js";

// ==========================================
// TUTOR SELECT QUERY
// ==========================================

const tutorSelect = `
  SELECT
    tp.id,
    hpp.id AS "hrPersonProfileId",
    tp.user_id AS "userId",
    tp.tutor_code AS "tutorCode",

    u.full_name AS "fullName",
    u.email,
    u.phone,
    u.is_active AS "accountIsActive",

    tp.education_level AS "educationLevel",
    tp.education_major AS "educationMajor",
    tp.experience_years AS "experienceYears",
    tp.expertise,
    tp.employment_status AS "employmentStatus",
    tp.join_date AS "joinDate",

    tp.emergency_contact_name AS "emergencyContactName",
    tp.emergency_contact_phone AS "emergencyContactPhone",

    tp.address,
    tp.notes,

    tp.created_at AS "createdAt",
    tp.updated_at AS "updatedAt",

    (
      SELECT COUNT(DISTINCT tba.branch_id)::INTEGER
      FROM tutor_branch_assignments tba
      WHERE tba.tutor_id = tp.id
        AND tba.assigned_from <= CURRENT_DATE
        AND (
          tba.assigned_until IS NULL
          OR tba.assigned_until >= CURRENT_DATE
        )
    ) AS "activeBranchCount"

  FROM tutor_profiles tp

  INNER JOIN users u
    ON u.id = tp.user_id

  LEFT JOIN hr_person_profiles hpp
    ON hpp.user_id = tp.user_id
    AND hpp.profile_type = 'tutor'
    AND hpp.profile_id = tp.id
`;

// ==========================================
// AUDIT LOG HELPER
// ==========================================

async function writeAssignmentAudit(
  client,
  {
    actorId,
    branchId,
    action,
    assignmentId,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
  },
) {
  await createAuditLog(
    {
      userId: actorId,
      branchId,
      action,
      entityTable: "tutor_branch_assignments",
      entityId: assignmentId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
    },
    client,
  );
}

// ==========================================
// ASSIGNMENT SNAPSHOT HELPER
// ==========================================

function assignmentSnapshot(assignment) {
  if (!assignment) return null;

  return {
    id: assignment.id,
    branchId: assignment.branchId,
    assignedFrom: assignment.assignedFrom,
    assignedUntil: assignment.assignedUntil,
    isPrimary: assignment.isPrimary,
  };
}

// ==========================================
// GET ALL TUTORS
// ==========================================

export async function getAllTutors({
  search = "",
  employmentStatus = "",
  branchId = "",
  page = 1,
  limit = 10,
} = {}) {
  const conditions = [];
  const values = [];
  let index = 1;

  if (search) {
    conditions.push(`
      (
        u.full_name ILIKE $${index}
        OR u.email ILIKE $${index}
        OR u.phone ILIKE $${index}
        OR tp.tutor_code ILIKE $${index}
      )
    `);

    values.push(`%${search}%`);
    index++;
  }

  if (employmentStatus) {
    conditions.push(`tp.employment_status = $${index}`);

    values.push(employmentStatus);
    index++;
  }

  if (branchId) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM tutor_branch_assignments tba
        WHERE tba.tutor_id = tp.id
          AND tba.branch_id = $${index}
          AND tba.assigned_from <= CURRENT_DATE
          AND (
            tba.assigned_until IS NULL
            OR tba.assigned_until >= CURRENT_DATE
          )
      )
    `);

    values.push(branchId);
    index++;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::INTEGER AS total
      FROM tutor_profiles tp
      INNER JOIN users u
        ON u.id = tp.user_id
      ${whereClause}
    `,
    values,
  );

  const dataResult = await pool.query(
    `
      ${tutorSelect}
      ${whereClause}
      ORDER BY tp.created_at DESC
      LIMIT $${index}
      OFFSET $${index + 1}
    `,
    [...values, limit, offset],
  );

  const total = countResult.rows[0].total;

  return {
    data: dataResult.rows,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

// ==========================================
// GET TUTOR BY ID
// ==========================================

export async function getTutorById(id) {
  const result = await pool.query(
    `
      SELECT
        tutor.id,
        tutor."hrPersonProfileId",
        tutor."userId",
        tutor."tutorCode",
        tutor."fullName",
        tutor.email,
        tutor.phone,
        tutor."accountIsActive",

        tutor."educationLevel",
        tutor."educationMajor",
        tutor."experienceYears",
        tutor.expertise,
        tutor."employmentStatus",
        tutor."joinDate",

        tutor."emergencyContactName",
        tutor."emergencyContactPhone",

        tutor.address,
        tutor.notes,

        tutor."createdAt",
        tutor."updatedAt",

        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', tba.id,
                'branchId', b.id,
                'branchCode', b.branch_code,
                'branchName', b.branch_name,
                'assignedFrom', tba.assigned_from,
                'assignedUntil', tba.assigned_until,
                'isPrimary', tba.is_primary,
                'isActive',
                  (
                    tba.assigned_from <= CURRENT_DATE
                    AND (
                      tba.assigned_until IS NULL
                      OR tba.assigned_until >= CURRENT_DATE
                    )
                  )
              )
              ORDER BY
                tba.is_primary DESC,
                b.branch_name,
                tba.assigned_from
            )
            FROM tutor_branch_assignments tba
            INNER JOIN branches b
              ON b.id = tba.branch_id
            WHERE tba.tutor_id = tutor.id
          ),
          '[]'::jsonb
        ) AS "branchAssignments"

      FROM (
        ${tutorSelect}
      ) tutor

      WHERE tutor.id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
}

// ==========================================
// CREATE TUTOR
// AKUN + PROFIL + ROLE + CABANG
// ==========================================

export async function createTutor(data, auditContext) {
  const { actorId, ipAddress, userAgent } = auditContext;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------
    // 1. VALIDASI ROLE TUTOR
    // --------------------------------------

    const roleResult = await client.query(
      `
        SELECT id
        FROM roles
        WHERE role_code = 'tutor'
        LIMIT 1
      `,
    );

    if (roleResult.rowCount === 0) {
      const error = new Error("Role Tutor tidak ditemukan.");

      error.statusCode = 500;
      throw error;
    }

    const tutorRoleId = roleResult.rows[0].id;

    // --------------------------------------
    // 2. VALIDASI CABANG UNIK
    // --------------------------------------

    const branchIds = [
      ...new Set(
        data.branchAssignments.map((assignment) => assignment.branchId),
      ),
    ];

    const branchResult = await client.query(
      `
        SELECT id
        FROM branches
        WHERE id = ANY($1::uuid[])
          AND is_active = TRUE
        FOR SHARE
      `,
      [branchIds],
    );

    if (branchResult.rowCount !== branchIds.length) {
      const error = new Error(
        "Salah satu cabang tidak ditemukan atau sudah tidak aktif.",
      );

      error.statusCode = 400;
      throw error;
    }

    // --------------------------------------
    // 3. HASH PASSWORD
    // --------------------------------------

    const passwordHash = await argon2.hash(data.password);

    // --------------------------------------
    // 4. BUAT USER ACCOUNT
    // --------------------------------------

    const userResult = await client.query(
      `
        INSERT INTO users (
          full_name,
          email,
          phone,
          password_hash,
          is_active
        )
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING id
      `,
      [data.fullName, data.email, data.phone, passwordHash],
    );

    const userId = userResult.rows[0].id;

    // --------------------------------------
    // 5. BUAT TUTOR PROFILE
    // --------------------------------------

    const profileResult = await client.query(
      `
        INSERT INTO tutor_profiles (
          user_id,
          tutor_code,
          education_level,
          education_major,
          experience_years,
          expertise,
          employment_status,
          join_date,
          emergency_contact_name,
          emergency_contact_phone,
          address,
          notes
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12
        )
        RETURNING id
      `,
      [
        userId,
        data.tutorCode,
        data.educationLevel,
        data.educationMajor,
        data.experienceYears,
        data.expertise,
        data.employmentStatus,
        data.joinDate,
        data.emergencyContactName,
        data.emergencyContactPhone,
        data.address,
        data.notes,
      ],
    );

    const tutorId = profileResult.rows[0].id;

    // --------------------------------------
    // 6. BUAT SEMUA PERIODE PENUGASAN
    // --------------------------------------

    const activeBranchIds = new Set();
    const activePrimaryBranchIds = new Set();

    const todayResult = await client.query(`
      SELECT CURRENT_DATE::text AS today
    `);

    const today = todayResult.rows[0].today;

    for (const assignment of data.branchAssignments) {
      const assignedFrom = assignment.assignedFrom || null;

      const insertResult = await client.query(
        `
          INSERT INTO tutor_branch_assignments (
            tutor_id,
            branch_id,
            assigned_from,
            assigned_until,
            is_primary
          )
          VALUES (
            $1,
            $2,
            COALESCE($3::date, CURRENT_DATE),
            $4,
            $5
          )
          RETURNING
            id,
            branch_id AS "branchId",
            assigned_from::text AS "assignedFrom",
            assigned_until::text AS "assignedUntil",
            is_primary AS "isPrimary"
        `,
        [
          tutorId,
          assignment.branchId,
          assignedFrom,
          assignment.assignedUntil,
          assignment.isPrimary,
        ],
      );

      const createdAssignment = insertResult.rows[0];

      const isActive =
        createdAssignment.assignedFrom <= today &&
        (createdAssignment.assignedUntil === null ||
          createdAssignment.assignedUntil >= today);

      if (isActive) {
        activeBranchIds.add(assignment.branchId);

        if (createdAssignment.isPrimary) {
          activePrimaryBranchIds.add(assignment.branchId);
        }
      }

      await writeAssignmentAudit(client, {
        actorId,
        branchId: assignment.branchId,
        action: "CREATE_TUTOR_ASSIGNMENT",
        assignmentId: createdAssignment.id,
        newValues: assignmentSnapshot(createdAssignment),
        ipAddress,
        userAgent,
      });
    }

    // --------------------------------------
    // 6B. VALIDASI CABANG UTAMA AKTIF
    // --------------------------------------

    if (activeBranchIds.size > 0 && activePrimaryBranchIds.size !== 1) {
      const error = new Error(
        "Tutor harus memiliki tepat satu cabang utama pada penugasan aktif.",
      );

      error.statusCode = 400;
      throw error;
    }

    // --------------------------------------
    // 7. BUAT ROLE PER CABANG UNIK
    // --------------------------------------

    for (const branchId of branchIds) {
      const shouldActivateRole =
        data.employmentStatus === "active" && activeBranchIds.has(branchId);

      await client.query(
        `
          INSERT INTO user_branch_roles (
            user_id,
            role_id,
            branch_id,
            assigned_by,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, role_id, branch_id)
          DO UPDATE SET
            is_active = EXCLUDED.is_active
        `,
        [userId, tutorRoleId, branchId, actorId || null, shouldActivateRole],
      );
    }

    // --------------------------------------
    // 8. CATAT AUDIT PROFIL TUTOR
    // --------------------------------------

    const createdTutorResult = await client.query(
      `
        ${tutorSelect}
        WHERE tp.id = $1
      `,
      [tutorId],
    );

    await createAuditLog(
      {
        userId: actorId,
        branchId: null,
        action: "TUTOR_CREATED",
        entityTable: "tutor_profiles",
        entityId: tutorId,
        newValues: createdTutorResult.rows[0],
        ipAddress,
        userAgent,
      },
      client,
    );

    // --------------------------------------
    // 9. COMMIT
    // --------------------------------------

    await client.query("COMMIT");

    return getTutorById(tutorId);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    if (error.code === "23505") {
      const conflictError = new Error(
        "Email, nomor HP, atau kode tutor sudah digunakan.",
      );

      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// UPDATE TUTOR
// UPDATE PROFIL + AKUN + PENUGASAN
// ==========================================

export async function updateTutor(id, data, auditContext) {
  const { actorId, ipAddress, userAgent } = auditContext;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------
    // 1. KUNCI DAN CARI TUTOR
    // --------------------------------------

    const tutorResult = await client.query(
      `
        SELECT
          tp.id,
          tp.user_id AS "userId"
        FROM tutor_profiles tp
        WHERE tp.id = $1
        FOR UPDATE
      `,
      [id],
    );

    if (tutorResult.rowCount === 0) {
      const error = new Error("Tutor tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    const tutor = tutorResult.rows[0];

    // Snapshot profil sebelum perubahan.
    const oldTutorResult = await client.query(
      `
        ${tutorSelect}
        WHERE tp.id = $1
      `,
      [id],
    );

    const oldTutorValues = oldTutorResult.rows[0];

    // --------------------------------------
    // 2. AMBIL ROLE TUTOR
    // --------------------------------------

    const roleResult = await client.query(
      `
        SELECT id
        FROM roles
        WHERE role_code = 'tutor'
        LIMIT 1
      `,
    );

    if (roleResult.rowCount === 0) {
      const error = new Error("Role Tutor tidak ditemukan.");
      error.statusCode = 500;
      throw error;
    }

    const tutorRoleId = roleResult.rows[0].id;

    // --------------------------------------
    // 3. VALIDASI CABANG UNIK
    // --------------------------------------

    const branchIds = [
      ...new Set(
        data.branchAssignments.map((assignment) => assignment.branchId),
      ),
    ];

    const branchResult = await client.query(
      `
        SELECT id
        FROM branches
        WHERE id = ANY($1::uuid[])
          AND is_active = TRUE
        FOR SHARE
      `,
      [branchIds],
    );

    if (branchResult.rowCount !== branchIds.length) {
      const error = new Error(
        "Salah satu cabang tidak ditemukan atau sudah tidak aktif.",
      );

      error.statusCode = 400;
      throw error;
    }

    // --------------------------------------
    // 4. AMBIL TANGGAL DATABASE
    // --------------------------------------

    const dateResult = await client.query(`SELECT CURRENT_DATE::text AS today`);

    const today = dateResult.rows[0].today;

    const yesterdayDate = new Date(`${today}T00:00:00.000Z`);

    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);

    const yesterday = yesterdayDate.toISOString().slice(0, 10);

    // --------------------------------------
    // 5. AMBIL SELURUH RIWAYAT PENUGASAN
    // --------------------------------------

    const assignmentResult = await client.query(
      `
        SELECT
          id,
          branch_id AS "branchId",
          assigned_from::text AS "assignedFrom",
          assigned_until::text AS "assignedUntil",
          is_primary AS "isPrimary"
        FROM tutor_branch_assignments
        WHERE tutor_id = $1
        ORDER BY assigned_from
        FOR UPDATE
      `,
      [id],
    );

    const existingAssignments = assignmentResult.rows;

    const existingById = new Map(
      existingAssignments.map((assignment) => [assignment.id, assignment]),
    );

    // --------------------------------------
    // 6. VALIDASI ID PENUGASAN
    // --------------------------------------

    const submittedIds = new Set();

    for (const assignment of data.branchAssignments) {
      if (!assignment.id) continue;

      if (submittedIds.has(assignment.id)) {
        const error = new Error(
          "ID penugasan yang sama dikirim lebih dari satu kali.",
        );

        error.statusCode = 400;
        throw error;
      }

      submittedIds.add(assignment.id);

      if (!existingById.has(assignment.id)) {
        const error = new Error(
          "Penugasan tidak ditemukan atau bukan milik tutor ini.",
        );

        error.statusCode = 400;
        throw error;
      }
    }

    // --------------------------------------
    // 7. SUSUN KONDISI AKHIR PENUGASAN
    // --------------------------------------

    const desiredAssignments = [];

    // A. Penugasan yang dikirim dari frontend.
    for (const assignment of data.branchAssignments) {
      const existing = assignment.id ? existingById.get(assignment.id) : null;

      desiredAssignments.push({
        id: existing?.id || null,
        branchId: assignment.branchId,

        assignedFrom:
          assignment.assignedFrom || existing?.assignedFrom || today,

        assignedUntil:
          assignment.assignedUntil !== undefined
            ? assignment.assignedUntil
            : (existing?.assignedUntil ?? null),

        isPrimary: assignment.isPrimary,
        isNew: !existing,
      });
    }

    // B. Penugasan lama yang tidak dikirim.
    // Riwayat lampau tetap dipertahankan.
    for (const existing of existingAssignments) {
      if (submittedIds.has(existing.id)) {
        continue;
      }

      const isPast =
        existing.assignedUntil !== null && existing.assignedUntil < today;

      const isCurrent =
        existing.assignedFrom <= today &&
        (existing.assignedUntil === null || existing.assignedUntil >= today);

      const isFuture = existing.assignedFrom > today;

      if (isPast) {
        desiredAssignments.push({
          ...existing,
          isNew: false,
          preserve: true,
        });
      } else if (isCurrent) {
        if (existing.assignedFrom === today) {
          // Penugasan yang baru mulai hari ini
          // dibatalkan dengan menghapus barisnya.
          continue;
        }

        // Penugasan yang sudah berjalan
        // diakhiri kemarin.
        desiredAssignments.push({
          ...existing,
          assignedUntil: yesterday,
          isNew: false,
          isClosed: true,
        });
      } else if (isFuture) {
        // Penugasan mendatang dibatalkan.
        continue;
      }
    }

    // --------------------------------------
    // 8. VALIDASI PERIODE AKHIR
    // --------------------------------------

    for (const assignment of desiredAssignments) {
      if (
        assignment.assignedUntil &&
        assignment.assignedUntil < assignment.assignedFrom
      ) {
        const error = new Error(
          "Tanggal akhir penugasan tidak boleh sebelum tanggal mulai.",
        );

        error.statusCode = 400;
        throw error;
      }
    }

    // --------------------------------------
    // 9. VALIDASI BENTROK SEMUA PERIODE
    // --------------------------------------

    const assignmentsByBranch = new Map();

    for (const assignment of desiredAssignments) {
      if (!assignmentsByBranch.has(assignment.branchId)) {
        assignmentsByBranch.set(assignment.branchId, []);
      }

      assignmentsByBranch.get(assignment.branchId).push(assignment);
    }

    for (const branchAssignments of assignmentsByBranch.values()) {
      const sortedAssignments = [...branchAssignments].sort((a, b) =>
        a.assignedFrom.localeCompare(b.assignedFrom),
      );

      for (let index = 1; index < sortedAssignments.length; index++) {
        const previous = sortedAssignments[index - 1];
        const current = sortedAssignments[index];

        if (
          previous.assignedUntil === null ||
          current.assignedFrom <= previous.assignedUntil
        ) {
          const error = new Error(
            "Periode penugasan cabang bertabrakan dengan periode lainnya.",
          );

          error.statusCode = 409;
          throw error;
        }
      }
    }

    // --------------------------------------
    // 9B. VALIDASI CABANG UTAMA AKTIF
    // --------------------------------------

    const activeBranchIds = new Set();
    const activePrimaryBranchIds = new Set();

    for (const assignment of desiredAssignments) {
      const isActive =
        assignment.assignedFrom <= today &&
        (assignment.assignedUntil === null ||
          assignment.assignedUntil >= today);

      if (!isActive) continue;

      activeBranchIds.add(assignment.branchId);

      if (assignment.isPrimary) {
        activePrimaryBranchIds.add(assignment.branchId);
      }
    }

    if (activeBranchIds.size > 0 && activePrimaryBranchIds.size !== 1) {
      const error = new Error(
        "Tutor harus memiliki tepat satu cabang utama pada penugasan aktif.",
      );

      error.statusCode = 400;
      throw error;
    }

    // --------------------------------------
    // 10. SIMPAN PERUBAHAN PENUGASAN
    // --------------------------------------

    const retainedIds = new Set();

    for (const assignment of desiredAssignments) {
      if (assignment.preserve) {
        retainedIds.add(assignment.id);
        continue;
      }

      const oldAssignment = assignment.id
        ? existingById.get(assignment.id)
        : null;

      // A. UPDATE PENUGASAN LAMA
      if (oldAssignment) {
        const newSnapshot = {
          id: oldAssignment.id,
          branchId: assignment.branchId,
          assignedFrom: assignment.assignedFrom,
          assignedUntil: assignment.assignedUntil,
          isPrimary: assignment.isPrimary,
        };

        const oldSnapshot = assignmentSnapshot(oldAssignment);

        const changed =
          oldSnapshot.branchId !== newSnapshot.branchId ||
          oldSnapshot.assignedFrom !== newSnapshot.assignedFrom ||
          oldSnapshot.assignedUntil !== newSnapshot.assignedUntil ||
          oldSnapshot.isPrimary !== newSnapshot.isPrimary;

        if (changed) {
          await client.query(
            `
              UPDATE tutor_branch_assignments
              SET
                branch_id = $1,
                assigned_from = $2,
                assigned_until = $3,
                is_primary = $4
              WHERE id = $5
            `,
            [
              assignment.branchId,
              assignment.assignedFrom,
              assignment.assignedUntil,
              assignment.isPrimary,
              assignment.id,
            ],
          );

          await writeAssignmentAudit(client, {
            actorId,
            ipAddress,
            userAgent,
            branchId: assignment.branchId,
            action: "UPDATE_TUTOR_ASSIGNMENT",
            assignmentId: assignment.id,
            oldValues: oldSnapshot,
            newValues: newSnapshot,
          });
        }

        retainedIds.add(assignment.id);
        continue;
      }

      // B. INSERT PENUGASAN BARU
      const insertResult = await client.query(
        `
          INSERT INTO tutor_branch_assignments (
            tutor_id,
            branch_id,
            assigned_from,
            assigned_until,
            is_primary
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING
            id,
            branch_id AS "branchId",
            assigned_from::text AS "assignedFrom",
            assigned_until::text AS "assignedUntil",
            is_primary AS "isPrimary"
        `,
        [
          id,
          assignment.branchId,
          assignment.assignedFrom,
          assignment.assignedUntil,
          assignment.isPrimary,
        ],
      );

      const createdAssignment = insertResult.rows[0];

      retainedIds.add(createdAssignment.id);

      await writeAssignmentAudit(client, {
        actorId,
        ipAddress,
        userAgent,
        branchId: createdAssignment.branchId,
        action: "CREATE_TUTOR_ASSIGNMENT",
        assignmentId: createdAssignment.id,
        newValues: assignmentSnapshot(createdAssignment),
      });
    }

    // --------------------------------------
    // 11. BATALKAN PENUGASAN YANG DIHILANGKAN
    // --------------------------------------

    for (const existing of existingAssignments) {
      if (retainedIds.has(existing.id)) {
        continue;
      }

      const isPast =
        existing.assignedUntil !== null && existing.assignedUntil < today;

      if (isPast) {
        continue;
      }

      const isCurrent =
        existing.assignedFrom <= today &&
        (existing.assignedUntil === null || existing.assignedUntil >= today);

      const isFuture = existing.assignedFrom > today;

      // Penugasan mulai hari ini atau mendatang
      // dihapus sebagai pembatalan.
      if (isFuture || (isCurrent && existing.assignedFrom === today)) {
        await client.query(
          `
            DELETE FROM tutor_branch_assignments
            WHERE id = $1
          `,
          [existing.id],
        );

        await writeAssignmentAudit(client, {
          actorId,
          ipAddress,
          userAgent,
          branchId: existing.branchId,
          action: "CANCEL_TUTOR_ASSIGNMENT",
          assignmentId: existing.id,
          oldValues: assignmentSnapshot(existing),
        });

        continue;
      }

      // Penugasan aktif yang sudah berjalan
      // diakhiri sehari sebelum hari ini.
      if (isCurrent) {
        const newSnapshot = {
          ...assignmentSnapshot(existing),
          assignedUntil: yesterday,
        };

        await client.query(
          `
            UPDATE tutor_branch_assignments
            SET assigned_until = $1
            WHERE id = $2
          `,
          [yesterday, existing.id],
        );

        await writeAssignmentAudit(client, {
          actorId,
          ipAddress,
          userAgent,
          branchId: existing.branchId,
          action: "UPDATE_TUTOR_ASSIGNMENT",
          assignmentId: existing.id,
          oldValues: assignmentSnapshot(existing),
          newValues: newSnapshot,
        });
      }
    }

    // --------------------------------------
    // 12. UPDATE AKUN USER
    // --------------------------------------

    await client.query(
      `
        UPDATE users
        SET
          full_name = $1,
          email = $2,
          phone = $3,
          updated_at = NOW()
        WHERE id = $4
      `,
      [data.fullName, data.email, data.phone, tutor.userId],
    );

    // --------------------------------------
    // 13. UPDATE PROFIL TUTOR
    // --------------------------------------

    await client.query(
      `
        UPDATE tutor_profiles
        SET
          tutor_code = $1,
          education_level = $2,
          education_major = $3,
          experience_years = $4,
          expertise = $5,
          employment_status = $6,
          join_date = $7,
          emergency_contact_name = $8,
          emergency_contact_phone = $9,
          address = $10,
          notes = $11,
          updated_at = NOW()
        WHERE id = $12
      `,
      [
        data.tutorCode,
        data.educationLevel,
        data.educationMajor,
        data.experienceYears,
        data.expertise,
        data.employmentStatus,
        data.joinDate,
        data.emergencyContactName,
        data.emergencyContactPhone,
        data.address,
        data.notes,
        id,
      ],
    );

    // --------------------------------------
    // 14. SINKRONISASI ROLE CABANG
    // --------------------------------------

    await client.query(
      `
        UPDATE user_branch_roles
        SET is_active = FALSE
        WHERE user_id = $1
          AND role_id = $2
          AND branch_id IS NOT NULL
      `,
      [tutor.userId, tutorRoleId],
    );

    const activeAssignmentsResult = await client.query(
      `
        SELECT DISTINCT branch_id
        FROM tutor_branch_assignments
        WHERE tutor_id = $1
          AND assigned_from <= CURRENT_DATE
          AND (
            assigned_until IS NULL
            OR assigned_until >= CURRENT_DATE
          )
      `,
      [id],
    );

    const shouldActivateRole = data.employmentStatus === "active";

    for (const row of activeAssignmentsResult.rows) {
      await client.query(
        `
          INSERT INTO user_branch_roles (
            user_id,
            role_id,
            branch_id,
            assigned_by,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, role_id, branch_id)
          DO UPDATE SET
            is_active = EXCLUDED.is_active
        `,
        [
          tutor.userId,
          tutorRoleId,
          row.branch_id,
          actorId || null,
          shouldActivateRole,
        ],
      );
    }

    // --------------------------------------
    // 15. CATAT AUDIT PROFIL TUTOR
    // --------------------------------------

    const updatedTutorResult = await client.query(
      `
        ${tutorSelect}
        WHERE tp.id = $1
      `,
      [id],
    );

    await createAuditLog(
      {
        userId: actorId,
        branchId: null,
        action: "TUTOR_UPDATED",
        entityTable: "tutor_profiles",
        entityId: id,
        oldValues: oldTutorValues,
        newValues: updatedTutorResult.rows[0],
        ipAddress,
        userAgent,
      },
      client,
    );

    // --------------------------------------
    // 16. COMMIT
    // --------------------------------------

    await client.query("COMMIT");

    return getTutorById(id);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    if (error.code === "23505") {
      const conflictError = new Error(
        "Email, nomor HP, atau kode tutor sudah digunakan.",
      );

      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// UPDATE TUTOR ACCOUNT STATUS
// NONAKTIFKAN / AKTIFKAN KEMBALI TUTOR
// ==========================================

export async function updateTutorStatus(id, isActive, auditContext) {
  const { actorId, ipAddress, userAgent } = auditContext;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------
    // 1. AMBIL DAN KUNCI DATA TUTOR
    // --------------------------------------

    const tutorResult = await client.query(
      `
        SELECT
          tp.id,
          tp.user_id AS "userId",
          tp.employment_status AS "employmentStatus",
          u.is_active AS "accountIsActive"
        FROM tutor_profiles tp
        INNER JOIN users u ON u.id = tp.user_id
        WHERE tp.id = $1
        FOR UPDATE OF tp, u
      `,
      [id],
    );

    if (tutorResult.rowCount === 0) {
      const error = new Error("Tutor tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    const tutor = tutorResult.rows[0];
    const targetEmploymentStatus = isActive ? "active" : "inactive";

    const accountStatusChanged = tutor.accountIsActive !== isActive;
    const employmentStatusChanged =
      tutor.employmentStatus !== targetEmploymentStatus;

    if (!accountStatusChanged && !employmentStatusChanged) {
      await client.query("COMMIT");
      return getTutorById(id);
    }
    // Snapshot profil sebelum perubahan.
    const oldTutorResult = await client.query(
      `
        ${tutorSelect}
        WHERE tp.id = $1
      `,
      [id],
    );

    const oldTutorValues = oldTutorResult.rows[0];

    // --------------------------------------
    // 2. AMBIL ROLE TUTOR
    // --------------------------------------

    const roleResult = await client.query(
      `
        SELECT id
        FROM roles
        WHERE role_code = 'tutor'
        LIMIT 1
      `,
    );

    if (roleResult.rowCount === 0) {
      const error = new Error("Role Tutor tidak ditemukan.");
      error.statusCode = 500;
      throw error;
    }

    const tutorRoleId = roleResult.rows[0].id;

    // --------------------------------------
    // 3. TENTUKAN STATUS
    // --------------------------------------

    const employmentStatus = isActive ? "active" : "inactive";

    // --------------------------------------
    // 4. UPDATE STATUS PROFIL
    // --------------------------------------

    await client.query(
      `
        UPDATE tutor_profiles
        SET
          employment_status = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [employmentStatus, id],
    );

    // --------------------------------------
    // 5. UPDATE STATUS AKUN LOGIN
    // --------------------------------------

    await client.query(
      `
        UPDATE users
        SET
          is_active = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [isActive, tutor.userId],
    );

    // --------------------------------------
    // 6. NONAKTIFKAN SEMUA ROLE CABANG
    // --------------------------------------

    await client.query(
      `
        UPDATE user_branch_roles
        SET is_active = FALSE
        WHERE user_id = $1
          AND role_id = $2
          AND branch_id IS NOT NULL
      `,
      [tutor.userId, tutorRoleId],
    );

    // --------------------------------------
    // 7. PULIHKAN ROLE CABANG JIKA DIAKTIFKAN
    // --------------------------------------

    if (isActive) {
      const activeAssignmentsResult = await client.query(
        `
          SELECT DISTINCT tba.branch_id
          FROM tutor_branch_assignments tba
          INNER JOIN branches b
            ON b.id = tba.branch_id
          WHERE tba.tutor_id = $1
            AND tba.assigned_from <= CURRENT_DATE
            AND (
              tba.assigned_until IS NULL
              OR tba.assigned_until >= CURRENT_DATE
            )
            AND b.is_active = TRUE
        `,
        [id],
      );

      for (const row of activeAssignmentsResult.rows) {
        await client.query(
          `
            INSERT INTO user_branch_roles (
              user_id,
              role_id,
              branch_id,
              assigned_by,
              is_active
            )
            VALUES ($1, $2, $3, $4, TRUE)
            ON CONFLICT (user_id, role_id, branch_id)
            DO UPDATE SET
              is_active = TRUE
          `,
          [tutor.userId, tutorRoleId, row.branch_id, actorId || null],
        );
      }
    }

    // --------------------------------------
    // 8. CATAT AUDIT LOG
    // --------------------------------------

    const updatedTutorResult = await client.query(
      `
        ${tutorSelect}
        WHERE tp.id = $1
      `,
      [id],
    );

    await createAuditLog(
      {
        userId: actorId,
        branchId: null,
        action: isActive ? "REACTIVATE_TUTOR" : "DEACTIVATE_TUTOR",
        entityTable: "tutor_profiles",
        entityId: id,
        oldValues: oldTutorValues,
        newValues: updatedTutorResult.rows[0],
        ipAddress,
        userAgent,
      },
      client,
    );

    // --------------------------------------
    // 9. COMMIT
    // --------------------------------------

    await client.query("COMMIT");

    return getTutorById(id);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// GET TUTOR BY LOGIN USER ID
// ==========================================

export async function getTutorByUserId(userId) {
  const result = await pool.query(
    `
      SELECT id
      FROM tutor_profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getTutorById(result.rows[0].id);
}
