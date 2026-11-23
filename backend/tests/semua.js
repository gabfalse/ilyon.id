import { pool } from "../config/database.js";
import { createAuditLog } from "./auditLog.service.js";

// ==========================================
// ENROLLMENT FIELD MAPPING
// ==========================================

const enrollmentFields = {
  startDate: "start_date",
  endDate: "end_date",
  agreedPrice: "agreed_price",
  billingPeriod: "billing_period",
  notes: "notes",
};

// ==========================================
// ENROLLMENT SELECT QUERY
// ==========================================

const enrollmentSelect = `
  SELECT
    e.id,

    e.student_id AS "studentId",
    s.student_code AS "studentCode",
    s.full_name AS "studentName",

    e.branch_id AS "branchId",
    b.branch_name AS "branchName",

    e.program_id AS "programId",
    p.program_code AS "programCode",
    p.program_name AS "programName",

    e.offering_id AS "offeringId",
    po.offering_code AS "offeringCode",
    po.offering_name AS "offeringName",
    po.delivery_type AS "deliveryType",
    po.learning_method AS "learningMethod",
    po.pricing_unit AS "pricingUnit",

    TO_CHAR(e.start_date, 'YYYY-MM-DD') AS "startDate",
    TO_CHAR(e.end_date, 'YYYY-MM-DD') AS "endDate",

    e.status,
    e.agreed_price AS "agreedPrice",
    e.billing_period AS "billingPeriod",
    e.notes,

    e.created_by AS "createdBy",
    e.created_at AS "createdAt",
    e.updated_at AS "updatedAt"

  FROM student_enrollments e

  INNER JOIN students s
    ON s.id = e.student_id

  INNER JOIN branches b
    ON b.id = e.branch_id

  INNER JOIN programs p
    ON p.id = e.program_id

  INNER JOIN program_offerings po
    ON po.id = e.offering_id
   AND po.program_id = e.program_id
`;

// ==========================================
// GET ENROLLMENT WITH TRANSACTION CLIENT
// ==========================================

async function getEnrollmentByIdWithClient(client, id) {
  const result = await client.query(
    `
      ${enrollmentSelect}
      WHERE e.id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
}

// ==========================================
// GET ALL ENROLLMENTS
// ==========================================

export async function getAllEnrollments({
  search = "",
  status,
  branchId,
  studentId,
  programId,
  offeringId,
  page = 1,
  limit = 10,
} = {}) {
  const conditions = [];
  const values = [];
  let index = 1;

  // ----------------------------------------
  // SEARCH
  // ----------------------------------------

  if (search) {
    conditions.push(`
      (
        s.student_code ILIKE $${index}
        OR s.full_name ILIKE $${index}
        OR s.nickname ILIKE $${index}
        OR p.program_name ILIKE $${index}
        OR p.program_code ILIKE $${index}
        OR po.offering_name ILIKE $${index}
        OR po.offering_code ILIKE $${index}
      )
    `);

    values.push(`%${search}%`);
    index++;
  }

  // ----------------------------------------
  // FILTER STATUS
  // ----------------------------------------

  if (status) {
    conditions.push(`e.status = $${index}`);
    values.push(status);
    index++;
  }

  // ----------------------------------------
  // FILTER BRANCH
  // ----------------------------------------

  if (branchId) {
    conditions.push(`e.branch_id = $${index}`);
    values.push(branchId);
    index++;
  }

  // ----------------------------------------
  // FILTER STUDENT
  // ----------------------------------------

  if (studentId) {
    conditions.push(`e.student_id = $${index}`);
    values.push(studentId);
    index++;
  }

  // ----------------------------------------
  // FILTER PROGRAM
  // ----------------------------------------

  if (programId) {
    conditions.push(`e.program_id = $${index}`);
    values.push(programId);
    index++;
  }

  // ----------------------------------------
  // FILTER OFFERING
  // ----------------------------------------

  if (offeringId) {
    conditions.push(`e.offering_id = $${index}`);
    values.push(offeringId);
    index++;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const offset = (page - 1) * limit;

  // ----------------------------------------
  // COUNT
  // ----------------------------------------

  const countResult = await pool.query(
    `
      SELECT COUNT(*)

      FROM student_enrollments e

      INNER JOIN students s
        ON s.id = e.student_id

      INNER JOIN programs p
        ON p.id = e.program_id

      INNER JOIN program_offerings po
        ON po.id = e.offering_id
       AND po.program_id = e.program_id

      ${whereClause}
    `,
    values,
  );

  // ----------------------------------------
  // DATA
  // ----------------------------------------

  const dataResult = await pool.query(
    `
      ${enrollmentSelect}
      ${whereClause}

      ORDER BY e.created_at DESC

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
// GET ENROLLMENT BY ID
// ==========================================

export async function getEnrollmentById(id) {
  const result = await pool.query(
    `
      ${enrollmentSelect}
      WHERE e.id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
}

// ==========================================
// VALIDATE ENROLLMENT REFERENCES
// ==========================================

async function validateEnrollmentReferences(
  client,
  studentId,
  programId,
  offeringId,
) {
  // ----------------------------------------
  // VALIDATE STUDENT
  // ----------------------------------------

  const studentResult = await client.query(
    `
      SELECT
        id,
        primary_branch_id,
        status
      FROM students
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      FOR SHARE
    `,
    [studentId],
  );

  const student = studentResult.rows[0];

  if (!student) {
    const error = new Error("Siswa tidak ditemukan atau sudah dihapus.");

    error.statusCode = 404;
    throw error;
  }

  // ----------------------------------------
  // VALIDATE PROGRAM
  // ----------------------------------------

  const programResult = await client.query(
    `
      SELECT
        id,
        program_code,
        program_name,
        is_active
      FROM programs
      WHERE id = $1
      LIMIT 1
      FOR SHARE
    `,
    [programId],
  );

  const program = programResult.rows[0];

  if (!program) {
    const error = new Error("Program tidak ditemukan.");

    error.statusCode = 404;
    throw error;
  }

  if (!program.is_active) {
    const error = new Error("Program yang dipilih sedang tidak aktif.");

    error.statusCode = 400;
    throw error;
  }

  // ----------------------------------------
  // VALIDATE OFFERING
  // ----------------------------------------

  const offeringResult = await client.query(
    `
      SELECT
        id,
        program_id,
        offering_code,
        offering_name,
        delivery_type,
        learning_method,
        billing_period,
        price,
        pricing_unit,
        meeting_quota,
        is_unlimited,
        min_students,
        max_students,
        session_duration_minutes,
        is_flexible_duration,
        is_active
      FROM program_offerings
      WHERE id = $1
      LIMIT 1
      FOR SHARE
    `,
    [offeringId],
  );

  const offering = offeringResult.rows[0];

  if (!offering) {
    const error = new Error("Offering tidak ditemukan.");

    error.statusCode = 404;
    throw error;
  }

  if (offering.program_id !== program.id) {
    const error = new Error(
      "Offering tidak termasuk dalam Program yang dipilih.",
    );

    error.statusCode = 400;
    throw error;
  }

  if (!offering.is_active) {
    const error = new Error("Offering yang dipilih sedang tidak aktif.");

    error.statusCode = 400;
    throw error;
  }

  return {
    student,
    program,
    offering,
    branchId: student.primary_branch_id,
  };
}

// ==========================================
// CREATE ENROLLMENT
// ==========================================

export async function createEnrollment(data, auditContext = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ----------------------------------------
    // VALIDATE RELATIONSHIPS
    // ----------------------------------------

    const { student, program, offering, branchId } =
      await validateEnrollmentReferences(
        client,
        data.studentId,
        data.programId,
        data.offeringId,
      );

    // ----------------------------------------
    // VALIDATE DATES
    // ----------------------------------------

    const dateResult = await client.query(
      `
        SELECT CURRENT_DATE::text AS today
      `,
    );

    const effectiveStartDate = data.startDate || dateResult.rows[0].today;

    const effectiveEndDate = data.endDate ?? null;

    if (effectiveEndDate !== null && effectiveEndDate < effectiveStartDate) {
      const error = new Error(
        "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      );

      error.statusCode = 400;
      throw error;
    }

    // ----------------------------------------
    // INITIAL PRICE AND BILLING SNAPSHOT
    // ----------------------------------------

    const agreedPrice = data.agreedPrice ?? offering.price;

    const billingPeriod = data.billingPeriod ?? offering.billing_period;

    // ----------------------------------------
    // INSERT ENROLLMENT
    // ----------------------------------------

    const result = await client.query(
      `
        INSERT INTO student_enrollments (
          student_id,
          branch_id,
          program_id,
          offering_id,
          start_date,
          end_date,
          status,
          agreed_price,
          billing_period,
          notes,
          created_by
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          COALESCE($5::date, CURRENT_DATE),
          $6,
          $7,
          $8,
          $9,
          $10,
          $11
        )
        RETURNING id
      `,
      [
        student.id,
        branchId,
        program.id,
        offering.id,
        data.startDate ?? null,
        effectiveEndDate,
        data.status || "active",
        agreedPrice,
        billingPeriod,
        data.notes ?? null,
        auditContext.userId ?? null,
      ],
    );

    const enrollmentId = result.rows[0].id;

    // ----------------------------------------
    // GET CREATED ENROLLMENT
    // ----------------------------------------

    const enrollment = await getEnrollmentByIdWithClient(client, enrollmentId);

    // ----------------------------------------
    // AUDIT LOG
    // ----------------------------------------

    await createAuditLog(
      {
        userId: auditContext.userId,
        branchId,
        action: "ENROLLMENT_CREATED",
        entityTable: "student_enrollments",
        entityId: enrollmentId,
        oldValues: null,
        newValues: enrollment,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return enrollment;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// UPDATE ENROLLMENT
// ==========================================

export async function updateEnrollment(id, data, auditContext = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ----------------------------------------
    // LOCK ENROLLMENT
    // ----------------------------------------

    const lockResult = await client.query(
      `
        SELECT id
        FROM student_enrollments
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [id],
    );

    if (lockResult.rowCount === 0) {
      await client.query("COMMIT");
      return null;
    }

    // ----------------------------------------
    // GET OLD DATA
    // ----------------------------------------

    const oldEnrollment = await getEnrollmentByIdWithClient(client, id);

    // ----------------------------------------
    // VALIDATE MERGED DATES
    // ----------------------------------------

    const nextStartDate =
      data.startDate !== undefined ? data.startDate : oldEnrollment.startDate;

    const nextEndDate =
      data.endDate !== undefined ? data.endDate : oldEnrollment.endDate;

    if (nextEndDate !== null && nextEndDate < nextStartDate) {
      const error = new Error(
        "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      );

      error.statusCode = 400;
      throw error;
    }

    // ----------------------------------------
    // UPDATE FIELDS
    // ----------------------------------------

    const fields = Object.keys(enrollmentFields).filter(
      (key) => data[key] !== undefined,
    );

    if (fields.length === 0) {
      await client.query("COMMIT");
      return oldEnrollment;
    }

    const assignments = fields.map(
      (key, index) => `${enrollmentFields[key]} = $${index + 1}`,
    );

    const values = fields.map((key) => data[key]);

    values.push(id);

    await client.query(
      `
        UPDATE student_enrollments
        SET
          ${assignments.join(", ")},
          updated_at = NOW()
        WHERE id = $${values.length}
      `,
      values,
    );

    // ----------------------------------------
    // GET UPDATED DATA
    // ----------------------------------------

    const newEnrollment = await getEnrollmentByIdWithClient(client, id);

    // ----------------------------------------
    // AUDIT LOG
    // ----------------------------------------

    await createAuditLog(
      {
        userId: auditContext.userId,
        branchId: oldEnrollment.branchId,
        action: "ENROLLMENT_UPDATED",
        entityTable: "student_enrollments",
        entityId: id,
        oldValues: oldEnrollment,
        newValues: newEnrollment,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return newEnrollment;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// UPDATE ENROLLMENT STATUS
// ==========================================

export async function updateEnrollmentStatus(id, status, auditContext = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ----------------------------------------
    // LOCK ENROLLMENT
    // ----------------------------------------

    const lockResult = await client.query(
      `
        SELECT id
        FROM student_enrollments
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [id],
    );

    if (lockResult.rowCount === 0) {
      await client.query("COMMIT");
      return null;
    }

    // ----------------------------------------
    // GET OLD DATA
    // ----------------------------------------

    const oldEnrollment = await getEnrollmentByIdWithClient(client, id);

    // ----------------------------------------
    // UPDATE STATUS
    // ----------------------------------------

    await client.query(
      `
        UPDATE student_enrollments
        SET
          status = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [status, id],
    );

    // ----------------------------------------
    // GET NEW DATA
    // ----------------------------------------

    const newEnrollment = await getEnrollmentByIdWithClient(client, id);

    // ----------------------------------------
    // AUDIT LOG
    // ----------------------------------------

    await createAuditLog(
      {
        userId: auditContext.userId,
        branchId: oldEnrollment.branchId,
        action: "ENROLLMENT_STATUS_UPDATED",
        entityTable: "student_enrollments",
        entityId: id,
        oldValues: {
          status: oldEnrollment.status,
        },
        newValues: {
          status: newEnrollment.status,
        },
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return newEnrollment;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


import { pool } from "../config/database.js";
import { createAuditLog } from "./auditLog.service.js";

// ==========================================
// ENROLLMENT FIELD MAPPING
// ==========================================

const enrollmentFields = {
  startDate: "start_date",
  endDate: "end_date",
  agreedPrice: "agreed_price",
  billingPeriod: "billing_period",
  notes: "notes",
};

// ==========================================
// ENROLLMENT SELECT QUERY
// ==========================================

const enrollmentSelect = `
  SELECT
    e.id,

    e.student_id AS "studentId",
    s.student_code AS "studentCode",
    s.full_name AS "studentName",

    e.branch_id AS "branchId",
    b.branch_name AS "branchName",

    e.program_id AS "programId",
    p.program_code AS "programCode",
    p.program_name AS "programName",

    e.offering_id AS "offeringId",
    po.offering_code AS "offeringCode",
    po.offering_name AS "offeringName",
    po.delivery_type AS "deliveryType",
    po.learning_method AS "learningMethod",
    po.pricing_unit AS "pricingUnit",

    TO_CHAR(e.start_date, 'YYYY-MM-DD') AS "startDate",
    TO_CHAR(e.end_date, 'YYYY-MM-DD') AS "endDate",

    e.status,
    e.agreed_price AS "agreedPrice",
    e.billing_period AS "billingPeriod",
    e.notes,

    e.created_by AS "createdBy",
    e.created_at AS "createdAt",
    e.updated_at AS "updatedAt"

  FROM student_enrollments e

  INNER JOIN students s
    ON s.id = e.student_id

  INNER JOIN branches b
    ON b.id = e.branch_id

  INNER JOIN programs p
    ON p.id = e.program_id

  INNER JOIN program_offerings po
    ON po.id = e.offering_id
   AND po.program_id = e.program_id
`;

// ==========================================
// GET ENROLLMENT WITH TRANSACTION CLIENT
// ==========================================

async function getEnrollmentByIdWithClient(client, id) {
  const result = await client.query(
    `
      ${enrollmentSelect}
      WHERE e.id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
}

// ==========================================
// GET ALL ENROLLMENTS
// ==========================================

export async function getAllEnrollments({
  search = "",
  status,
  branchId,
  studentId,
  programId,
  offeringId,
  page = 1,
  limit = 10,
} = {}) {
  const conditions = [];
  const values = [];
  let index = 1;

  // ----------------------------------------
  // SEARCH
  // ----------------------------------------

  if (search) {
    conditions.push(`
      (
        s.student_code ILIKE $${index}
        OR s.full_name ILIKE $${index}
        OR s.nickname ILIKE $${index}
        OR p.program_name ILIKE $${index}
        OR p.program_code ILIKE $${index}
        OR po.offering_name ILIKE $${index}
        OR po.offering_code ILIKE $${index}
      )
    `);

    values.push(`%${search}%`);
    index++;
  }

  // ----------------------------------------
  // FILTER STATUS
  // ----------------------------------------

  if (status) {
    conditions.push(`e.status = $${index}`);
    values.push(status);
    index++;
  }

  // ----------------------------------------
  // FILTER BRANCH
  // ----------------------------------------

  if (branchId) {
    conditions.push(`e.branch_id = $${index}`);
    values.push(branchId);
    index++;
  }

  // ----------------------------------------
  // FILTER STUDENT
  // ----------------------------------------

  if (studentId) {
    conditions.push(`e.student_id = $${index}`);
    values.push(studentId);
    index++;
  }

  // ----------------------------------------
  // FILTER PROGRAM
  // ----------------------------------------

  if (programId) {
    conditions.push(`e.program_id = $${index}`);
    values.push(programId);
    index++;
  }

  // ----------------------------------------
  // FILTER OFFERING
  // ----------------------------------------

  if (offeringId) {
    conditions.push(`e.offering_id = $${index}`);
    values.push(offeringId);
    index++;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const offset = (page - 1) * limit;

  // ----------------------------------------
  // COUNT
  // ----------------------------------------

  const countResult = await pool.query(
    `
      SELECT COUNT(*)

      FROM student_enrollments e

      INNER JOIN students s
        ON s.id = e.student_id

      INNER JOIN programs p
        ON p.id = e.program_id

      INNER JOIN program_offerings po
        ON po.id = e.offering_id
       AND po.program_id = e.program_id

      ${whereClause}
    `,
    values,
  );

  // ----------------------------------------
  // DATA
  // ----------------------------------------

  const dataResult = await pool.query(
    `
      ${enrollmentSelect}
      ${whereClause}

      ORDER BY e.created_at DESC

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
// GET ENROLLMENT BY ID
// ==========================================

export async function getEnrollmentById(id) {
  const result = await pool.query(
    `
      ${enrollmentSelect}
      WHERE e.id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
}

// ==========================================
// VALIDATE ENROLLMENT REFERENCES
// ==========================================

async function validateEnrollmentReferences(
  client,
  studentId,
  programId,
  offeringId,
) {
  // ----------------------------------------
  // VALIDATE STUDENT
  // ----------------------------------------

  const studentResult = await client.query(
    `
      SELECT
        id,
        primary_branch_id,
        status
      FROM students
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      FOR SHARE
    `,
    [studentId],
  );

  const student = studentResult.rows[0];

  if (!student) {
    const error = new Error("Siswa tidak ditemukan atau sudah dihapus.");

    error.statusCode = 404;
    throw error;
  }

  // ----------------------------------------
  // VALIDATE PROGRAM
  // ----------------------------------------

  const programResult = await client.query(
    `
      SELECT
        id,
        program_code,
        program_name,
        is_active
      FROM programs
      WHERE id = $1
      LIMIT 1
      FOR SHARE
    `,
    [programId],
  );

  const program = programResult.rows[0];

  if (!program) {
    const error = new Error("Program tidak ditemukan.");

    error.statusCode = 404;
    throw error;
  }

  if (!program.is_active) {
    const error = new Error("Program yang dipilih sedang tidak aktif.");

    error.statusCode = 400;
    throw error;
  }

  // ----------------------------------------
  // VALIDATE OFFERING
  // ----------------------------------------

  const offeringResult = await client.query(
    `
      SELECT
        id,
        program_id,
        offering_code,
        offering_name,
        delivery_type,
        learning_method,
        billing_period,
        price,
        pricing_unit,
        meeting_quota,
        is_unlimited,
        min_students,
        max_students,
        session_duration_minutes,
        is_flexible_duration,
        is_active
      FROM program_offerings
      WHERE id = $1
      LIMIT 1
      FOR SHARE
    `,
    [offeringId],
  );

  const offering = offeringResult.rows[0];

  if (!offering) {
    const error = new Error("Offering tidak ditemukan.");

    error.statusCode = 404;
    throw error;
  }

  if (offering.program_id !== program.id) {
    const error = new Error(
      "Offering tidak termasuk dalam Program yang dipilih.",
    );

    error.statusCode = 400;
    throw error;
  }

  if (!offering.is_active) {
    const error = new Error("Offering yang dipilih sedang tidak aktif.");

    error.statusCode = 400;
    throw error;
  }

  return {
    student,
    program,
    offering,
    branchId: student.primary_branch_id,
  };
}

// ==========================================
// CREATE ENROLLMENT
// ==========================================

export async function createEnrollment(data, auditContext = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ----------------------------------------
    // VALIDATE RELATIONSHIPS
    // ----------------------------------------

    const { student, program, offering, branchId } =
      await validateEnrollmentReferences(
        client,
        data.studentId,
        data.programId,
        data.offeringId,
      );

    // ----------------------------------------
    // VALIDATE DATES
    // ----------------------------------------

    const dateResult = await client.query(
      `
        SELECT CURRENT_DATE::text AS today
      `,
    );

    const effectiveStartDate = data.startDate || dateResult.rows[0].today;

    const effectiveEndDate = data.endDate ?? null;

    if (effectiveEndDate !== null && effectiveEndDate < effectiveStartDate) {
      const error = new Error(
        "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      );

      error.statusCode = 400;
      throw error;
    }

    // ----------------------------------------
    // INITIAL PRICE AND BILLING SNAPSHOT
    // ----------------------------------------

    const agreedPrice = data.agreedPrice ?? offering.price;

    const billingPeriod = data.billingPeriod ?? offering.billing_period;

    // ----------------------------------------
    // INSERT ENROLLMENT
    // ----------------------------------------

    const result = await client.query(
      `
        INSERT INTO student_enrollments (
          student_id,
          branch_id,
          program_id,
          offering_id,
          start_date,
          end_date,
          status,
          agreed_price,
          billing_period,
          notes,
          created_by
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          COALESCE($5::date, CURRENT_DATE),
          $6,
          $7,
          $8,
          $9,
          $10,
          $11
        )
        RETURNING id
      `,
      [
        student.id,
        branchId,
        program.id,
        offering.id,
        data.startDate ?? null,
        effectiveEndDate,
        data.status || "active",
        agreedPrice,
        billingPeriod,
        data.notes ?? null,
        auditContext.userId ?? null,
      ],
    );

    const enrollmentId = result.rows[0].id;

    // ----------------------------------------
    // GET CREATED ENROLLMENT
    // ----------------------------------------

    const enrollment = await getEnrollmentByIdWithClient(client, enrollmentId);

    // ----------------------------------------
    // AUDIT LOG
    // ----------------------------------------

    await createAuditLog(
      {
        userId: auditContext.userId,
        branchId,
        action: "ENROLLMENT_CREATED",
        entityTable: "student_enrollments",
        entityId: enrollmentId,
        oldValues: null,
        newValues: enrollment,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return enrollment;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// UPDATE ENROLLMENT
// ==========================================

export async function updateEnrollment(id, data, auditContext = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ----------------------------------------
    // LOCK ENROLLMENT
    // ----------------------------------------

    const lockResult = await client.query(
      `
        SELECT id
        FROM student_enrollments
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [id],
    );

    if (lockResult.rowCount === 0) {
      await client.query("COMMIT");
      return null;
    }

    // ----------------------------------------
    // GET OLD DATA
    // ----------------------------------------

    const oldEnrollment = await getEnrollmentByIdWithClient(client, id);

    // ----------------------------------------
    // VALIDATE MERGED DATES
    // ----------------------------------------

    const nextStartDate =
      data.startDate !== undefined ? data.startDate : oldEnrollment.startDate;

    const nextEndDate =
      data.endDate !== undefined ? data.endDate : oldEnrollment.endDate;

    if (nextEndDate !== null && nextEndDate < nextStartDate) {
      const error = new Error(
        "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      );

      error.statusCode = 400;
      throw error;
    }

    // ----------------------------------------
    // UPDATE FIELDS
    // ----------------------------------------

    const fields = Object.keys(enrollmentFields).filter(
      (key) => data[key] !== undefined,
    );

    if (fields.length === 0) {
      await client.query("COMMIT");
      return oldEnrollment;
    }

    const assignments = fields.map(
      (key, index) => `${enrollmentFields[key]} = $${index + 1}`,
    );

    const values = fields.map((key) => data[key]);

    values.push(id);

    await client.query(
      `
        UPDATE student_enrollments
        SET
          ${assignments.join(", ")},
          updated_at = NOW()
        WHERE id = $${values.length}
      `,
      values,
    );

    // ----------------------------------------
    // GET UPDATED DATA
    // ----------------------------------------

    const newEnrollment = await getEnrollmentByIdWithClient(client, id);

    // ----------------------------------------
    // AUDIT LOG
    // ----------------------------------------

    await createAuditLog(
      {
        userId: auditContext.userId,
        branchId: oldEnrollment.branchId,
        action: "ENROLLMENT_UPDATED",
        entityTable: "student_enrollments",
        entityId: id,
        oldValues: oldEnrollment,
        newValues: newEnrollment,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return newEnrollment;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// UPDATE ENROLLMENT STATUS
// ==========================================

export async function updateEnrollmentStatus(id, status, auditContext = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ----------------------------------------
    // LOCK ENROLLMENT
    // ----------------------------------------

    const lockResult = await client.query(
      `
        SELECT id
        FROM student_enrollments
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [id],
    );

    if (lockResult.rowCount === 0) {
      await client.query("COMMIT");
      return null;
    }

    // ----------------------------------------
    // GET OLD DATA
    // ----------------------------------------

    const oldEnrollment = await getEnrollmentByIdWithClient(client, id);

    // ----------------------------------------
    // UPDATE STATUS
    // ----------------------------------------

    await client.query(
      `
        UPDATE student_enrollments
        SET
          status = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [status, id],
    );

    // ----------------------------------------
    // GET NEW DATA
    // ----------------------------------------

    const newEnrollment = await getEnrollmentByIdWithClient(client, id);

    // ----------------------------------------
    // AUDIT LOG
    // ----------------------------------------

    await createAuditLog(
      {
        userId: auditContext.userId,
        branchId: oldEnrollment.branchId,
        action: "ENROLLMENT_STATUS_UPDATED",
        entityTable: "student_enrollments",
        entityId: id,
        oldValues: {
          status: oldEnrollment.status,
        },
        newValues: {
          status: newEnrollment.status,
        },
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return newEnrollment;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

import { pool } from "../config/database.js";
import { createAuditLog } from "./auditLog.service.js";

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



import { Router } from "express";
import { z } from "zod";

import {
  listParents,
  listEligibleParentAccounts,
  detailParent,
  storeParent,
  restoreParentAccount,
  editParent,
  linkStudent,
  unlinkStudent,
  getMyParentDashboard,
} from "../controllers/parent.controller.js";

import { resolveActiveBranch } from "../middlewares/activeBranch.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  createParentSchema,
  updateParentSchema,
  linkParentStudentSchema,
} from "../validators/parent.validator.js";

const router = Router();

// ==========================================
// VALIDASI REQUEST BODY
// ==========================================

function validate(schema) {
  return function (req, res, next) {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Data yang dikirim tidak valid.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    req.body = result.data;
    return next();
  };
}

// ==========================================
// VALIDASI UUID PARAMETER
// ==========================================

function validateParams(schema) {
  return function (req, res, next) {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Parameter ID tidak valid.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    return next();
  };
}

const parentIdSchema = z.object({
  id: z.uuid(),
});

const parentStudentIdSchema = z.object({
  id: z.uuid(),
  studentId: z.uuid(),
});

// ==========================================
// AUTHENTICATION, AUTHORIZATION & BRANCH
// ==========================================

// Semua endpoint wajib melewati pemeriksaan ini.
// Super Admin otomatis melewati pemilihan cabang.
// Branch Admin menggunakan cabang aktif dari session/header.
// Semua endpoint wajib login.
router.use(authenticate);

// ==========================================
// DASHBOARD KHUSUS AKUN PARENT
// ==========================================

router.get("/me/dashboard", requireRole("parent"), getMyParentDashboard);

// ==========================================
// ENDPOINT MANAJEMEN PARENT
// KHUSUS SUPER ADMIN DAN BRANCH ADMIN
// ==========================================

router.use(requireRole("super_admin", "branch_admin"), resolveActiveBranch);
// ==========================================
// GET: AKUN YANG MEMENUHI SYARAT MENJADI PARENT
// ==========================================

router.get("/eligible-accounts", listEligibleParentAccounts);

// ==========================================
// GET: DAFTAR ORANG TUA
// ==========================================

router.get("/", listParents);

// ==========================================
// PUT: RESTORE PARENT ROLE
// ==========================================

router.post(
  "/:id/restore-user",
  verifyOrigin,
  verifyCsrfToken,
  restoreParentAccount,
);

// ==========================================
// GET: DETAIL ORANG TUA
// ==========================================

router.get("/:id", validateParams(parentIdSchema), detailParent);

// ==========================================
// POST: TAMBAH ORANG TUA
// ==========================================

router.post(
  "/",
  verifyOrigin,
  verifyCsrfToken,
  validate(createParentSchema),
  storeParent,
);

// ==========================================
// PUT: EDIT ORANG TUA
// ==========================================

router.put(
  "/:id",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(parentIdSchema),
  validate(updateParentSchema),
  editParent,
);

// ==========================================
// POST: HUBUNGKAN ORANG TUA DENGAN SISWA
// ==========================================

router.post(
  "/:id/students",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(parentIdSchema),
  validate(linkParentStudentSchema),
  linkStudent,
);

// ==========================================
// DELETE: LEPASKAN HUBUNGAN ORANG TUA DAN SISWA
// ==========================================

router.delete(
  "/:id/students/:studentId",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(parentStudentIdSchema),
  unlinkStudent,
);

export default router;


import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { pool } from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";
import userManagementRoutes from "./routes/userManagement.routes.js";
import branchRoutes from "./routes/branch.routes.js";

import studentRoutes from "./routes/student.routes.js";
import parentRoutes from "./routes/parent.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import enrollmentContractRoutes from "./routes/enrollmentContract.routes.js";

import tutorRoutes from "./routes/tutor.routes.js";
import staffRoutes from "./routes/staff.routes.js";

import hrDocumentRoutes from "./routes/hrDocument.routes.js";
import recruitmentPublicRoutes from "./routes/recruitmentPublic.routes.js";
import recruitmentRoutes from "./routes/recruitment.routes.js";

import subjectRoutes from "./routes/subject.routes.js";
import programRoutes from "./routes/program.routes.js";

import dashboardPublicRoutes from "./routes/dashboardPublic.routes.js";

// ==========================================
// 1. VALIDASI ENVIRONMENT
// ==========================================

const requiredEnv = ["FRONTEND_URL", "CSRF_SECRET", "DATABASE_URL"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Environment variable ${key} belum diatur`);
  }
}

if (process.env.CSRF_SECRET.length < 32) {
  throw new Error("CSRF_SECRET minimal 32 karakter");
}

// ==========================================
// 2. INISIALISASI EXPRESS
// ==========================================

const app = express();

app.disable("x-powered-by");

// ==========================================
// 3. HTTP SECURITY
// ==========================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

// ==========================================
// 4. KONFIGURASI CORS
// ==========================================

const allowedOrigins = [
  process.env.FRONTEND_URL,

  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:5173"] : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Mengizinkan request tanpa Origin.
      // Proteksi Origin tetap diterapkan pada
      // endpoint autentikasi melalui middleware CSRF.

      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin tidak diizinkan oleh CORS");

      error.status = 403;

      return callback(error);
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "X-Active-Branch-Id",
    ],

    optionsSuccessStatus: 204,
  }),
);

// ==========================================
// 5. GLOBAL MIDDLEWARE
// ==========================================

app.use(
  express.json({
    limit: "1mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
);

// Harus dipasang sebelum authRoutes
// karena autentikasi membaca req.cookies.

app.use(cookieParser());

// ==========================================
// 6. ROOT ENDPOINT
// ==========================================

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    application: "Ilyon Academy",
    message: "Selamat datang di Ilyon Academy API",
    version: "1.0.0",

    endpoints: {
      health: "/api/health",
      database: "/api/health/database",
      // userManagement: "/api/user-management",

      auth: {
        csrf: "/api/auth/csrf",
        register: "/api/auth/register",
        login: "/api/auth/login",
        logout: "/api/auth/logout",
        me: "/api/auth/me",
      },
    },

    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 7. API HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Ilyon Academy API berjalan!",
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 8. DATABASE HEALTH CHECK
// ==========================================

app.get("/api/health/database", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS server_time");

    return res.status(200).json({
      success: true,
      message: "Database berhasil terhubung!",
      database: "connected",
      serverTime: result.rows[0].server_time,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    return res.status(503).json({
      success: false,
      message: "Koneksi ke database gagal",
      database: "disconnected",
    });
  }
});

// ==========================================
// 9. API ROUTES
// ==========================================
// Auth
app.use("/api/auth", authRoutes);
app.use("/api/user-management", userManagementRoutes);
app.use("/api/branches", branchRoutes);

// Student Related
app.use("/api/students", studentRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/enrollment-contracts", enrollmentContractRoutes);

// Staff related
app.use("/api/tutors", tutorRoutes);
app.use("/api/staff", staffRoutes);

// recruitment related
app.use("/api/hr-documents", hrDocumentRoutes);
app.use("/api/recruitment/public", recruitmentPublicRoutes);
app.use("/api/recruitment", recruitmentRoutes);

// progam related
app.use("/api/subjects", subjectRoutes);
app.use("/api/programs", programRoutes);

// user related
app.use("/api/public", dashboardPublicRoutes);

// ==========================================
// 10. ROUTE NOT FOUND
// ==========================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan",
    path: req.originalUrl,
  });
});

// ==========================================
// 11. GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const requestedStatus = Number(err.statusCode || err.status);

  const statusCode =
    Number.isInteger(requestedStatus) &&
    requestedStatus >= 400 &&
    requestedStatus <= 599
      ? requestedStatus
      : 500;

  const isProduction = process.env.NODE_ENV === "production";

  // Catat detail error hanya di server.
  console.error("API Error:", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });

  const safeClientMessages = {
    400: "Data atau permintaan tidak valid.",
    401: "Autentikasi diperlukan.",
    403: "Akses tidak diizinkan.",
    404: "Data atau endpoint tidak ditemukan.",
    409: "Permintaan mengalami konflik dengan data yang ada.",
    413: "Ukuran data yang dikirim terlalu besar.",
    429: "Terlalu banyak permintaan. Silakan coba kembali nanti.",
    503: "Layanan sementara tidak tersedia. Silakan coba kembali nanti.",
  };

  const message =
    statusCode >= 500
      ? "Terjadi kesalahan pada server."
      : typeof err.publicMessage === "string"
        ? err.publicMessage
        : safeClientMessages[statusCode] || "Permintaan tidak dapat diproses.";

  return res.status(statusCode).json({
    success: false,
    message,
  });
});

// ==========================================
// 12. EXPORT APP
// ==========================================

export default app;