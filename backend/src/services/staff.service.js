import { pool } from "../config/database.js";
import argon2 from "argon2";
import { createAuditLog } from "./auditLog.service.js";

// ==========================================
// STAFF SELECT QUERY
// ==========================================

const staffSelect = `
  SELECT
    sp.id,
    hpp.id AS "hrPersonProfileId",
    sp.user_id AS "userId",
    sp.staff_code AS "staffCode",

    u.full_name AS "fullName",
    u.email,
    u.phone,
    u.is_active AS "accountIsActive",

    sp.job_title AS "jobTitle",
    sp.employment_status AS "employmentStatus",
    sp.join_date AS "joinDate",
    sp.notes,

    sp.created_at AS "createdAt",
    sp.updated_at AS "updatedAt",

    (
      SELECT sba.branch_id
      FROM staff_branch_assignments sba
      WHERE sba.staff_id = sp.id
        AND sba.assigned_from <= CURRENT_DATE
        AND (
          sba.assigned_until IS NULL
          OR sba.assigned_until >= CURRENT_DATE
        )
      LIMIT 1
    ) AS "currentBranchId",

    (
      SELECT b.branch_name
      FROM staff_branch_assignments sba
      INNER JOIN branches b
        ON b.id = sba.branch_id
      WHERE sba.staff_id = sp.id
        AND sba.assigned_from <= CURRENT_DATE
        AND (
          sba.assigned_until IS NULL
          OR sba.assigned_until >= CURRENT_DATE
        )
      LIMIT 1
    ) AS "currentBranchName"

  FROM staff_profiles sp

  INNER JOIN users u
    ON u.id = sp.user_id

  LEFT JOIN hr_person_profiles hpp
    ON hpp.user_id = sp.user_id
    AND hpp.profile_type = 'staff'
    AND hpp.profile_id = sp.id
`;

// ==========================================
// AUDIT LOG HELPER
// ==========================================

async function writeStaffAssignmentAudit(
  client,
  {
    actorId,
    auditContext = {},
    branchId,
    action,
    assignmentId,
    oldValues = null,
    newValues = null,
  },
) {
  await createAuditLog(
    {
      userId: auditContext.actorId || actorId || null,
      branchId: branchId || null,
      action,
      entityTable: "staff_branch_assignments",
      entityId: assignmentId,
      oldValues,
      newValues,
      ipAddress: auditContext.ipAddress || null,
      userAgent: auditContext.userAgent || null,
    },
    client,
  );
}

// ==========================================
// ASSIGNMENT SNAPSHOT
// ==========================================

function assignmentSnapshot(assignment) {
  if (!assignment) return null;

  return {
    id: assignment.id,
    branchId: assignment.branchId,
    assignedFrom: assignment.assignedFrom,
    assignedUntil: assignment.assignedUntil,
    reason: assignment.reason,
  };
}

// ==========================================
// GET ALL STAFF
// ==========================================

export async function getAllStaff({
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
        OR sp.staff_code ILIKE $${index}
        OR sp.job_title ILIKE $${index}
      )
    `);

    values.push(`%${search}%`);
    index++;
  }

  if (employmentStatus) {
    conditions.push(`sp.employment_status = $${index}`);

    values.push(employmentStatus);
    index++;
  }

  if (branchId) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM staff_branch_assignments sba
        WHERE sba.staff_id = sp.id
          AND sba.branch_id = $${index}
          AND sba.assigned_from <= CURRENT_DATE
          AND (
            sba.assigned_until IS NULL
            OR sba.assigned_until >= CURRENT_DATE
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
      FROM staff_profiles sp
      INNER JOIN users u
        ON u.id = sp.user_id
      ${whereClause}
    `,
    values,
  );

  const dataResult = await pool.query(
    `
      ${staffSelect}
      ${whereClause}
      ORDER BY sp.created_at DESC
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
// GET STAFF BY ID
// ==========================================

export async function getStaffById(id) {
  const result = await pool.query(
    `
      SELECT
        staff.*,

        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', sba.id,
                'branchId', b.id,
                'branchCode', b.branch_code,
                'branchName', b.branch_name,
                'assignedFrom', sba.assigned_from,
                'assignedUntil', sba.assigned_until,
                'reason', sba.reason,
                'isActive',
                  (
                    sba.assigned_from <= CURRENT_DATE
                    AND (
                      sba.assigned_until IS NULL
                      OR sba.assigned_until >= CURRENT_DATE
                    )
                  )
              )
              ORDER BY sba.assigned_from DESC
            )
            FROM staff_branch_assignments sba
            INNER JOIN branches b
              ON b.id = sba.branch_id
            WHERE sba.staff_id = staff.id
          ),
          '[]'::jsonb
        ) AS "branchAssignments"

      FROM (
        ${staffSelect}
      ) staff

      WHERE staff.id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
}

// ==========================================
// CREATE STAFF
// AKUN + PROFIL + ROLE + CABANG
// ==========================================

export async function createStaff(data, auditContext = {}) {
  const { actorId, ipAddress, userAgent } = auditContext;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. VALIDASI ROLE STAFF

    const roleResult = await client.query(
      `
        SELECT id
        FROM roles
        WHERE role_code = 'staff'
        LIMIT 1
      `,
    );

    if (roleResult.rowCount === 0) {
      const error = new Error("Role Staff tidak ditemukan.");
      error.statusCode = 500;
      throw error;
    }

    const staffRoleId = roleResult.rows[0].id;

    // 2. VALIDASI CABANG

    const branchResult = await client.query(
      `
        SELECT id
        FROM branches
        WHERE id = $1
          AND is_active = TRUE
        FOR SHARE
      `,
      [data.branchId],
    );

    if (branchResult.rowCount === 0) {
      const error = new Error("Cabang tidak ditemukan atau sudah tidak aktif.");

      error.statusCode = 400;
      throw error;
    }

    // 3. VALIDASI TANGGAL PENUGASAN

    const dateResult = await client.query(`
      SELECT CURRENT_DATE::text AS today
    `);

    const today = dateResult.rows[0].today;
    const assignedFrom = data.assignedFrom || today;

    if (assignedFrom > today) {
      const error = new Error(
        "Tanggal penugasan awal tidak boleh di masa depan.",
      );

      error.statusCode = 400;
      throw error;
    }

    // 4. HASH PASSWORD

    const passwordHash = await argon2.hash(data.password);

    const isEmploymentActive = data.employmentStatus === "active";

    // 5. BUAT USER ACCOUNT

    const userResult = await client.query(
      `
        INSERT INTO users (
          full_name,
          email,
          phone,
          password_hash,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [data.fullName, data.email, data.phone, passwordHash, isEmploymentActive],
    );

    const userId = userResult.rows[0].id;

    // 6. BUAT STAFF PROFILE

    const profileResult = await client.query(
      `
        INSERT INTO staff_profiles (
          user_id,
          staff_code,
          job_title,
          employment_status,
          join_date,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        userId,
        data.staffCode,
        data.jobTitle,
        data.employmentStatus,
        data.joinDate,
        data.notes,
      ],
    );

    const staffId = profileResult.rows[0].id;

    // 7. BUAT PENUGASAN CABANG AWAL

    const assignmentResult = await client.query(
      `
        INSERT INTO staff_branch_assignments (
          staff_id,
          branch_id,
          assigned_from,
          assigned_until,
          assigned_by
        )
        VALUES ($1, $2, $3, NULL, $4)
        RETURNING
          id,
          branch_id AS "branchId",
          assigned_from::text AS "assignedFrom",
          assigned_until::text AS "assignedUntil",
          reason
      `,
      [staffId, data.branchId, assignedFrom, actorId || null],
    );

    const assignment = assignmentResult.rows[0];

    // 8. BUAT ROLE CABANG

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
      [userId, staffRoleId, data.branchId, actorId || null, isEmploymentActive],
    );

    // 9. AUDIT LOG PENUGASAN

    await writeStaffAssignmentAudit(client, {
      actorId,
      auditContext,
      branchId: data.branchId,
      action: "CREATE_STAFF_ASSIGNMENT",
      assignmentId: assignment.id,
      newValues: assignmentSnapshot(assignment),
    });

    // 10. AUDIT LOG PROFIL STAFF

    const staffSnapshotResult = await client.query(
      `
        ${staffSelect}
        WHERE sp.id = $1
      `,
      [staffId],
    );

    await createAuditLog(
      {
        userId: actorId || null,
        branchId: null,
        action: "STAFF_CREATED",
        entityTable: "staff_profiles",
        entityId: staffId,
        oldValues: null,
        newValues: staffSnapshotResult.rows[0],
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
      client,
    );

    // 11. COMMIT

    await client.query("COMMIT");

    return getStaffById(staffId);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    if (error.code === "23505") {
      const conflictError = new Error(
        "Email, nomor HP, atau kode staff sudah digunakan.",
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
// UPDATE STAFF
// UPDATE PROFIL + AKUN
// ==========================================

export async function updateStaff(id, data, auditContext = {}) {
  const { actorId, ipAddress, userAgent } = auditContext;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. CARI DAN KUNCI STAFF

    const staffResult = await client.query(
      `
        SELECT
          sp.id,
          sp.user_id AS "userId",
          sp.employment_status AS "employmentStatus",
          u.is_active AS "accountIsActive"
        FROM staff_profiles sp
        INNER JOIN users u
          ON u.id = sp.user_id
        WHERE sp.id = $1
        FOR UPDATE OF sp, u
      `,
      [id],
    );

    if (staffResult.rowCount === 0) {
      const error = new Error("Staff tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    const staff = staffResult.rows[0];

    // 2. AMBIL SNAPSHOT LAMA

    const oldSnapshotResult = await client.query(
      `
        ${staffSelect}
        WHERE sp.id = $1
      `,
      [id],
    );

    const oldSnapshot = oldSnapshotResult.rows[0];

    // 3. AMBIL ROLE STAFF

    const roleResult = await client.query(
      `
        SELECT id
        FROM roles
        WHERE role_code = 'staff'
        LIMIT 1
      `,
    );

    if (roleResult.rowCount === 0) {
      const error = new Error("Role Staff tidak ditemukan.");
      error.statusCode = 500;
      throw error;
    }

    const staffRoleId = roleResult.rows[0].id;

    const isEmploymentActive = data.employmentStatus === "active";

    // 4. VALIDASI PENUGASAN CABANG JIKA STATUS AKTIF

    let assignmentResult = null;

    if (isEmploymentActive) {
      assignmentResult = await client.query(
        `
          SELECT sba.branch_id
          FROM staff_branch_assignments sba
          INNER JOIN branches b
            ON b.id = sba.branch_id
          WHERE sba.staff_id = $1
            AND sba.assigned_from <= CURRENT_DATE
            AND (
              sba.assigned_until IS NULL
              OR sba.assigned_until >= CURRENT_DATE
            )
            AND b.is_active = TRUE
          LIMIT 1
          FOR SHARE OF sba, b
        `,
        [id],
      );

      if (assignmentResult.rowCount === 0) {
        const error = new Error(
          "Staff tidak dapat diaktifkan karena tidak memiliki penugasan pada cabang yang aktif.",
        );

        error.statusCode = 400;
        throw error;
      }
    }

    // 5. UPDATE AKUN USER

    await client.query(
      `
        UPDATE users
        SET
          full_name = $1,
          email = $2,
          phone = $3,
          is_active = $4,
          updated_at = NOW()
        WHERE id = $5
      `,
      [data.fullName, data.email, data.phone, isEmploymentActive, staff.userId],
    );

    // 6. UPDATE STAFF PROFILE

    await client.query(
      `
        UPDATE staff_profiles
        SET
          staff_code = $1,
          job_title = $2,
          employment_status = $3,
          join_date = $4,
          notes = $5,
          updated_at = NOW()
        WHERE id = $6
      `,
      [
        data.staffCode,
        data.jobTitle,
        data.employmentStatus,
        data.joinDate,
        data.notes,
        id,
      ],
    );

    // 7. NONAKTIFKAN ROLE CABANG STAFF

    await client.query(
      `
        UPDATE user_branch_roles
        SET is_active = FALSE
        WHERE user_id = $1
          AND role_id = $2
          AND branch_id IS NOT NULL
      `,
      [staff.userId, staffRoleId],
    );

    // 8. PULIHKAN ROLE PADA CABANG AKTIF

    if (assignmentResult) {
      const branchId = assignmentResult.rows[0].branch_id;

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
          staff.userId,
          staffRoleId,
          branchId,
          actorId || null,
          isEmploymentActive,
        ],
      );
    }

    // 9. AMBIL SNAPSHOT BARU

    const newSnapshotResult = await client.query(
      `
        ${staffSelect}
        WHERE sp.id = $1
      `,
      [id],
    );

    const newSnapshot = newSnapshotResult.rows[0];

    // 10. AUDIT LOG PERUBAHAN PROFIL

    await createAuditLog(
      {
        userId: actorId || null,
        branchId: null,
        action: "UPDATE_STAFF",
        entityTable: "staff_profiles",
        entityId: id,
        oldValues: oldSnapshot,
        newValues: newSnapshot,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
      client,
    );

    // 11. COMMIT

    await client.query("COMMIT");

    return getStaffById(id);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    if (error.code === "23505") {
      const conflictError = new Error(
        "Email, nomor HP, atau kode staff sudah digunakan.",
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
// TRANSFER STAFF
// PINDAH CABANG + SIMPAN RIWAYAT
// ==========================================

export async function transferStaff(id, data, auditContext = {}) {
  const { actorId } = auditContext;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. KUNCI STAFF

    const staffResult = await client.query(
      `
        SELECT
          sp.id,
          sp.user_id AS "userId",
          sp.employment_status AS "employmentStatus"
        FROM staff_profiles sp
        WHERE sp.id = $1
        FOR UPDATE
      `,
      [id],
    );

    if (staffResult.rowCount === 0) {
      const error = new Error("Staff tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    const staff = staffResult.rows[0];

    if (staff.employmentStatus !== "active") {
      const error = new Error(
        "Hanya staff dengan status aktif yang dapat dipindahkan.",
      );

      error.statusCode = 400;
      throw error;
    }

    // 2. AMBIL TANGGAL DATABASE

    const dateResult = await client.query(`
      SELECT CURRENT_DATE::text AS today
    `);

    const today = dateResult.rows[0].today;
    const assignedFrom = data.assignedFrom || today;

    if (assignedFrom !== today) {
      const error = new Error(
        "Tanggal efektif transfer harus sama dengan tanggal hari ini.",
      );

      error.statusCode = 400;
      throw error;
    }

    // 3. VALIDASI CABANG TUJUAN

    const branchResult = await client.query(
      `
        SELECT id
        FROM branches
        WHERE id = $1
          AND is_active = TRUE
        FOR SHARE
      `,
      [data.branchId],
    );

    if (branchResult.rowCount === 0) {
      const error = new Error(
        "Cabang tujuan tidak ditemukan atau sudah tidak aktif.",
      );

      error.statusCode = 400;
      throw error;
    }

    // 4. AMBIL ROLE STAFF

    const roleResult = await client.query(
      `
        SELECT id
        FROM roles
        WHERE role_code = 'staff'
        LIMIT 1
      `,
    );

    if (roleResult.rowCount === 0) {
      const error = new Error("Role Staff tidak ditemukan.");
      error.statusCode = 500;
      throw error;
    }

    const staffRoleId = roleResult.rows[0].id;

    // 5. KUNCI PENUGASAN SAAT INI

    const assignmentResult = await client.query(
      `
        SELECT
          id,
          branch_id AS "branchId",
          assigned_from::text AS "assignedFrom",
          assigned_until::text AS "assignedUntil",
          reason
        FROM staff_branch_assignments
        WHERE staff_id = $1
          AND assigned_from <= CURRENT_DATE
          AND (
            assigned_until IS NULL
            OR assigned_until >= CURRENT_DATE
          )
        FOR UPDATE
      `,
      [id],
    );

    if (assignmentResult.rowCount !== 1) {
      const error = new Error(
        "Penugasan cabang aktif staff tidak ditemukan atau tidak valid.",
      );

      error.statusCode = 409;
      throw error;
    }

    const currentAssignment = assignmentResult.rows[0];

    if (currentAssignment.branchId === data.branchId) {
      const error = new Error("Staff sudah ditugaskan pada cabang tersebut.");

      error.statusCode = 400;
      throw error;
    }

    // 6. TUTUP PENUGASAN LAMA

    if (currentAssignment.assignedFrom === today) {
      await client.query(
        `
          DELETE FROM staff_branch_assignments
          WHERE id = $1
        `,
        [currentAssignment.id],
      );

      await writeStaffAssignmentAudit(client, {
        actorId,
        auditContext,
        branchId: currentAssignment.branchId,
        action: "CANCEL_STAFF_ASSIGNMENT",
        assignmentId: currentAssignment.id,
        oldValues: assignmentSnapshot(currentAssignment),
      });
    } else {
      const yesterdayDate = new Date(`${today}T00:00:00.000Z`);

      yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);

      const yesterday = yesterdayDate.toISOString().slice(0, 10);

      const oldSnapshot = assignmentSnapshot(currentAssignment);

      const newSnapshot = {
        ...oldSnapshot,
        assignedUntil: yesterday,
      };

      await client.query(
        `
          UPDATE staff_branch_assignments
          SET assigned_until = $1
          WHERE id = $2
        `,
        [yesterday, currentAssignment.id],
      );

      await writeStaffAssignmentAudit(client, {
        actorId,
        auditContext,
        branchId: currentAssignment.branchId,
        action: "TRANSFER_STAFF_FROM_BRANCH",
        assignmentId: currentAssignment.id,
        oldValues: oldSnapshot,
        newValues: newSnapshot,
      });
    }

    // 7. BUAT PENUGASAN BARU

    const newAssignmentResult = await client.query(
      `
        INSERT INTO staff_branch_assignments (
          staff_id,
          branch_id,
          assigned_from,
          assigned_until,
          reason,
          assigned_by
        )
        VALUES ($1, $2, $3, NULL, $4, $5)
        RETURNING
          id,
          branch_id AS "branchId",
          assigned_from::text AS "assignedFrom",
          assigned_until::text AS "assignedUntil",
          reason
      `,
      [id, data.branchId, today, data.reason, actorId || null],
    );

    const newAssignment = newAssignmentResult.rows[0];

    await writeStaffAssignmentAudit(client, {
      actorId,
      auditContext,
      branchId: data.branchId,
      action: "TRANSFER_STAFF_TO_BRANCH",
      assignmentId: newAssignment.id,
      newValues: assignmentSnapshot(newAssignment),
    });

    // 8. NONAKTIFKAN ROLE CABANG LAMA

    await client.query(
      `
        UPDATE user_branch_roles
        SET is_active = FALSE
        WHERE user_id = $1
          AND role_id = $2
          AND branch_id IS NOT NULL
      `,
      [staff.userId, staffRoleId],
    );

    // 9. AKTIFKAN ROLE PADA CABANG BARU

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
      [staff.userId, staffRoleId, data.branchId, actorId || null],
    );

    // 10. COMMIT

    await client.query("COMMIT");

    return getStaffById(id);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    if (error.code === "23505") {
      const conflictError = new Error("Penugasan aktif staff sudah tersedia.");

      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// UPDATE STAFF ACCOUNT STATUS
// AKTIFKAN / NONAKTIFKAN STAFF
// ==========================================

export async function updateStaffStatus(id, isActive, auditContext = {}) {
  const { actorId, ipAddress, userAgent } = auditContext;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. KUNCI STAFF DAN USER

    const staffResult = await client.query(
      `
        SELECT
          sp.id,
          sp.user_id AS "userId",
          sp.employment_status AS "employmentStatus",
          u.is_active AS "accountIsActive"
        FROM staff_profiles sp
        INNER JOIN users u
          ON u.id = sp.user_id
        WHERE sp.id = $1
        FOR UPDATE OF sp, u
      `,
      [id],
    );

    if (staffResult.rowCount === 0) {
      const error = new Error("Staff tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    const staff = staffResult.rows[0];

    // 2. AMBIL SNAPSHOT LAMA

    const oldSnapshotResult = await client.query(
      `
        ${staffSelect}
        WHERE sp.id = $1
      `,
      [id],
    );

    const oldSnapshot = oldSnapshotResult.rows[0];

    // 3. VALIDASI STATUS PEKERJAAN

    if (!["active", "inactive"].includes(staff.employmentStatus)) {
      const error = new Error(
        "Status Staff resigned atau on_leave harus diubah melalui pengeditan profil.",
      );

      error.statusCode = 400;
      throw error;
    }

    // 4. AMBIL ROLE STAFF

    const roleResult = await client.query(
      `
        SELECT id
        FROM roles
        WHERE role_code = 'staff'
        LIMIT 1
      `,
    );

    if (roleResult.rowCount === 0) {
      const error = new Error("Role Staff tidak ditemukan.");
      error.statusCode = 500;
      throw error;
    }

    const staffRoleId = roleResult.rows[0].id;

    const employmentStatus = isActive ? "active" : "inactive";

    // 5. VALIDASI PENUGASAN CABANG JIKA AKAN DIAKTIFKAN

    let assignmentResult = null;

    if (isActive) {
      assignmentResult = await client.query(
        `
          SELECT sba.branch_id
          FROM staff_branch_assignments sba
          INNER JOIN branches b
            ON b.id = sba.branch_id
          WHERE sba.staff_id = $1
            AND sba.assigned_from <= CURRENT_DATE
            AND (
              sba.assigned_until IS NULL
              OR sba.assigned_until >= CURRENT_DATE
            )
            AND b.is_active = TRUE
          LIMIT 1
          FOR SHARE OF sba, b
        `,
        [id],
      );

      if (assignmentResult.rowCount === 0) {
        const error = new Error(
          "Staff tidak dapat diaktifkan karena tidak memiliki penugasan pada cabang yang aktif.",
        );

        error.statusCode = 400;
        throw error;
      }
    }

    // 6. UPDATE STATUS PROFIL

    await client.query(
      `
        UPDATE staff_profiles
        SET
          employment_status = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [employmentStatus, id],
    );

    // 7. UPDATE STATUS AKUN

    await client.query(
      `
        UPDATE users
        SET
          is_active = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [isActive, staff.userId],
    );

    // 8. NONAKTIFKAN SEMUA ROLE CABANG

    await client.query(
      `
        UPDATE user_branch_roles
        SET is_active = FALSE
        WHERE user_id = $1
          AND role_id = $2
          AND branch_id IS NOT NULL
      `,
      [staff.userId, staffRoleId],
    );

    // 9. AKTIFKAN ROLE PADA CABANG SAAT INI

    if (isActive) {
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
        [
          staff.userId,
          staffRoleId,
          assignmentResult.rows[0].branch_id,
          actorId || null,
        ],
      );
    }

    // 10. AMBIL SNAPSHOT BARU

    const newSnapshotResult = await client.query(
      `
        ${staffSelect}
        WHERE sp.id = $1
      `,
      [id],
    );

    const newSnapshot = newSnapshotResult.rows[0];

    // 11. AUDIT LOG STATUS

    await createAuditLog(
      {
        userId: actorId || null,
        branchId: null,
        action: isActive ? "REACTIVATE_STAFF" : "DEACTIVATE_STAFF",
        entityTable: "staff_profiles",
        entityId: id,
        oldValues: oldSnapshot,
        newValues: newSnapshot,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
      client,
    );

    // 12. COMMIT

    await client.query("COMMIT");

    return getStaffById(id);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
