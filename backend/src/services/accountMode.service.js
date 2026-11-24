import { pool } from "../config/database.js";
import { createAuditLog } from "./auditLog.service.js";

// ==========================================
// AUTH ERROR
// ==========================================

function createModeError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// ==========================================
// SWITCH ACCOUNT MODE
// ==========================================

export async function switchAccountMode(userId, targetMode, metadata = {}) {
  const allowedModes = ["normal", "parent"];

  if (!userId) {
    throw createModeError("Pengguna tidak valid.", 401);
  }

  if (!allowedModes.includes(targetMode)) {
    throw createModeError("Mode akun tidak valid.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock akun
    const userResult = await client.query(
      `
        SELECT id, active_mode, is_active
        FROM users
        WHERE id = $1
        FOR UPDATE
      `,
      [userId],
    );

    if (userResult.rowCount === 0 || !userResult.rows[0].is_active) {
      throw createModeError("Akun tidak ditemukan atau tidak aktif.", 404);
    }

    const user = userResult.rows[0];

    // 2. Validasi role publik
    const roleResult = await client.query(
      `
        SELECT
          r.role_code,
          ubr.is_active
        FROM user_branch_roles ubr
        INNER JOIN roles r ON r.id = ubr.role_id
        WHERE ubr.user_id = $1
          AND ubr.branch_id IS NULL
          AND r.role_code IN ('user', 'parent')
      `,
      [userId],
    );

    const roleMap = new Map(
      roleResult.rows.map((row) => [row.role_code, row.is_active]),
    );

    if (!roleMap.has("user") && !roleMap.has("parent")) {
      throw createModeError(
        "Fitur pergantian mode hanya tersedia untuk akun pengguna umum.",
        403,
      );
    }

    // 3. Cegah akun staf/admin mengganti mode
    const protectedRoleResult = await client.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM user_branch_roles ubr
          INNER JOIN roles r ON r.id = ubr.role_id
          WHERE ubr.user_id = $1
            AND ubr.is_active = TRUE
            AND r.role_code IN (
              'super_admin',
              'branch_admin',
              'tutor',
              'staff'
            )
        ) AS has_protected_role
      `,
      [userId],
    );

    if (protectedRoleResult.rows[0].has_protected_role) {
      throw createModeError(
        "Akun dengan akses staf atau administrator tidak dapat mengganti mode.",
        403,
      );
    }

    // 4. Tentukan mode dan role
    const targetRole = targetMode === "parent" ? "parent" : "user";
    const previousMode = user.active_mode || "normal";

    // 5. Jika mode sudah aktif, jangan buat perubahan atau audit log
    if (previousMode === targetMode) {
      await client.query("COMMIT");

      return {
        activeMode: targetMode,
        activeRole: targetRole,
        unchanged: true,
        message: "Mode akun sudah aktif.",
      };
    }

    // 6. Ambil ID role tujuan
    const targetRoleResult = await client.query(
      `
        SELECT id
        FROM roles
        WHERE role_code = $1
        LIMIT 1
      `,
      [targetRole],
    );

    if (targetRoleResult.rowCount === 0) {
      throw createModeError(
        `Role ${targetRole} belum tersedia di database.`,
        500,
      );
    }

    const targetRoleId = targetRoleResult.rows[0].id;

    // 7. Cari record role tujuan yang sudah tersedia
    const existingRoleResult = await client.query(
      `
        SELECT id
        FROM user_branch_roles
        WHERE user_id = $1
          AND role_id = $2
          AND branch_id IS NULL
        ORDER BY is_active DESC
        LIMIT 1
        FOR UPDATE
      `,
      [userId, targetRoleId],
    );

    let targetAssignmentId;

    if (existingRoleResult.rowCount > 0) {
      targetAssignmentId = existingRoleResult.rows[0].id;
    } else {
      // Buat hanya jika belum tersedia
      const insertResult = await client.query(
        `
          INSERT INTO user_branch_roles (
            user_id,
            role_id,
            branch_id,
            assigned_by,
            is_active
          )
          VALUES ($1, $2, NULL, NULL, FALSE)
          RETURNING id
        `,
        [userId, targetRoleId],
      );

      targetAssignmentId = insertResult.rows[0].id;
    }

    // 8. Nonaktifkan role publik
    await client.query(
      `
        UPDATE user_branch_roles ubr
        SET is_active = FALSE
        FROM roles r
        WHERE ubr.role_id = r.id
          AND ubr.user_id = $1
          AND ubr.branch_id IS NULL
          AND r.role_code IN ('user', 'parent')
          AND ubr.is_active = TRUE
      `,
      [userId],
    );

    // 9. Aktifkan satu record role tujuan
    await client.query(
      `
        UPDATE user_branch_roles
        SET is_active = TRUE
        WHERE id = $1
      `,
      [targetAssignmentId],
    );

    // 10. Simpan mode akun
    await client.query(
      `
        UPDATE users
        SET
          active_mode = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [targetMode, userId],
    );

    // 11. Catat audit log hanya untuk perubahan aktual
    await createAuditLog(
      {
        userId,
        branchId: null,
        action: "account_mode_switched",
        entityTable: "users",
        entityId: userId,
        oldValues: {
          activeMode: previousMode,
          activeRole: previousMode === "parent" ? "parent" : "user",
        },
        newValues: {
          activeMode: targetMode,
          activeRole: targetRole,
        },
        ipAddress: metadata.ipAddress || null,
        userAgent: metadata.userAgent || null,
      },
      client,
    );

    await client.query("COMMIT");

    return {
      activeMode: targetMode,
      activeRole: targetRole,
      unchanged: false,
      message:
        targetMode === "parent"
          ? "Mode Akun Orang Tua berhasil diaktifkan."
          : "Mode Akun Biasa berhasil diaktifkan.",
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
