import { pool } from "../config/database.js";
import { createAuditLog } from "./auditLog.service.js";

// ==========================================
// MENGAMBIL DAFTAR PENGGUNA
// ==========================================

export async function getAllUsers({ search = "", page = 1, limit = 10 } = {}) {
  const conditions = [];
  const values = [];
  let index = 1;

  if (search) {
    conditions.push(`
      (
        u.full_name ILIKE $${index}
        OR u.email ILIKE $${index}
        OR u.phone ILIKE $${index}
      )
    `);

    values.push(`%${search}%`);
    index++;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)
      FROM users u
      ${whereClause}
    `,
    values,
  );

  const dataResult = await pool.query(
    `
      SELECT
        u.id,
        u.full_name AS "fullName",
        u.email,
        u.phone,
        u.is_active AS "isActive",
        u.email_verified_at AS "emailVerifiedAt",
        u.phone_verified_at AS "phoneVerifiedAt",
        u.last_login_at AS "lastLoginAt",
        u.created_at AS "createdAt",

        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'roleCode', r.role_code,
                'roleName', r.role_name,
                'branchId', b.id,
                'branchCode', b.branch_code,
                'branchName', b.branch_name,
                'isActive', ubr.is_active
              )
              ORDER BY r.role_name, b.branch_name
            )
            FROM user_branch_roles ubr
            JOIN roles r ON r.id = ubr.role_id
            LEFT JOIN branches b ON b.id = ubr.branch_id
            WHERE ubr.user_id = u.id
          ),
          '[]'::jsonb
        ) AS roles

      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${index}
      OFFSET $${index + 1}
    `,
    [...values, limit, offset],
  );

  const total = Number(countResult.rows[0].count);

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
// DETAIL PENGGUNA
// ==========================================

export async function getUserById(id) {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.full_name AS "fullName",
        u.email,
        u.phone,
        u.is_active AS "isActive",
        u.email_verified_at AS "emailVerifiedAt",
        u.phone_verified_at AS "phoneVerifiedAt",
        u.last_login_at AS "lastLoginAt",
        u.created_at AS "createdAt",

        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'roleCode', r.role_code,
                'roleName', r.role_name,
                'branchId', b.id,
                'branchCode', b.branch_code,
                'branchName', b.branch_name,
                'isActive', ubr.is_active
              )
              ORDER BY r.role_name, b.branch_name
            )
            FROM user_branch_roles ubr
            JOIN roles r ON r.id = ubr.role_id
            LEFT JOIN branches b ON b.id = ubr.branch_id
            WHERE ubr.user_id = u.id
          ),
          '[]'::jsonb
        ) AS roles

      FROM users u
      WHERE u.id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
}

// ==========================================
// MENGAMBIL DAFTAR CABANG UNTUK ASSIGNMENT
// ==========================================

export async function getAvailableBranches() {
  const result = await pool.query(
    `
      SELECT
        id,
        branch_code AS "branchCode",
        branch_name AS "branchName",
        city,
        is_active AS "isActive"
      FROM branches
      WHERE is_active = TRUE
      ORDER BY branch_name ASC
    `,
  );

  return result.rows;
}

// ==========================================
// MENGATUR ROLE BRANCH ADMIN
// ==========================================

export async function setBranchAdminAssignments({
  userId,
  branchIds,
  assignedBy,
  ipAddress = null,
  userAgent = null,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------
    // 1. Cegah Super Admin mengelola akunnya
    //    sendiri melalui modul ini
    // --------------------------------------

    if (userId === assignedBy) {
      const error = new Error(
        "Anda tidak dapat mengubah penugasan role pada akun sendiri.",
      );
      error.statusCode = 400;
      throw error;
    }

    // --------------------------------------
    // 2. Pastikan pengguna tersedia dan aktif
    // --------------------------------------

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

    if (userResult.rowCount === 0) {
      const error = new Error("Pengguna tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      const error = new Error(
        "Pengguna tidak aktif dan tidak dapat diberikan role.",
      );
      error.statusCode = 400;
      throw error;
    }

    // --------------------------------------
    // 3. Pastikan role branch_admin tersedia
    // --------------------------------------

    const roleResult = await client.query(
      `
        SELECT id
        FROM roles
        WHERE role_code = 'branch_admin'
        LIMIT 1
        FOR SHARE
      `,
    );

    if (roleResult.rowCount === 0) {
      const error = new Error("Role branch_admin tidak ditemukan.");
      error.statusCode = 500;
      throw error;
    }

    const branchAdminRoleId = roleResult.rows[0].id;

    // --------------------------------------
    // 4. Pastikan seluruh cabang valid dan aktif
    // --------------------------------------

    const uniqueBranchIds = [...new Set(branchIds)];

    if (uniqueBranchIds.length !== branchIds.length) {
      const error = new Error("Daftar cabang mengandung ID duplikat.");
      error.statusCode = 400;
      throw error;
    }

    if (uniqueBranchIds.length > 0) {
      const branchResult = await client.query(
        `
          SELECT id
          FROM branches
          WHERE id = ANY($1::uuid[])
            AND is_active = TRUE
          FOR SHARE
        `,
        [uniqueBranchIds],
      );

      if (branchResult.rowCount !== uniqueBranchIds.length) {
        const error = new Error(
          "Terdapat cabang yang tidak ditemukan atau tidak aktif.",
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // --------------------------------------
    // 5. Ambil assignment branch_admin aktif
    // --------------------------------------

    const currentResult = await client.query(
      `
        SELECT
          id,
          branch_id AS "branchId"
        FROM user_branch_roles
        WHERE user_id = $1
          AND role_id = $2
          AND is_active = TRUE
        FOR UPDATE
      `,
      [userId, branchAdminRoleId],
    );

    const currentAssignments = currentResult.rows;

    const currentBranchIds = currentAssignments.map((item) => item.branchId);

    const currentSet = new Set(currentBranchIds);
    const desiredSet = new Set(uniqueBranchIds);

    const toDeactivate = currentAssignments.filter(
      (item) => !desiredSet.has(item.branchId),
    );

    const toActivate = uniqueBranchIds.filter(
      (branchId) => !currentSet.has(branchId),
    );

    // --------------------------------------
    // 6. Nonaktifkan assignment yang dicabut
    // --------------------------------------

    for (const assignment of toDeactivate) {
      await client.query(
        `
          UPDATE user_branch_roles
          SET is_active = FALSE
          WHERE id = $1
        `,
        [assignment.id],
      );

      await createAuditLog(
        {
          userId: assignedBy,
          branchId: assignment.branchId,
          action: "REVOKE_BRANCH_ADMIN_ROLE",
          entityTable: "user_branch_roles",
          entityId: assignment.id,
          oldValues: {
            userId,
            roleCode: "branch_admin",
            branchId: assignment.branchId,
            isActive: true,
          },
          newValues: {
            userId,
            roleCode: "branch_admin",
            branchId: assignment.branchId,
            isActive: false,
          },
          ipAddress,
          userAgent,
        },
        client,
      );
    }

    // --------------------------------------
    // 7. Aktifkan assignment yang baru
    // --------------------------------------

    for (const branchId of toActivate) {
      const assignmentResult = await client.query(
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
            is_active = TRUE,
            assigned_by = EXCLUDED.assigned_by

          RETURNING id
        `,
        [userId, branchAdminRoleId, branchId, assignedBy],
      );

      await createAuditLog(
        {
          userId: assignedBy,
          branchId,
          action: "ASSIGN_BRANCH_ADMIN_ROLE",
          entityTable: "user_branch_roles",
          entityId: assignmentResult.rows[0].id,
          oldValues: null,
          newValues: {
            userId,
            roleCode: "branch_admin",
            branchId,
            isActive: true,
          },
          ipAddress,
          userAgent,
        },
        client,
      );
    }

    // --------------------------------------
    // 8. Commit
    // --------------------------------------

    await client.query("COMMIT");

    return await getUserById(userId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
