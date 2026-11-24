import { pool } from "../config/database.js";
import { createAuditLog } from "./auditLog.service.js";
import { insertStudentWithClient } from "./student.service.js";
import { randomBytes } from "node:crypto";

// ==========================================
// ACCESS CONTROL
// ==========================================

function validateAccess(access = {}) {
  if (access.isSuperAdmin === true) {
    return {
      isSuperAdmin: true,
      branchIds: [],
      scopeBranchIds: [],
      activeBranchId: null,
    };
  }

  const branchIds = [
    ...new Set(
      (Array.isArray(access.branchIds) ? access.branchIds : []).filter(
        (id) => typeof id === "string" && id.trim() !== "",
      ),
    ),
  ];

  if (branchIds.length === 0) {
    const error = new Error(
      "Anda tidak memiliki cakupan cabang untuk mengakses data pengajuan.",
    );
    error.statusCode = 403;
    throw error;
  }

  const activeBranchId = access.activeBranchId ?? null;

  if (!activeBranchId) {
    const error = new Error("Silakan pilih cabang aktif terlebih dahulu.");
    error.statusCode = 400;
    throw error;
  }

  if (!branchIds.includes(activeBranchId)) {
    const error = new Error("Cabang aktif tidak termasuk penugasan Anda.");
    error.statusCode = 403;
    throw error;
  }

  return {
    isSuperAdmin: false,
    branchIds,
    activeBranchId,
    scopeBranchIds: [activeBranchId],
  };
}

// ==========================================
// GET PARENT DASHBOARD BY USER ID
// ==========================================

export async function getParentDashboardByUserId(userId) {
  const result = await pool.query(
    `
      SELECT
        u.id AS "userId",
        u.full_name AS "fullName",

        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', s.id,
              'studentCode', s.student_code,
              'fullName', s.full_name,
              'status', s.status,
              'relationshipLabel', sp.relationship_label,
              'isPrimaryContact', sp.is_primary_contact,
              'canViewProgress', sp.can_view_progress,
              'canReceiveNotifications', sp.can_receive_notifications
            )
            ORDER BY s.full_name
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'::jsonb
        ) AS children

      FROM users u

      LEFT JOIN student_parents sp
        ON sp.user_id = u.id

      LEFT JOIN students s
        ON s.id = sp.student_id
        AND s.deleted_at IS NULL

      WHERE u.id = $1

      GROUP BY
        u.id,
        u.full_name

      LIMIT 1
    `,
    [userId],
  );

  if (result.rowCount === 0) {
    return null;
  }

  const parent = result.rows[0];

  return {
    userId: parent.userId,
    fullName: parent.fullName,
    children: parent.children,
    statistics: {
      totalChildren: parent.children.length,
      activePrograms: null,
      upcomingSchedules: null,
      unpaidInvoices: null,
    },
  };
}

// ==========================================
// GET PARENT STUDENT CLAIM HISTORY
// ==========================================

export async function getParentStudentClaimsByUserId(userId) {
  const result = await pool.query(
    `
      SELECT
        psc.id,
        psc.claim_code AS "claimCode",
        psc.student_name AS "studentName",
        psc.birth_date AS "birthDate",
        psc.requested_student_id AS "requestedStudentId",
        psc.student_id AS "studentId",
        psc.whatsapp_number AS "whatsappNumber",
        psc.relationship_label AS "relationshipLabel",
        psc.status,
        psc.review_notes AS "reviewNotes",
        psc.created_at AS "createdAt",
        psc.reviewed_at AS "reviewedAt",
        b.branch_name AS "branchName",
        s.full_name AS "approvedStudentName",
        s.student_code AS "studentCode"

      FROM parent_student_claims psc

      LEFT JOIN branches b
        ON b.id = psc.branch_id

      LEFT JOIN students s
        ON s.id = psc.student_id
        AND s.deleted_at IS NULL

      WHERE psc.user_id = $1

      ORDER BY psc.created_at DESC
    `,
    [userId],
  );

  return result.rows;
}

// ==========================================
// GET ALL PARENT STUDENT CLAIMS FOR ADMIN
// ==========================================

export async function getAllParentStudentClaims(rawAccess = {}) {
  const access = validateAccess(rawAccess);

  const values = [];
  let whereClause = "";

  if (!access.isSuperAdmin) {
    values.push(access.activeBranchId);
    whereClause = "WHERE psc.branch_id = $1";
  }

  const result = await pool.query(
    `
      SELECT
        psc.id,
        psc.claim_code AS "claimCode",
        psc.student_name AS "studentName",
        psc.birth_date AS "birthDate",
        psc.requested_student_id AS "requestedStudentId",
        psc.student_id AS "studentId",
        psc.whatsapp_number AS "whatsappNumber",
        psc.relationship_label AS "relationshipLabel",
        psc.status,
        psc.review_notes AS "reviewNotes",
        psc.created_at AS "createdAt",
        psc.reviewed_at AS "reviewedAt",

        u.full_name AS "parentName",
        u.phone AS "parentPhone",
        psc.whatsapp_number AS "parentWhatsapp",
        u.email AS "parentEmail",

        b.branch_name AS "branchName",

        requested_s.full_name AS "existingStudentName",

        approved_s.full_name AS "approvedStudentName",
        approved_s.student_code AS "studentCode"

      FROM parent_student_claims psc

      INNER JOIN users u
        ON u.id = psc.user_id

      LEFT JOIN branches b
        ON b.id = psc.branch_id

      LEFT JOIN students requested_s
        ON requested_s.id = psc.requested_student_id
        AND requested_s.deleted_at IS NULL

      LEFT JOIN students approved_s
        ON approved_s.id = psc.student_id
        AND approved_s.deleted_at IS NULL

      ${whereClause}

      ORDER BY
        CASE WHEN psc.status = 'pending' THEN 0 ELSE 1 END,
        psc.created_at DESC
    `,
    values,
  );

  return result.rows;
}

// ==========================================
// SEARCH STUDENTS FOR PARENT CLAIM
// ==========================================

export async function searchStudentsForParent({ branchId, search = "" } = {}) {
  const keyword = search.trim();

  if (!branchId) {
    const error = new Error("Unit wajib dipilih.");
    error.statusCode = 400;
    throw error;
  }

  if (keyword.length < 2) {
    return [];
  }

  const branchResult = await pool.query(
    `
      SELECT id
      FROM branches
      WHERE id = $1
        AND is_active = TRUE
      LIMIT 1
    `,
    [branchId],
  );

  if (branchResult.rowCount === 0) {
    const error = new Error("Unit tidak ditemukan atau tidak aktif.");
    error.statusCode = 404;
    throw error;
  }

  const result = await pool.query(
    `
      SELECT
        s.id,
        s.full_name AS "fullName"
      FROM students s
      WHERE s.deleted_at IS NULL
        AND s.primary_branch_id = $1
        AND s.full_name ILIKE $2
      ORDER BY LOWER(s.full_name) ASC
      LIMIT 10
    `,
    [branchId, `%${keyword}%`],
  );

  return result.rows;
}

// ==========================================
// CREATE PARENT STUDENT CLAIM
// ==========================================

export async function createParentStudentClaim(userId, data) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Kunci akun User.
    const userResult = await client.query(
      `
        SELECT
          id,
          full_name,
          is_active
        FROM users
        WHERE id = $1
        FOR UPDATE
      `,
      [userId],
    );

    if (userResult.rowCount === 0 || !userResult.rows[0].is_active) {
      const error = new Error(
        "Akun pengguna tidak ditemukan atau tidak aktif.",
      );
      error.statusCode = 404;
      throw error;
    }

    // 2. Pastikan akun memiliki role Parent aktif.
    const roleResult = await client.query(
      `
        SELECT ubr.id
        FROM user_branch_roles ubr
        INNER JOIN roles r
          ON r.id = ubr.role_id
        WHERE ubr.user_id = $1
          AND ubr.is_active = TRUE
          AND ubr.branch_id IS NULL
          AND r.role_code = 'parent'
        LIMIT 1
        FOR UPDATE OF ubr
      `,
      [userId],
    );

    if (roleResult.rowCount === 0) {
      const error = new Error("Akun belum memiliki role Parent yang aktif.");
      error.statusCode = 403;
      throw error;
    }

    // 3. Pastikan unit aktif.
    const branchResult = await client.query(
      `
        SELECT id
        FROM branches
        WHERE id = $1
          AND is_active = TRUE
        LIMIT 1
      `,
      [data.branchId],
    );

    if (branchResult.rowCount === 0) {
      const error = new Error("Unit tidak ditemukan atau tidak aktif.");
      error.statusCode = 404;
      throw error;
    }

    // 4. Normalisasi nomor WhatsApp.
    const whatsappNumber = data.whatsappNumber.replace(/[^\d+]/g, "");

    if (whatsappNumber.length < 8) {
      const error = new Error("Nomor WhatsApp tidak valid.");
      error.statusCode = 400;
      throw error;
    }

    // 5. Tentukan jenis pengajuan.
    const isExistingStudent = Boolean(data.requestedStudentId);

    let studentName = null;
    let birthDate = null;
    let requestedStudentId = null;

    if (isExistingStudent) {
      const studentResult = await client.query(
        `
          SELECT
            id,
            full_name
          FROM students
          WHERE id = $1
            AND primary_branch_id = $2
            AND deleted_at IS NULL
          FOR UPDATE
        `,
        [data.requestedStudentId, data.branchId],
      );

      if (studentResult.rowCount === 0) {
        const error = new Error(
          "Siswa tidak ditemukan pada unit yang dipilih.",
        );
        error.statusCode = 404;
        throw error;
      }

      requestedStudentId = studentResult.rows[0].id;
      studentName = studentResult.rows[0].full_name;
    } else {
      studentName = data.studentName.trim();
      birthDate = data.birthDate;
    }

    // 6. Buat kode pengajuan.
    const claimCode = `ILY-${randomBytes(4).toString("hex").toUpperCase()}`;

    // 7. Simpan pengajuan menggunakan user_id.
    // parent_id sengaja NULL untuk kompatibilitas skema lama.
    const claimResult = await client.query(
      `
        INSERT INTO parent_student_claims (
          user_id,
          parent_id,
          student_id,
          requested_student_id,
          branch_id,
          claim_code,
          student_name,
          birth_date,
          whatsapp_number,
          relationship_label,
          status
        )
        VALUES (
          $1,
          NULL,
          NULL,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          'pending'
        )
        RETURNING
          id,
          claim_code AS "claimCode",
          requested_student_id AS "requestedStudentId",
          student_name AS "studentName",
          birth_date AS "birthDate",
          whatsapp_number AS "whatsappNumber",
          relationship_label AS "relationshipLabel",
          status,
          created_at AS "createdAt"
      `,
      [
        userId,
        requestedStudentId,
        data.branchId,
        claimCode,
        studentName,
        birthDate,
        whatsappNumber,
        data.relationshipLabel || null,
      ],
    );

    await client.query("COMMIT");

    return claimResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    if (error.code === "23505") {
      const conflictError = new Error(
        "Pengajuan dengan data tersebut sudah terdaftar dan masih menunggu pemeriksaan admin.",
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
// APPROVE PARENT STUDENT CLAIM
// ==========================================

export async function approveParentStudentClaim(claimId, rawAccess = {}) {
  const access = validateAccess(rawAccess);

  const assignedBy = rawAccess?.assignedBy;
  const ipAddress = rawAccess?.ipAddress ?? null;
  const userAgent = rawAccess?.userAgent ?? null;

  if (!assignedBy) {
    const error = new Error("Identitas admin tidak ditemukan.");
    error.statusCode = 401;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Ambil dan kunci klaim.
    const claimResult = await client.query(
      `
        SELECT
          id,
          user_id,
          parent_id,
          student_id,
          requested_student_id,
          branch_id,
          student_name,
          birth_date,
          relationship_label,
          status
        FROM parent_student_claims
        WHERE id = $1
        FOR UPDATE
      `,
      [claimId],
    );

    if (claimResult.rowCount === 0) {
      const error = new Error("Pengajuan siswa tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    const claim = claimResult.rows[0];

    if (claim.status !== "pending") {
      const error = new Error("Pengajuan ini sudah diproses sebelumnya.");
      error.statusCode = 409;
      throw error;
    }

    if (!claim.user_id) {
      const error = new Error("Akun pengaju tidak ditemukan pada klaim.");
      error.statusCode = 409;
      throw error;
    }

    if (!claim.branch_id) {
      const error = new Error("Cabang pengajuan tidak valid.");
      error.statusCode = 400;
      throw error;
    }

    // 2. Validasi cakupan cabang.
    if (!access.isSuperAdmin && claim.branch_id !== access.activeBranchId) {
      const error = new Error("Pengajuan berada di luar cabang aktif Anda.");
      error.statusCode = 403;
      throw error;
    }

    const branchResult = await client.query(
      `
        SELECT id
        FROM branches
        WHERE id = $1
        LIMIT 1
      `,
      [claim.branch_id],
    );

    if (branchResult.rowCount === 0) {
      const error = new Error("Cabang pengajuan tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    // 3. Pastikan akun pengaju masih tersedia.
    const userResult = await client.query(
      `
        SELECT id
        FROM users
        WHERE id = $1
        FOR UPDATE
      `,
      [claim.user_id],
    );

    if (userResult.rowCount === 0) {
      const error = new Error("Akun pengaju tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    // 4. Tentukan siswa.
    let student;

    if (claim.requested_student_id) {
      const studentResult = await client.query(
        `
          SELECT
            id,
            student_code AS "studentCode",
            full_name AS "fullName",
            primary_branch_id AS "primaryBranchId"
          FROM students
          WHERE id = $1
            AND primary_branch_id = $2
            AND deleted_at IS NULL
          FOR UPDATE
        `,
        [claim.requested_student_id, claim.branch_id],
      );

      if (studentResult.rowCount === 0) {
        const error = new Error(
          "Siswa tidak ditemukan atau sudah tidak tersedia pada cabang pengajuan.",
        );
        error.statusCode = 404;
        throw error;
      }

      student = studentResult.rows[0];
    } else {
      if (!claim.student_name) {
        const error = new Error("Nama siswa pada pengajuan kosong.");
        error.statusCode = 400;
        throw error;
      }

      student = await insertStudentWithClient(
        client,
        {
          primaryBranchId: claim.branch_id,
          fullName: claim.student_name,
          birthDate: claim.birth_date,
          status: "active",
        },
        {
          userId: assignedBy,
          ipAddress,
          userAgent,
        },
      );
    }

    // 5. Hubungkan siswa langsung dengan akun User.
    // parent_id tidak lagi menjadi identitas relasi.
    await client.query(
      `
        INSERT INTO student_parents (
          student_id,
          user_id,
          parent_id,
          relationship_label
        )
        VALUES ($1, $2, NULL, $3)

        ON CONFLICT (student_id, user_id)
        DO NOTHING
      `,
      [student.id, claim.user_id, claim.relationship_label],
    );

    // 6. Update status klaim.
    const updatedClaimResult = await client.query(
      `
        UPDATE parent_student_claims
        SET
          student_id = $2,
          status = 'approved',
          reviewed_by = $3,
          reviewed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
          AND status = 'pending'
        RETURNING
          id,
          user_id AS "userId",
          parent_id AS "parentId",
          student_id AS "studentId",
          requested_student_id AS "requestedStudentId",
          branch_id AS "branchId",
          status,
          reviewed_by AS "reviewedBy",
          reviewed_at AS "reviewedAt"
      `,
      [claimId, student.id, assignedBy],
    );

    if (updatedClaimResult.rowCount === 0) {
      const error = new Error(
        "Status pengajuan berubah. Silakan periksa kembali.",
      );
      error.statusCode = 409;
      throw error;
    }

    const updatedClaim = updatedClaimResult.rows[0];

    // 7. Audit log.
    await createAuditLog(
      {
        userId: assignedBy,
        branchId: claim.branch_id,
        action: "UPDATE",
        entityTable: "parent_student_claims",
        entityId: claimId,
        oldValues: {
          status: "pending",
          studentId: null,
        },
        newValues: {
          status: "approved",
          studentId: student.id,
          userId: claim.user_id,
          branchId: claim.branch_id,
        },
        ipAddress,
        userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return {
      claim: updatedClaim,
      student,
      message: "Pengajuan siswa berhasil disetujui.",
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// REJECT PARENT STUDENT CLAIM
// ==========================================

export async function rejectParentStudentClaim(
  claimId,
  reviewNotes,
  rawAccess = {},
) {
  const access = validateAccess(rawAccess);

  const assignedBy = rawAccess?.assignedBy;
  const ipAddress = rawAccess?.ipAddress ?? null;
  const userAgent = rawAccess?.userAgent ?? null;

  if (!assignedBy) {
    const error = new Error("Identitas admin tidak ditemukan.");
    error.statusCode = 401;
    throw error;
  }

  const notes = typeof reviewNotes === "string" ? reviewNotes.trim() : "";

  if (notes.length > 1000) {
    const error = new Error("Alasan penolakan maksimal 1000 karakter.");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Ambil dan kunci klaim.
    const claimResult = await client.query(
      `
        SELECT
          id,
          user_id,
          parent_id,
          student_id,
          requested_student_id,
          branch_id,
          status,
          review_notes
        FROM parent_student_claims
        WHERE id = $1
        FOR UPDATE
      `,
      [claimId],
    );

    if (claimResult.rowCount === 0) {
      const error = new Error("Pengajuan siswa tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    const claim = claimResult.rows[0];

    if (claim.status !== "pending") {
      const error = new Error("Pengajuan ini sudah diproses sebelumnya.");
      error.statusCode = 409;
      throw error;
    }

    if (!claim.branch_id) {
      const error = new Error("Cabang pengajuan tidak valid.");
      error.statusCode = 400;
      throw error;
    }

    // 2. Validasi cakupan cabang.
    if (!access.isSuperAdmin && claim.branch_id !== access.activeBranchId) {
      const error = new Error("Pengajuan berada di luar cabang aktif Anda.");
      error.statusCode = 403;
      throw error;
    }

    const branchResult = await client.query(
      `
        SELECT id
        FROM branches
        WHERE id = $1
        LIMIT 1
      `,
      [claim.branch_id],
    );

    if (branchResult.rowCount === 0) {
      const error = new Error("Cabang pengajuan tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    // 3. Update status klaim.
    const updatedResult = await client.query(
      `
        UPDATE parent_student_claims
        SET
          status = 'rejected',
          reviewed_by = $2,
          reviewed_at = NOW(),
          review_notes = $3,
          updated_at = NOW()
        WHERE id = $1
          AND status = 'pending'
        RETURNING
          id,
          user_id AS "userId",
          parent_id AS "parentId",
          student_id AS "studentId",
          requested_student_id AS "requestedStudentId",
          branch_id AS "branchId",
          status,
          reviewed_by AS "reviewedBy",
          reviewed_at AS "reviewedAt",
          review_notes AS "reviewNotes"
      `,
      [claimId, assignedBy, notes || null],
    );

    if (updatedResult.rowCount === 0) {
      const error = new Error(
        "Status pengajuan berubah. Silakan periksa kembali.",
      );
      error.statusCode = 409;
      throw error;
    }

    const updatedClaim = updatedResult.rows[0];

    // 4. Audit log.
    await createAuditLog(
      {
        userId: assignedBy,
        branchId: claim.branch_id,
        action: "UPDATE",
        entityTable: "parent_student_claims",
        entityId: claimId,
        oldValues: {
          status: "pending",
          studentId: claim.student_id,
          reviewNotes: claim.review_notes,
        },
        newValues: {
          status: "rejected",
          studentId: claim.student_id,
          userId: claim.user_id,
          branchId: claim.branch_id,
          reviewNotes: notes || null,
        },
        ipAddress,
        userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return {
      claim: updatedClaim,
      message: "Pengajuan siswa berhasil ditolak.",
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
