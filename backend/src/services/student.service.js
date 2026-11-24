import { pool } from "../config/database.js";
import { createAuditLog } from "./auditLog.service.js";

// ==========================================
// STUDENT FIELD MAPPING
// ==========================================

const studentFields = {
  studentCode: "student_code",
  primaryBranchId: "primary_branch_id",
  fullName: "full_name",
  nickname: "nickname",
  gender: "gender",
  birthDate: "birth_date",
  schoolName: "school_name",
  schoolGrade: "school_grade",
  schoolDismissalTime: "school_dismissal_time",
  address: "address",
  city: "city",
  province: "province",
  studentPhone: "student_phone",
  notes: "notes",
  status: "status",
  createdBy: "created_by",
};

// ==========================================
// STUDENT SELECT QUERY
// ==========================================

const studentSelect = `
  SELECT
    s.id,
    s.student_code AS "studentCode",
    s.primary_branch_id AS "primaryBranchId",
    b.branch_name AS "primaryBranchName",
    s.full_name AS "fullName",
    s.nickname,
    s.gender,
    s.birth_date AS "birthDate",
    s.school_name AS "schoolName",
    s.school_grade AS "schoolGrade",
    s.school_dismissal_time AS "schoolDismissalTime",
    s.address,
    s.city,
    s.province,
    s.student_phone AS "studentPhone",
    s.parent_phone AS "parentPhone",
    s.notes,
    s.status,
    s.created_at AS "createdAt",
    s.updated_at AS "updatedAt"
  FROM students s
  LEFT JOIN branches b
    ON b.id = s.primary_branch_id
`;

// ==========================================
// GET ALL STUDENTS
// ==========================================

export async function getAllStudents({
  search = "",
  status,
  primaryBranchId,
  page = 1,
  limit = 10,
} = {}) {
  const conditions = ["s.deleted_at IS NULL"];
  const values = [];
  let index = 1;

  if (search) {
    conditions.push(`
      (
        s.student_code ILIKE $${index}
        OR s.full_name ILIKE $${index}
        OR s.nickname ILIKE $${index}
        OR s.school_name ILIKE $${index}
      )
    `);

    values.push(`%${search}%`);
    index++;
  }

  if (status) {
    conditions.push(`s.status = $${index}`);
    values.push(status);
    index++;
  }

  if (primaryBranchId) {
    conditions.push(`s.primary_branch_id = $${index}`);
    values.push(primaryBranchId);
    index++;
  }

  const whereClause = `
    WHERE ${conditions.join(" AND ")}
  `;

  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)
      FROM students s
      ${whereClause}
    `,
    values,
  );

  const dataResult = await pool.query(
    `
      ${studentSelect}
      ${whereClause}
      ORDER BY s.created_at DESC
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
// GET STUDENT BY ID
// ==========================================

export async function getStudentById(id) {
  const result = await pool.query(
    `
      ${studentSelect}
      WHERE s.id = $1
        AND s.deleted_at IS NULL
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
}

// ==========================================
// CREATE STUDENT WITH EXISTING TRANSACTION
// ==========================================

export async function insertStudentWithClient(client, data, auditContext = {}) {
  // Generate ISC code directly from PostgreSQL sequence.
  const sequenceResult = await client.query(`
    SELECT nextval('students_isc_sequence') AS number
  `);

  const sequenceNumber = String(sequenceResult.rows[0].number);

  const studentCode = `ISC-${sequenceNumber.padStart(6, "0")}`;

  // Ignore studentCode supplied by frontend.
  const fields = Object.keys(studentFields).filter(
    (key) => key !== "studentCode" && data[key] !== undefined,
  );

  const columns = ["student_code", ...fields.map((key) => studentFields[key])];

  const values = [studentCode, ...fields.map((key) => data[key])];

  const placeholders = values.map((_, index) => `$${index + 1}`);

  const result = await client.query(
    `
      INSERT INTO students (
        ${columns.join(", ")}
      )
      VALUES (
        ${placeholders.join(", ")}
      )
      RETURNING id
    `,
    values,
  );

  const studentResult = await client.query(
    `
      ${studentSelect}
      WHERE s.id = $1
        AND s.deleted_at IS NULL
      LIMIT 1
    `,
    [result.rows[0].id],
  );

  const student = studentResult.rows[0];

  await createAuditLog(
    {
      userId: auditContext.userId,
      branchId: null,
      action: "STUDENT_CREATED",
      entityTable: "students",
      entityId: student.id,
      oldValues: null,
      newValues: student,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    },
    client,
  );

  return student;
}

// ==========================================
// CREATE STUDENT
// ==========================================

export async function createStudent(data, auditContext = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const student = await insertStudentWithClient(client, data, auditContext);

    await client.query("COMMIT");

    return student;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// UPDATE STUDENT
// ==========================================

export async function updateStudent(id, data, auditContext = {}) {
  const fields = Object.keys(studentFields).filter(
    (key) => data[key] !== undefined,
  );

  if (fields.length === 0) {
    return getStudentById(id);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const lockResult = await client.query(
      `
        SELECT id
        FROM students
        WHERE id = $1
          AND deleted_at IS NULL
        FOR UPDATE
      `,
      [id],
    );

    if (lockResult.rowCount === 0) {
      await client.query("COMMIT");
      return null;
    }

    const oldResult = await client.query(
      `
        ${studentSelect}
        WHERE s.id = $1
          AND s.deleted_at IS NULL
        LIMIT 1
      `,
      [id],
    );

    const oldStudent = oldResult.rows[0];

    const assignments = fields.map(
      (key, index) => `${studentFields[key]} = $${index + 1}`,
    );

    const values = fields.map((key) => data[key]);

    values.push(id);

    await client.query(
      `
        UPDATE students
        SET
          ${assignments.join(", ")},
          updated_at = NOW()
        WHERE id = $${values.length}
          AND deleted_at IS NULL
      `,
      values,
    );

    const newResult = await client.query(
      `
        ${studentSelect}
        WHERE s.id = $1
          AND s.deleted_at IS NULL
        LIMIT 1
      `,
      [id],
    );

    const newStudent = newResult.rows[0];

    await createAuditLog(
      {
        userId: auditContext.userId,
        branchId: null,
        action: "STUDENT_UPDATED",
        entityTable: "students",
        entityId: id,
        oldValues: oldStudent,
        newValues: newStudent,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return newStudent;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// UPDATE STUDENT STATUS
// ==========================================

export async function updateStudentStatus(id, status, auditContext = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const lockResult = await client.query(
      `
        SELECT id
        FROM students
        WHERE id = $1
          AND deleted_at IS NULL
        FOR UPDATE
      `,
      [id],
    );

    if (lockResult.rowCount === 0) {
      await client.query("COMMIT");
      return null;
    }

    const oldResult = await client.query(
      `
        ${studentSelect}
        WHERE s.id = $1
          AND s.deleted_at IS NULL
        LIMIT 1
      `,
      [id],
    );

    const oldStudent = oldResult.rows[0];

    await client.query(
      `
        UPDATE students
        SET
          status = $1,
          updated_at = NOW()
        WHERE id = $2
          AND deleted_at IS NULL
      `,
      [status, id],
    );

    const newResult = await client.query(
      `
        ${studentSelect}
        WHERE s.id = $1
          AND s.deleted_at IS NULL
        LIMIT 1
      `,
      [id],
    );

    const newStudent = newResult.rows[0];

    await createAuditLog(
      {
        userId: auditContext.userId,
        branchId: null,
        action: "STUDENT_STATUS_UPDATED",
        entityTable: "students",
        entityId: id,
        oldValues: {
          status: oldStudent.status,
        },
        newValues: {
          status: newStudent.status,
        },
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return newStudent;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// GET STUDENTS FOR LOGGED-IN TUTOR
// ==========================================

export async function getMyTutorStudents({
  userId,
  search = "",
  page = 1,
  limit = 10,
} = {}) {
  const conditions = [
    "s.deleted_at IS NULL",
    "s.status = 'active'",
    `
      EXISTS (
        SELECT 1
        FROM tutor_profiles tp
        INNER JOIN tutor_branch_assignments tba
          ON tba.tutor_id = tp.id
        WHERE tp.user_id = $1
          AND tba.branch_id = s.primary_branch_id
          AND tba.assigned_from <= CURRENT_DATE
          AND (
            tba.assigned_until IS NULL
            OR tba.assigned_until >= CURRENT_DATE
          )
      )
    `,
  ];

  const values = [userId];
  let index = 2;

  if (search) {
    conditions.push(`
      (
        s.student_code ILIKE $${index}
        OR s.full_name ILIKE $${index}
        OR s.nickname ILIKE $${index}
        OR s.school_name ILIKE $${index}
      )
    `);

    values.push(`%${search}%`);
    index++;
  }

  const whereClause = `
    WHERE ${conditions.join(" AND ")}
  `;

  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)
      FROM students s
      ${whereClause}
    `,
    values,
  );

  const dataResult = await pool.query(
    `
      ${studentSelect}
      ${whereClause}
      ORDER BY s.full_name ASC
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
// GET STUDENT DETAIL FOR LOGGED-IN TUTOR
// ==========================================

export async function getMyTutorStudentById(userId, studentId) {
  const result = await pool.query(
    `
      ${studentSelect}
      WHERE s.id = $1
        AND s.deleted_at IS NULL
        AND s.status = 'active'
        AND EXISTS (
          SELECT 1
          FROM tutor_profiles tp
          INNER JOIN tutor_branch_assignments tba
            ON tba.tutor_id = tp.id
          WHERE tp.user_id = $2
            AND tba.branch_id = s.primary_branch_id
            AND tba.assigned_from <= CURRENT_DATE
            AND (
              tba.assigned_until IS NULL
              OR tba.assigned_until >= CURRENT_DATE
            )
        )
      LIMIT 1
    `,
    [studentId, userId],
  );

  return result.rows[0] || null;
}
