import { pool } from "../config/database.js";

// ==========================================
// GET ALL SUBJECTS
// ==========================================

export async function getAllSubjects({
  search = "",
  isActive,
  page = 1,
  limit = 20,
}) {
  const offset = (page - 1) * limit;
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(subject_code ILIKE $${values.length}
        OR subject_name ILIKE $${values.length})`,
    );
  }

  if (typeof isActive === "boolean") {
    values.push(isActive);
    conditions.push(`is_active = $${values.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM subjects
     ${whereClause}`,
    values,
  );

  const dataValues = [...values, limit, offset];

  const result = await pool.query(
    `SELECT
       id,
       subject_code AS "subjectCode",
       subject_name AS "subjectName",
       description,
       is_active AS "isActive",
       created_at AS "createdAt"
     FROM subjects
     ${whereClause}
     ORDER BY subject_name ASC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    dataValues,
  );

  const total = countResult.rows[0].total;

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ==========================================
// GET SUBJECT BY ID
// ==========================================

export async function getSubjectById(id) {
  const result = await pool.query(
    `SELECT
       id,
       subject_code AS "subjectCode",
       subject_name AS "subjectName",
       description,
       is_active AS "isActive",
       created_at AS "createdAt"
     FROM subjects
     WHERE id = $1`,
    [id],
  );

  return result.rows[0] || null;
}

// ==========================================
// CREATE SUBJECT
// ==========================================

export async function createSubject(data) {
  const result = await pool.query(
    `INSERT INTO subjects (
       subject_code,
       subject_name,
       description
     )
     VALUES ($1, $2, $3)
     RETURNING
       id,
       subject_code AS "subjectCode",
       subject_name AS "subjectName",
       description,
       is_active AS "isActive",
       created_at AS "createdAt"`,
    [data.subjectCode, data.subjectName, data.description ?? null],
  );

  return result.rows[0];
}

// ==========================================
// UPDATE SUBJECT
// ==========================================

export async function updateSubject(id, data) {
  const fields = [];
  const values = [];

  const allowedFields = {
    subjectCode: "subject_code",
    subjectName: "subject_name",
    description: "description",
  };

  for (const [key, column] of Object.entries(allowedFields)) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      values.push(data[key]);
      fields.push(`${column} = $${values.length}`);
    }
  }

  if (!fields.length) {
    return getSubjectById(id);
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE subjects
     SET ${fields.join(", ")}
     WHERE id = $${values.length}
     RETURNING
       id,
       subject_code AS "subjectCode",
       subject_name AS "subjectName",
       description,
       is_active AS "isActive",
       created_at AS "createdAt"`,
    values,
  );

  return result.rows[0] || null;
}

// ==========================================
// UPDATE SUBJECT STATUS
// ==========================================

export async function updateSubjectStatus(id, isActive) {
  const result = await pool.query(
    `UPDATE subjects
     SET is_active = $1
     WHERE id = $2
     RETURNING
       id,
       subject_code AS "subjectCode",
       subject_name AS "subjectName",
       description,
       is_active AS "isActive",
       created_at AS "createdAt"`,
    [isActive, id],
  );

  return result.rows[0] || null;
}

// ==========================================
// GET SUBJECTS BY PROGRAM
// ==========================================

export async function getSubjectsByProgram(programId) {
  const programResult = await pool.query(
    `SELECT
       id,
       program_code AS "programCode",
       program_name AS "programName"
     FROM programs
     WHERE id = $1`,
    [programId],
  );

  if (!programResult.rows.length) {
    return null;
  }

  const subjectsResult = await pool.query(
    `SELECT
       s.id,
       s.subject_code AS "subjectCode",
       s.subject_name AS "subjectName",
       s.description,
       s.is_active AS "isActive",
       ps.is_required AS "isRequired"
     FROM program_subjects ps
     INNER JOIN subjects s
       ON s.id = ps.subject_id
     WHERE ps.program_id = $1
     ORDER BY s.subject_name ASC`,
    [programId],
  );

  return {
    program: programResult.rows[0],
    subjects: subjectsResult.rows,
  };
}

// ==========================================
// UPDATE PROGRAM SUBJECTS
// ==========================================

export async function updateProgramSubjects(programId, subjects) {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // --------------------------------------
    // CHECK PROGRAM
    // --------------------------------------

    const programResult = await client.query(
      `SELECT id
       FROM programs
       WHERE id = $1
       FOR UPDATE`,
      [programId],
    );

    if (!programResult.rows.length) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return null;
    }

    // --------------------------------------
    // CHECK DUPLICATE SUBJECT
    // --------------------------------------

    const subjectIds = subjects.map((item) => item.subjectId);

    const uniqueSubjectIds = new Set(subjectIds);

    if (subjectIds.length !== uniqueSubjectIds.size) {
      const error = new Error(
        "Mata pelajaran yang sama tidak boleh dipilih lebih dari satu kali.",
      );

      error.statusCode = 400;
      throw error;
    }

    // --------------------------------------
    // VALIDATE SUBJECTS
    // --------------------------------------

    if (subjectIds.length > 0) {
      const validSubjects = await client.query(
        `SELECT id
         FROM subjects
         WHERE id = ANY($1::uuid[])
           AND is_active = true`,
        [subjectIds],
      );

      if (validSubjects.rows.length !== subjectIds.length) {
        const error = new Error(
          "Terdapat mata pelajaran yang tidak ditemukan atau tidak aktif.",
        );

        error.statusCode = 400;
        throw error;
      }
    }

    // --------------------------------------
    // DELETE OLD RELATIONS
    // --------------------------------------

    await client.query(
      `DELETE FROM program_subjects
       WHERE program_id = $1`,
      [programId],
    );

    // --------------------------------------
    // INSERT NEW RELATIONS
    // --------------------------------------

    for (const subject of subjects) {
      await client.query(
        `INSERT INTO program_subjects (
           program_id,
           subject_id,
           is_required
         )
         VALUES ($1, $2, $3)`,
        [programId, subject.subjectId, subject.isRequired],
      );
    }

    // --------------------------------------
    // COMMIT
    // --------------------------------------

    await client.query("COMMIT");
    transactionStarted = false;

    return await getSubjectsByProgram(programId);
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    throw error;
  } finally {
    client.release();
  }
}
