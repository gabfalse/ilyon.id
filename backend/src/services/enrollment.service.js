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
