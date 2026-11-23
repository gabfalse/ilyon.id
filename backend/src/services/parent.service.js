import { pool } from "../config/database.js";
import { createAuditLog } from "./auditLog.service.js";
import { insertStudentWithClient } from "./student.service.js";
import { randomBytes } from "node:crypto";
// ==========================================
// PARENT FIELD MAPPING
// ==========================================

const parentFields = {
  fullName: "full_name",
  relationshipLabel: "relationship_label",
  phone: "phone",
  whatsapp: "whatsapp",
  email: "email",
  address: "address",
  notes: "notes",
};

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
      "Anda tidak memiliki cakupan cabang untuk mengakses data orang tua.",
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

    // Seluruh query Branch Admin menggunakan satu cabang aktif.
    scopeBranchIds: [activeBranchId],
  };
}

// ==========================================
// GET ELIGIBLE PARENT ACCOUNTS
// ==========================================

export async function getEligibleParentAccounts() {
  const result = await pool.query(`
    SELECT
      u.id,
      u.full_name AS "fullName",
      u.email,
      u.phone

    FROM users u

    WHERE u.is_active = TRUE

      -- Harus memiliki tepat satu role aktif.
      AND (
        SELECT COUNT(*)
        FROM user_branch_roles active_ubr
        WHERE active_ubr.user_id = u.id
          AND active_ubr.is_active = TRUE
      ) = 1

      -- Role aktif tersebut harus role user global.
      AND EXISTS (
        SELECT 1
        FROM user_branch_roles ubr
        INNER JOIN roles r
          ON r.id = ubr.role_id
        WHERE ubr.user_id = u.id
          AND ubr.is_active = TRUE
          AND r.role_code = 'user'
          AND ubr.branch_id IS NULL
      )

      -- Belum mempunyai profil Parent.
      AND NOT EXISTS (
        SELECT 1
        FROM parents p
        WHERE p.user_id = u.id
      )

    ORDER BY LOWER(u.full_name) ASC
  `);

  return result.rows;
}

// ==========================================
// ACTIVE ENROLLMENT CONDITION
// ==========================================

function activeEnrollmentCondition(alias) {
  return `
    ${alias}.status = 'active'
    AND ${alias}.start_date <= CURRENT_DATE
    AND (
      ${alias}.end_date IS NULL
      OR ${alias}.end_date >= CURRENT_DATE
    )
  `;
}

// ==========================================
// PARENT ACCESS SCOPE
// ==========================================

function parentScope(alias, access, parameterIndex = 1) {
  if (access.isSuperAdmin) {
    return {
      sql: "TRUE",
      values: [],
    };
  }

  return {
    sql: `
      (
        (
          ${alias}.created_by_branch_id = ANY($${parameterIndex}::uuid[])

          AND NOT EXISTS (
            SELECT 1
            FROM student_parents temporary_sp
            INNER JOIN students temporary_s
              ON temporary_s.id = temporary_sp.student_id
            INNER JOIN student_enrollments temporary_se
              ON temporary_se.student_id = temporary_s.id
            WHERE temporary_sp.parent_id = ${alias}.id
              AND temporary_s.deleted_at IS NULL
              AND ${activeEnrollmentCondition("temporary_se")}
          )
        )

        OR EXISTS (
          SELECT 1
          FROM student_parents scope_sp
          INNER JOIN students scope_s
            ON scope_s.id = scope_sp.student_id
          INNER JOIN student_enrollments scope_se
            ON scope_se.student_id = scope_s.id
          WHERE scope_sp.parent_id = ${alias}.id
            AND scope_s.deleted_at IS NULL
            AND scope_se.branch_id = ANY($${parameterIndex}::uuid[])
            AND ${activeEnrollmentCondition("scope_se")}
        )
      )
    `,
    values: [access.scopeBranchIds],
  };
}

// ==========================================
// STUDENT ACCESS SCOPE
// ==========================================

function studentScope(alias, access, parameterIndex = 1) {
  if (access.isSuperAdmin) {
    return {
      sql: `${alias}.deleted_at IS NULL`,
      values: [],
    };
  }

  return {
    sql: `
      (
        ${alias}.deleted_at IS NULL

        AND EXISTS (
          SELECT 1
          FROM student_enrollments scope_se
          WHERE scope_se.student_id = ${alias}.id
            AND scope_se.branch_id = ANY($${parameterIndex}::uuid[])
            AND ${activeEnrollmentCondition("scope_se")}
        )
      )
    `,
    values: [access.scopeBranchIds],
  };
}

// ==========================================
// PARENT SELECT QUERY
// ==========================================

function getParentSelect(access) {
  const studentCountCondition = access.isSuperAdmin
    ? ""
    : `
        AND EXISTS (
          SELECT 1
          FROM student_enrollments count_se
          WHERE count_se.student_id = count_s.id
            AND count_se.branch_id = ANY($1::uuid[])
            AND ${activeEnrollmentCondition("count_se")}
        )
      `;

  return `
    SELECT
      p.id,
      p.user_id AS "userId",
      p.full_name AS "fullName",
      p.relationship_label AS "relationshipLabel",
      p.phone,
      p.whatsapp,
      p.email,
      p.address,
      p.notes,
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      u.is_active AS "accountIsActive",

      (
        SELECT COUNT(*)::INTEGER
        FROM student_parents sp
        INNER JOIN students count_s
          ON count_s.id = sp.student_id
        WHERE sp.parent_id = p.id
          AND count_s.deleted_at IS NULL
          ${studentCountCondition}
      ) AS "studentCount"

    FROM parents p

    LEFT JOIN users u
      ON u.id = p.user_id
  `;
}

// ==========================================
// GET ALL PARENTS
// ==========================================

export async function getAllParents({
  search = "",
  page = 1,
  limit = 10,
  access: rawAccess,
} = {}) {
  const access = validateAccess(rawAccess);

  const conditions = [];
  const values = [];
  let index = 1;

  if (!access.isSuperAdmin) {
    conditions.push(parentScope("p", access, index).sql);
    values.push(access.scopeBranchIds);
    index++;
  }

  if (search) {
    conditions.push(`
      (
        p.full_name ILIKE $${index}
        OR p.phone ILIKE $${index}
        OR p.whatsapp ILIKE $${index}
        OR p.email ILIKE $${index}
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
      SELECT COUNT(*)::INTEGER AS total
      FROM parents p
      ${whereClause}
    `,
    values,
  );

  const dataResult = await pool.query(
    `
      ${getParentSelect(access)}
      ${whereClause}
      ORDER BY p.created_at DESC
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
// GET PARENT BY ID
// ==========================================

export async function getParentById(id, rawAccess) {
  const access = validateAccess(rawAccess);

  const values = [id];

  let scopeCondition = "TRUE";

  if (!access.isSuperAdmin) {
    scopeCondition = parentScope("p", access, 2).sql;
    values.push(access.scopeBranchIds);
  }

  const studentScopeCondition = access.isSuperAdmin
    ? "AND s.deleted_at IS NULL"
    : `
        AND s.deleted_at IS NULL
        AND EXISTS (
          SELECT 1
          FROM student_enrollments detail_se
          WHERE detail_se.student_id = s.id
            AND detail_se.branch_id = ANY($2::uuid[])
            AND ${activeEnrollmentCondition("detail_se")}
        )
      `;

  const result = await pool.query(
    `
      SELECT
        p.id,
        p.user_id AS "userId",
        p.full_name AS "fullName",
        p.relationship_label AS "relationshipLabel",
        p.phone,
        p.whatsapp,
        p.email,
        p.address,
        p.notes,
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        u.is_active AS "accountIsActive",

        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'studentId', s.id,
                'studentCode', s.student_code,
                'studentName', s.full_name,
                'studentStatus', s.status,
                'relationshipLabel', sp.relationship_label,
                'isPrimaryContact', sp.is_primary_contact,
                'canViewProgress', sp.can_view_progress,
                'canReceiveNotifications', sp.can_receive_notifications
              )
              ORDER BY s.full_name
            )
            FROM student_parents sp
            INNER JOIN students s
              ON s.id = sp.student_id
            WHERE sp.parent_id = p.id
              ${studentScopeCondition}
          ),
          '[]'::jsonb
        ) AS students

      FROM parents p

      LEFT JOIN users u
        ON u.id = p.user_id

      WHERE p.id = $1
        AND ${scopeCondition}

      LIMIT 1
    `,
    values,
  );

  return result.rows[0] || null;
}

// ==========================================
// CREATE PARENT + CONVERT USER ROLE
// ==========================================

export async function createParent(data, rawAccess) {
  const access = validateAccess(rawAccess);

  const userId = data.userId;
  const assignedBy = rawAccess?.assignedBy;
  const ipAddress = rawAccess?.ipAddress ?? null;
  const userAgent = rawAccess?.userAgent ?? null;

  if (!userId) {
    const error = new Error("Akun pengguna wajib dipilih.");
    error.statusCode = 400;
    throw error;
  }

  if (!assignedBy) {
    const error = new Error("Identitas admin tidak ditemukan.");
    error.statusCode = 401;
    throw error;
  }

  if (userId === assignedBy) {
    const error = new Error(
      "Anda tidak dapat menggunakan akun sendiri sebagai akun orang tua.",
    );
    error.statusCode = 400;
    throw error;
  }

  let createdByBranchId = null;

  if (!access.isSuperAdmin) {
    createdByBranchId = access.activeBranchId;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------
    // 1. KUNCI AKUN PENGGUNA
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
      const error = new Error("Akun pengguna tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      const error = new Error("Akun pengguna tidak aktif.");
      error.statusCode = 400;
      throw error;
    }

    // --------------------------------------
    // 2. PASTIKAN BELUM MEMILIKI PROFIL PARENT
    // --------------------------------------

    const existingParent = await client.query(
      `
        SELECT id
        FROM parents
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId],
    );

    if (existingParent.rowCount > 0) {
      const error = new Error("Akun ini sudah memiliki profil orang tua.");
      error.statusCode = 409;
      throw error;
    }

    // --------------------------------------
    // 3. AMBIL DAN KUNCI ROLE AKTIF
    // --------------------------------------

    const activeRolesResult = await client.query(
      `
        SELECT
          ubr.id,
          ubr.role_id,
          ubr.branch_id,
          r.role_code
        FROM user_branch_roles ubr
        INNER JOIN roles r
          ON r.id = ubr.role_id
        WHERE ubr.user_id = $1
          AND ubr.is_active = TRUE
        FOR UPDATE OF ubr
      `,
      [userId],
    );

    if (
      activeRolesResult.rowCount !== 1 ||
      activeRolesResult.rows[0].role_code !== "user" ||
      activeRolesResult.rows[0].branch_id !== null
    ) {
      const error = new Error(
        "Akun harus memiliki tepat satu role aktif, yaitu user tanpa penugasan cabang.",
      );
      error.statusCode = 400;
      throw error;
    }

    const userRoleAssignment = activeRolesResult.rows[0];

    // --------------------------------------
    // 4. AMBIL ROLE PARENT
    // --------------------------------------

    const parentRoleResult = await client.query(
      `
        SELECT id
        FROM roles
        WHERE role_code = 'parent'
        LIMIT 1
      `,
    );

    if (parentRoleResult.rowCount === 0) {
      const error = new Error("Role parent belum tersedia di database.");
      error.statusCode = 500;
      throw error;
    }

    const parentRoleId = parentRoleResult.rows[0].id;

    // --------------------------------------
    // 5. BUAT PROFIL PARENT
    // --------------------------------------

    const fields = Object.keys(parentFields).filter(
      (key) => data[key] !== undefined,
    );

    const columns = [
      "user_id",
      ...fields.map((key) => parentFields[key]),
      "created_by_branch_id",
    ];

    const values = [
      userId,
      ...fields.map((key) => data[key]),
      createdByBranchId,
    ];

    const placeholders = values.map((_, index) => `$${index + 1}`);

    const parentResult = await client.query(
      `
        INSERT INTO parents (
          ${columns.join(", ")}
        )
        VALUES (
          ${placeholders.join(", ")}
        )
        RETURNING id
      `,
      values,
    );

    const parentId = parentResult.rows[0].id;

    // --------------------------------------
    // 6. NONAKTIFKAN ROLE USER
    // --------------------------------------

    await client.query(
      `
        UPDATE user_branch_roles
        SET is_active = FALSE
        WHERE id = $1
          AND is_active = TRUE
      `,
      [userRoleAssignment.id],
    );

    // --------------------------------------
    // 7. CARI SELURUH ROLE PARENT YANG ADA
    // --------------------------------------

    const existingParentRoleResult = await client.query(
      `
    SELECT id, is_active
    FROM user_branch_roles
    WHERE user_id = $1
      AND role_id = $2
      AND branch_id IS NULL
    ORDER BY created_at DESC
    FOR UPDATE
  `,
      [userId, parentRoleId],
    );

    let parentRoleAssignmentId;
    let oldParentRoleValues = null;

    if (existingParentRoleResult.rowCount > 0) {
      // Gunakan satu assignment Parent yang paling baru.
      const selectedAssignment = existingParentRoleResult.rows[0];

      parentRoleAssignmentId = selectedAssignment.id;

      oldParentRoleValues = {
        userId,
        roleCode: "parent",
        branchId: null,
        isActive: selectedAssignment.is_active,
      };

      // Aktifkan satu assignment yang dipilih.
      await client.query(
        `
      UPDATE user_branch_roles
      SET
        is_active = TRUE,
        assigned_by = $2
      WHERE id = $1
    `,
        [parentRoleAssignmentId, assignedBy],
      );

      // Pastikan seluruh assignment Parent lainnya nonaktif.
      const duplicateIds = existingParentRoleResult.rows
        .slice(1)
        .map((assignment) => assignment.id);

      if (duplicateIds.length > 0) {
        await client.query(
          `
        UPDATE user_branch_roles
        SET is_active = FALSE
        WHERE id = ANY($1::uuid[])
      `,
          [duplicateIds],
        );
      }
    } else {
      const newParentRoleResult = await client.query(
        `
      INSERT INTO user_branch_roles (
        user_id,
        role_id,
        branch_id,
        assigned_by,
        is_active
      )
      VALUES ($1, $2, NULL, $3, TRUE)
      RETURNING id
    `,
        [userId, parentRoleId, assignedBy],
      );

      parentRoleAssignmentId = newParentRoleResult.rows[0].id;
    }

    // --------------------------------------
    // 8. AUDIT LOG: ROLE USER DINONAKTIFKAN
    // --------------------------------------

    await createAuditLog(
      {
        userId: assignedBy,
        branchId: createdByBranchId,
        action: "UPDATE",
        entityTable: "user_branch_roles",
        entityId: userRoleAssignment.id,
        oldValues: {
          userId,
          roleCode: "user",
          branchId: null,
          isActive: true,
        },
        newValues: {
          userId,
          roleCode: "user",
          branchId: null,
          isActive: false,
        },
        ipAddress,
        userAgent,
      },
      client,
    );

    // --------------------------------------
    // 9. AUDIT LOG: ROLE PARENT DIAKTIFKAN
    // --------------------------------------

    await createAuditLog(
      {
        userId: assignedBy,
        branchId: createdByBranchId,
        action: "UPDATE",
        entityTable: "user_branch_roles",
        entityId: parentRoleAssignmentId,
        oldValues: oldParentRoleValues,
        newValues: {
          userId,
          roleCode: "parent",
          branchId: null,
          isActive: true,
        },
        ipAddress,
        userAgent,
      },
      client,
    );
    // --------------------------------------
    // 10. AUDIT LOG: PROFIL PARENT DIBUAT
    // --------------------------------------

    await createAuditLog(
      {
        userId: assignedBy,
        branchId: createdByBranchId,
        action: "INSERT",
        entityTable: "parents",
        entityId: parentId,
        oldValues: null,
        newValues: {
          id: parentId,
          userId,
          fullName: data.fullName ?? user.full_name,
        },
        ipAddress,
        userAgent,
      },
      client,
    );

    // --------------------------------------
    // 11. COMMIT
    // --------------------------------------

    await client.query("COMMIT");

    return await getParentById(parentId, access);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    // Tangani duplikasi user_id pada tabel parents.
    if (error.code === "23505" && error.constraint === "parents_user_id_key") {
      const conflictError = new Error(
        "Akun ini sudah terhubung dengan profil orang tua.",
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
// UPDATE PARENT
// ==========================================

export async function updateParent(id, data, rawAccess) {
  const access = validateAccess(rawAccess);

  const fields = Object.keys(parentFields).filter(
    (key) => data[key] !== undefined,
  );

  if (fields.length === 0) {
    return getParentById(id, access);
  }

  const assignments = fields.map(
    (key, index) => `${parentFields[key]} = $${index + 1}`,
  );

  const values = fields.map((key) => data[key]);
  values.push(id);

  let scopeCondition = "TRUE";

  if (!access.isSuperAdmin) {
    scopeCondition = parentScope("p", access, values.length + 1).sql;
    values.push(access.scopeBranchIds);
  }

  const result = await pool.query(
    `
      UPDATE parents p
      SET
        ${assignments.join(", ")},
        updated_at = NOW()
      WHERE p.id = $${fields.length + 1}
        AND ${scopeCondition}
      RETURNING p.id
    `,
    values,
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getParentById(id, access);
}

// ==========================================
// LINK PARENT WITH STUDENT
// ==========================================

export async function linkParentWithStudent(parentId, data, rawAccess) {
  const access = validateAccess(rawAccess);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const parentScopeCondition = parentScope("p", access, 2).sql;

    const parentValues = access.isSuperAdmin
      ? [parentId]
      : [parentId, access.scopeBranchIds];

    const parentResult = await client.query(
      `
        SELECT p.id
        FROM parents p
        WHERE p.id = $1
          AND ${parentScopeCondition}
        FOR UPDATE
      `,
      parentValues,
    );

    if (parentResult.rowCount === 0) {
      const error = new Error(
        "Orang tua tidak ditemukan atau berada di luar cakupan cabang Anda.",
      );
      error.statusCode = 404;
      throw error;
    }

    const studentResult = await client.query(
      `
        SELECT s.id
        FROM students s
        WHERE s.id = $1
          AND s.deleted_at IS NULL
          AND (
            $2::boolean = TRUE
            OR EXISTS (
              SELECT 1
              FROM student_enrollments se
              WHERE se.student_id = s.id
                AND se.branch_id = ANY($3::uuid[])
                AND ${activeEnrollmentCondition("se")}
            )
          )
        FOR UPDATE
      `,
      [data.studentId, access.isSuperAdmin, access.scopeBranchIds],
    );

    if (studentResult.rowCount === 0) {
      const error = new Error(
        "Siswa tidak ditemukan atau berada di luar cakupan cabang Anda.",
      );
      error.statusCode = 404;
      throw error;
    }

    if (data.isPrimaryContact) {
      await client.query(
        `
          UPDATE student_parents
          SET is_primary_contact = FALSE
          WHERE student_id = $1
        `,
        [data.studentId],
      );
    }

    await client.query(
      `
        INSERT INTO student_parents (
          student_id,
          parent_id,
          relationship_label,
          is_primary_contact,
          can_view_progress,
          can_receive_notifications
        )
        VALUES ($1, $2, $3, $4, $5, $6)

        ON CONFLICT (student_id, parent_id)
        DO UPDATE SET
          relationship_label = EXCLUDED.relationship_label,
          is_primary_contact = EXCLUDED.is_primary_contact,
          can_view_progress = EXCLUDED.can_view_progress,
          can_receive_notifications = EXCLUDED.can_receive_notifications
      `,
      [
        data.studentId,
        parentId,
        data.relationshipLabel,
        data.isPrimaryContact,
        data.canViewProgress,
        data.canReceiveNotifications,
      ],
    );

    await client.query("COMMIT");

    return getParentById(parentId, access);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// UNLINK PARENT FROM STUDENT
// ==========================================

export async function unlinkParentFromStudent(parentId, studentId, rawAccess) {
  const access = validateAccess(rawAccess);

  const parentScopeCondition = parentScope("p", access, 5).sql;

  const values = [
    parentId,
    studentId,
    access.isSuperAdmin,
    access.scopeBranchIds,
  ];

  if (!access.isSuperAdmin) {
    values.push(access.scopeBranchIds);
  }

  const result = await pool.query(
    `
      DELETE FROM student_parents sp
      USING students s, parents p
      WHERE sp.parent_id = $1
        AND sp.student_id = $2
        AND s.id = sp.student_id
        AND p.id = sp.parent_id
        AND s.deleted_at IS NULL

        AND (
          $3::boolean = TRUE
          OR EXISTS (
            SELECT 1
            FROM student_enrollments se
            WHERE se.student_id = s.id
              AND se.branch_id = ANY($4::uuid[])
              AND ${activeEnrollmentCondition("se")}
          )
        )

        AND ${parentScopeCondition}

      RETURNING sp.parent_id, sp.student_id
    `,
    values,
  );

  if (result.rowCount === 0) {
    return null;
  }

  const parent = await getParentById(parentId, access);

  return {
    parentId: result.rows[0].parent_id,
    studentId: result.rows[0].student_id,
    unlinked: true,
    parent,
  };
}

export async function restoreParentToUser(parentId, rawAccess = {}) {
  const access = validateAccess(rawAccess);

  const assignedBy = rawAccess?.assignedBy;
  const ipAddress = rawAccess?.ipAddress || null;
  const userAgent = rawAccess?.userAgent || null;

  if (!assignedBy) {
    const error = new Error("Identitas admin tidak ditemukan.");
    error.statusCode = 401;
    throw error;
  }

  if (
    typeof parentId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      parentId,
    )
  ) {
    const error = new Error("ID orang tua tidak valid.");
    error.statusCode = 400;
    throw error;
  }

  // Pastikan Parent berada dalam cakupan akses admin.
  const accessibleParent = await getParentById(parentId, access);

  if (!accessibleParent) {
    const error = new Error("Data orang tua tidak ditemukan.");
    error.statusCode = 404;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ==========================================
    // 1. LOCK PROFIL PARENT DAN AKUN USER
    // ==========================================

    const parentResult = await client.query(
      `
        SELECT
          p.id AS parent_id,
          p.user_id,
          u.full_name,
          u.is_active AS user_is_active
        FROM parents p
        INNER JOIN users u ON u.id = p.user_id
        WHERE p.id = $1
        FOR UPDATE OF p, u
      `,
      [parentId],
    );

    if (parentResult.rowCount === 0) {
      const error = new Error(
        "Profil orang tua atau akun pengguna tidak ditemukan.",
      );
      error.statusCode = 404;
      throw error;
    }

    const parent = parentResult.rows[0];
    const userId = parent.user_id;

    if (!userId) {
      const error = new Error(
        "Profil orang tua tidak terhubung dengan akun pengguna.",
      );
      error.statusCode = 409;
      throw error;
    }

    // ==========================================
    // 2. AMBIL ROLE ID
    // ==========================================

    const rolesResult = await client.query(
      `
        SELECT id, role_code
        FROM roles
        WHERE role_code IN ('user', 'parent')
      `,
    );

    const roleMap = {};

    for (const role of rolesResult.rows) {
      roleMap[role.role_code] = role.id;
    }

    if (!roleMap.user || !roleMap.parent) {
      const error = new Error("Role User atau Parent tidak ditemukan.");
      error.statusCode = 500;
      throw error;
    }

    const userRoleId = roleMap.user;
    const parentRoleId = roleMap.parent;

    // ==========================================
    // 3. LOCK SELURUH ROLE ASSIGNMENT
    // ==========================================

    const assignmentsResult = await client.query(
      `
        SELECT
          ubr.id,
          ubr.role_id,
          ubr.branch_id,
          ubr.is_active,
          r.role_code
        FROM user_branch_roles ubr
        INNER JOIN roles r ON r.id = ubr.role_id
        WHERE ubr.user_id = $1
        ORDER BY ubr.created_at DESC
        FOR UPDATE OF ubr
      `,
      [userId],
    );

    const activeAssignments = assignmentsResult.rows.filter(
      (item) => item.is_active === true,
    );

    // Jangan mengubah role lain yang mungkin masih digunakan.
    const unexpectedActiveRoles = activeAssignments.filter(
      (item) => item.role_code !== "parent",
    );

    if (unexpectedActiveRoles.length > 0) {
      const error = new Error(
        "Akun memiliki role aktif lain. Periksa assignment role sebelum mengembalikan akun menjadi User.",
      );
      error.statusCode = 409;
      throw error;
    }

    const activeParentAssignments = activeAssignments.filter(
      (item) => item.role_code === "parent",
    );

    if (activeParentAssignments.length === 0) {
      const error = new Error(
        "Role Parent tidak aktif. Proses pengembalian tidak dapat dilanjutkan.",
      );
      error.statusCode = 409;
      throw error;
    }

    // ==========================================
    // 4. NONAKTIFKAN ROLE PARENT
    // ==========================================

    const parentRoleUpdate = await client.query(
      `
        UPDATE user_branch_roles
        SET is_active = FALSE
        WHERE user_id = $1
          AND role_id = $2
          AND is_active = TRUE
        RETURNING id, branch_id
      `,
      [userId, parentRoleId],
    );

    for (const assignment of parentRoleUpdate.rows) {
      await createAuditLog(
        {
          userId: assignedBy,
          branchId: access.isSuperAdmin ? null : access.activeBranchId,
          action: "UPDATE",
          entityTable: "user_branch_roles",
          entityId: assignment.id,
          oldValues: {
            userId,
            roleCode: "parent",
            branchId: assignment.branch_id,
            isActive: true,
          },
          newValues: {
            userId,
            roleCode: "parent",
            branchId: assignment.branch_id,
            isActive: false,
          },
          ipAddress,
          userAgent,
        },
        client,
      );
    }

    // ==========================================
    // 5. AKTIFKAN KEMBALI ROLE USER
    // ==========================================

    const existingUserAssignments = assignmentsResult.rows.filter(
      (item) => item.role_code === "user" && item.branch_id === null,
    );

    let userAssignmentId;

    if (existingUserAssignments.length > 0) {
      const selectedUserAssignment = existingUserAssignments[0];

      userAssignmentId = selectedUserAssignment.id;

      await client.query(
        `
          UPDATE user_branch_roles
          SET
            is_active = TRUE,
            assigned_by = $2
          WHERE id = $1
        `,
        [userAssignmentId, assignedBy],
      );

      await createAuditLog(
        {
          userId: assignedBy,
          branchId: access.isSuperAdmin ? null : access.activeBranchId,
          action: "UPDATE",
          entityTable: "user_branch_roles",
          entityId: userAssignmentId,
          oldValues: {
            userId,
            roleCode: "user",
            branchId: null,
            isActive: selectedUserAssignment.is_active,
          },
          newValues: {
            userId,
            roleCode: "user",
            branchId: null,
            isActive: true,
          },
          ipAddress,
          userAgent,
        },
        client,
      );

      // Nonaktifkan assignment User duplikat jika ditemukan.
      const duplicateUserIds = existingUserAssignments
        .slice(1)
        .filter((item) => item.is_active)
        .map((item) => item.id);

      if (duplicateUserIds.length > 0) {
        await client.query(
          `
            UPDATE user_branch_roles
            SET is_active = FALSE
            WHERE id = ANY($1::uuid[])
          `,
          [duplicateUserIds],
        );
      }
    } else {
      const insertedUser = await client.query(
        `
          INSERT INTO user_branch_roles (
            user_id,
            role_id,
            branch_id,
            assigned_by,
            is_active
          )
          VALUES ($1, $2, NULL, $3, TRUE)
          RETURNING id
        `,
        [userId, userRoleId, assignedBy],
      );

      userAssignmentId = insertedUser.rows[0].id;

      await createAuditLog(
        {
          userId: assignedBy,
          branchId: access.isSuperAdmin ? null : access.activeBranchId,
          action: "CREATE",
          entityTable: "user_branch_roles",
          entityId: userAssignmentId,
          oldValues: null,
          newValues: {
            userId,
            roleCode: "user",
            branchId: null,
            isActive: true,
          },
          ipAddress,
          userAgent,
        },
        client,
      );
    }

    // ==========================================
    // 6. HAPUS SELURUH RELASI DENGAN SISWA
    // ==========================================

    const deletedRelationships = await client.query(
      `
        DELETE FROM student_parents
        WHERE parent_id = $1
        RETURNING
          student_id,
          parent_id,
          relationship_label,
          is_primary_contact,
          can_view_progress,
          can_receive_notifications
      `,
      [parentId],
    );

    if (deletedRelationships.rowCount > 0) {
      await createAuditLog(
        {
          userId: assignedBy,
          branchId: access.isSuperAdmin ? null : access.activeBranchId,
          action: "DELETE",
          entityTable: "student_parents",
          entityId: null,
          oldValues: {
            parentId,
            relationships: deletedRelationships.rows,
          },
          newValues: null,
          ipAddress,
          userAgent,
        },
        client,
      );
    }

    // ==========================================
    // 7. HAPUS PROFIL PARENT
    // ==========================================

    const deletedParent = await client.query(
      `
        DELETE FROM parents
        WHERE id = $1
        RETURNING *
      `,
      [parentId],
    );

    if (deletedParent.rowCount === 0) {
      const error = new Error("Profil orang tua gagal dihapus.");
      error.statusCode = 409;
      throw error;
    }

    await createAuditLog(
      {
        userId: assignedBy,
        branchId: access.isSuperAdmin ? null : access.activeBranchId,
        action: "DELETE",
        entityTable: "parents",
        entityId: parentId,
        oldValues: deletedParent.rows[0],
        newValues: null,
        ipAddress,
        userAgent,
      },
      client,
    );

    // ==========================================
    // 8. COMMIT
    // ==========================================

    await client.query("COMMIT");

    return {
      parentId,
      userId,
      userName: parent.full_name,
      userIsActive: parent.user_is_active,
      removedRelationships: deletedRelationships.rowCount,
      restoredRole: "user",
      message: "Akun berhasil dikembalikan menjadi User.",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// GET PARENT DASHBOARD BY LOGGED-IN USER
// ==========================================

export async function getParentDashboardByUserId(userId) {
  const result = await pool.query(
    `
      SELECT
        p.id AS "parentId",
        p.user_id AS "userId",
        p.full_name AS "fullName",
        p.relationship_label AS "relationshipLabel",

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

      FROM parents p

      LEFT JOIN student_parents sp
        ON sp.parent_id = p.id

      LEFT JOIN students s
        ON s.id = sp.student_id
        AND s.deleted_at IS NULL

      WHERE p.user_id = $1

      GROUP BY
        p.id,
        p.user_id,
        p.full_name,
        p.relationship_label

      LIMIT 1
    `,
    [userId],
  );

  if (result.rowCount === 0) {
    return null;
  }

  const parent = result.rows[0];

  return {
    parentId: parent.parentId,
    userId: parent.userId,
    fullName: parent.fullName,
    relationshipLabel: parent.relationshipLabel,

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

      INNER JOIN parents p
        ON p.id = psc.parent_id

      LEFT JOIN branches b
        ON b.id = psc.branch_id

      LEFT JOIN students s
        ON s.id = psc.student_id
        AND s.deleted_at IS NULL

      WHERE p.user_id = $1

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

  // Admin Cabang hanya melihat pengajuan cabang aktif.
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

        p.full_name AS "parentName",
        p.phone AS "parentPhone",
        p.whatsapp AS "parentWhatsapp",
        p.email AS "parentEmail",

        b.branch_name AS "branchName",

        requested_s.full_name AS "existingStudentName",

        approved_s.full_name AS "approvedStudentName",
        approved_s.student_code AS "studentCode"

      FROM parent_student_claims psc

      INNER JOIN parents p
        ON p.id = psc.parent_id

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

  // Pastikan unit masih aktif.
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

  // Hanya tampilkan ID dan nama siswa.
  // Data pribadi lainnya tidak dikirim ke Parent.
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

    // 1. Ambil dan kunci profil Parent.
    const parentResult = await client.query(
      `
        SELECT id
        FROM parents
        WHERE user_id = $1
        FOR UPDATE
      `,
      [userId],
    );

    if (parentResult.rowCount === 0) {
      const error = new Error("Profil orang tua tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    const parentId = parentResult.rows[0].id;

    // 2. Pastikan unit aktif.
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

    // 3. Normalisasi nomor WhatsApp.
    const whatsappNumber = data.whatsappNumber.replace(/[^\d+]/g, "");

    if (whatsappNumber.length < 8) {
      const error = new Error("Nomor WhatsApp tidak valid.");
      error.statusCode = 400;
      throw error;
    }

    // 4. Tentukan jenis pengajuan.
    const isExistingStudent = Boolean(data.requestedStudentId);

    let studentName = null;
    let birthDate = null;
    let requestedStudentId = null;

    if (isExistingStudent) {
      // --------------------------------------
      // SISWA SUDAH TERDAFTAR
      // --------------------------------------

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
      // --------------------------------------
      // SISWA BARU
      // --------------------------------------

      studentName = data.studentName.trim();
      birthDate = data.birthDate;
    }

    // 5. Buat kode pengajuan.
    const claimCode = `ILY-${randomBytes(4).toString("hex").toUpperCase()}`;

    // 6. Simpan pengajuan.
    // student_id tetap NULL sampai admin menyetujui.
    const claimResult = await client.query(
      `
        INSERT INTO parent_student_claims (
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
        parentId,
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

    // --------------------------------------
    // 1. AMBIL DAN KUNCI KLAIM
    // --------------------------------------

    const claimResult = await client.query(
      `
        SELECT
          id,
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

    if (!claim.branch_id) {
      const error = new Error("Cabang pengajuan tidak valid.");
      error.statusCode = 400;
      throw error;
    }

    // --------------------------------------
    // 2. VALIDASI CAKUPAN CABANG ADMIN
    // --------------------------------------

    if (!access.isSuperAdmin && claim.branch_id !== access.activeBranchId) {
      const error = new Error("Pengajuan berada di luar cabang aktif Anda.");
      error.statusCode = 403;
      throw error;
    }

    // Pastikan cabang masih tersedia.
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

    // --------------------------------------
    // 3. KUNCI PROFIL PARENT
    // --------------------------------------

    const parentResult = await client.query(
      `
        SELECT id
        FROM parents
        WHERE id = $1
        FOR UPDATE
      `,
      [claim.parent_id],
    );

    if (parentResult.rowCount === 0) {
      const error = new Error("Profil orang tua tidak ditemukan.");
      error.statusCode = 404;
      throw error;
    }

    // --------------------------------------
    // 4. TENTUKAN SISWA
    // --------------------------------------

    let student;

    if (claim.requested_student_id) {
      // ====================================
      // SISWA SUDAH TERDAFTAR
      // ====================================

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
      // ====================================
      // SISWA BARU
      // ====================================

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

    // --------------------------------------
    // 5. HUBUNGKAN PARENT DENGAN SISWA
    // --------------------------------------

    await client.query(
      `
        INSERT INTO student_parents (
          student_id,
          parent_id,
          relationship_label
        )
        VALUES ($1, $2, $3)

        ON CONFLICT (student_id, parent_id)
        DO NOTHING
      `,
      [student.id, claim.parent_id, claim.relationship_label],
    );

    // --------------------------------------
    // 6. UPDATE STATUS KLAIM
    // --------------------------------------

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

    // --------------------------------------
    // 7. AUDIT LOG
    // --------------------------------------

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
          parentId: claim.parent_id,
          branchId: claim.branch_id,
        },
        ipAddress,
        userAgent,
      },
      client,
    );

    // --------------------------------------
    // 8. COMMIT
    // --------------------------------------

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

    // --------------------------------------
    // 1. AMBIL DAN KUNCI KLAIM
    // --------------------------------------

    const claimResult = await client.query(
      `
        SELECT
          id,
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

    // --------------------------------------
    // 2. VALIDASI CAKUPAN CABANG
    // --------------------------------------

    if (!access.isSuperAdmin && claim.branch_id !== access.activeBranchId) {
      const error = new Error("Pengajuan berada di luar cabang aktif Anda.");
      error.statusCode = 403;
      throw error;
    }

    // --------------------------------------
    // 3. PASTIKAN CABANG TERSEDIA
    // --------------------------------------

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

    // --------------------------------------
    // 4. UPDATE STATUS KLAIM
    // --------------------------------------

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

    // --------------------------------------
    // 5. AUDIT LOG
    // --------------------------------------

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
          parentId: claim.parent_id,
          branchId: claim.branch_id,
          reviewNotes: notes || null,
        },
        ipAddress,
        userAgent,
      },
      client,
    );

    // --------------------------------------
    // 6. COMMIT
    // --------------------------------------

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
