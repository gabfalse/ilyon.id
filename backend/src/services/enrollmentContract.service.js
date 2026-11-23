import { pool } from "../config/database.js";
import { createAuditLog } from "./auditLog.service.js";

// ==========================================
// CONTRACT FIELD MAPPING
// ==========================================

const contractFields = {
  endDate: "end_date",
  notes: "notes",
};

// ==========================================
// CONTRACT SELECT QUERY
// ==========================================

const contractFrom = `
  FROM enrollment_contracts ec

  INNER JOIN branches b
    ON b.id = ec.branch_id

  INNER JOIN program_offerings po
    ON po.id = ec.offering_id

  INNER JOIN programs p
    ON p.id = po.program_id
`;

const contractSelect = `
  SELECT
    ec.id,
    ec.branch_id AS "branchId",
    b.branch_name AS "branchName",

    ec.offering_id AS "offeringId",
    ec.offering_code AS "offeringCode",
    ec.offering_name AS "offeringName",

    p.id AS "programId",
    p.program_code AS "programCode",
    p.program_name AS "programName",

    ec.delivery_type AS "deliveryType",
    ec.learning_method AS "learningMethod",

    ec.pricing_unit AS "pricingUnit",
    ec.unit_price AS "unitPrice",
    ec.total_price AS "totalPrice",

    ec.billing_period AS "billingPeriod",
    ec.meeting_quota AS "meetingQuota",
    ec.is_unlimited AS "isUnlimited",

    ec.session_duration_minutes AS "sessionDurationMinutes",
    ec.is_flexible_duration AS "isFlexibleDuration",

    ec.min_students AS "minStudents",
    ec.max_students AS "maxStudents",

    ec.contract_code AS "contractCode",

    TO_CHAR(ec.start_date, 'YYYY-MM-DD') AS "startDate",
    TO_CHAR(ec.end_date, 'YYYY-MM-DD') AS "endDate",

    ec.status,
    ec.notes,

    ec.created_by AS "createdBy",
    ec.created_at AS "createdAt",
    ec.updated_at AS "updatedAt",

    (
      SELECT COUNT(*)
      FROM enrollment_contract_members ecm
      WHERE ecm.contract_id = ec.id
    )::integer AS "memberCount"

  ${contractFrom}
`;

// ==========================================
// CONTRACT MEMBER SELECT QUERY
// ==========================================

const contractMemberSelect = `
  SELECT
    ecm.id,

    ecm.contract_id AS "contractId",
    ecm.enrollment_id AS "enrollmentId",

    e.student_id AS "studentId",
    s.student_code AS "studentCode",
    s.full_name AS "studentName",

    e.branch_id AS "branchId",
    e.program_id AS "programId",
    e.offering_id AS "offeringId",

    e.status AS "enrollmentStatus",

    ecm.contribution_amount AS "contributionAmount",

    TO_CHAR(ecm.joined_at, 'YYYY-MM-DD') AS "joinedAt",
    TO_CHAR(ecm.left_at, 'YYYY-MM-DD') AS "leftAt",

    ecm.status,
    ecm.notes,

    ecm.created_at AS "createdAt",
    ecm.updated_at AS "updatedAt"

  FROM enrollment_contract_members ecm

  INNER JOIN student_enrollments e
    ON e.id = ecm.enrollment_id

  INNER JOIN students s
    ON s.id = e.student_id
`;

// ==========================================
// ERROR HELPER
// ==========================================

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// ==========================================
// GET CONTRACT WITH MEMBERS
// ==========================================

async function getEnrollmentContractByIdWithClient(client, id) {
  const contractResult = await client.query(
    `
      ${contractSelect}
      WHERE ec.id = $1
      LIMIT 1
    `,
    [id],
  );

  const contract = contractResult.rows[0];

  if (!contract) {
    return null;
  }

  const memberResult = await client.query(
    `
      ${contractMemberSelect}
      WHERE ecm.contract_id = $1
      ORDER BY ecm.joined_at ASC, s.full_name ASC
    `,
    [id],
  );

  return {
    ...contract,
    members: memberResult.rows,
  };
}

// ==========================================
// GET ALL ENROLLMENT CONTRACTS
// ==========================================

export async function getAllEnrollmentContracts({
  search = "",
  status,
  branchId,
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
        ec.contract_code ILIKE $${index}
        OR ec.offering_code ILIKE $${index}
        OR ec.offering_name ILIKE $${index}
        OR b.branch_name ILIKE $${index}
        OR EXISTS (
          SELECT 1
          FROM enrollment_contract_members ecm
          INNER JOIN student_enrollments e
            ON e.id = ecm.enrollment_id
          INNER JOIN students s
            ON s.id = e.student_id
          WHERE ecm.contract_id = ec.id
            AND (
              s.full_name ILIKE $${index}
              OR s.student_code ILIKE $${index}
            )
        )
      )
    `);

    values.push(`%${search}%`);
    index++;
  }

  // ----------------------------------------
  // FILTER STATUS
  // ----------------------------------------

  if (status) {
    conditions.push(`ec.status = $${index}`);
    values.push(status);
    index++;
  }

  // ----------------------------------------
  // FILTER BRANCH
  // ----------------------------------------

  if (branchId) {
    conditions.push(`ec.branch_id = $${index}`);
    values.push(branchId);
    index++;
  }

  // ----------------------------------------
  // FILTER OFFERING
  // ----------------------------------------

  if (offeringId) {
    conditions.push(`ec.offering_id = $${index}`);
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
      ${contractFrom}
      ${whereClause}
    `,
    values,
  );

  // ----------------------------------------
  // DATA
  // ----------------------------------------

  const dataResult = await pool.query(
    `
      ${contractSelect}
      ${whereClause}

      ORDER BY ec.created_at DESC

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
// GET CONTRACT BY ID
// ==========================================

export async function getEnrollmentContractById(id) {
  return getEnrollmentContractByIdWithClient(pool, id);
}

// ==========================================
// VALIDATE CONTRACT ENROLLMENTS
// ==========================================

async function validateContractEnrollments(client, members) {
  const enrollmentIds = members.map((member) => member.enrollmentId);

  // ----------------------------------------
  // LOCK AND GET ENROLLMENTS
  // ----------------------------------------

  const enrollmentResult = await client.query(
    `
      SELECT
        e.id AS "enrollmentId",
        e.student_id AS "studentId",
        e.branch_id AS "branchId",
        e.program_id AS "programId",
        e.offering_id AS "offeringId",
        e.status AS "enrollmentStatus",

        s.student_code AS "studentCode",
        s.full_name AS "studentName",

        po.offering_code AS "offeringCode",
        po.offering_name AS "offeringName",
        po.delivery_type AS "deliveryType",
        po.learning_method AS "learningMethod",
        po.billing_period AS "billingPeriod",
        po.price AS "unitPrice",
        po.pricing_unit AS "pricingUnit",
        po.meeting_quota AS "meetingQuota",
        po.is_unlimited AS "isUnlimited",
        po.session_duration_minutes AS "sessionDurationMinutes",
        po.is_flexible_duration AS "isFlexibleDuration",
        po.min_students AS "minStudents",
        po.max_students AS "maxStudents"

      FROM student_enrollments e

      INNER JOIN students s
        ON s.id = e.student_id
       AND s.deleted_at IS NULL

      INNER JOIN program_offerings po
        ON po.id = e.offering_id
       AND po.program_id = e.program_id

      WHERE e.id = ANY($1::uuid[])

      ORDER BY e.id

      FOR UPDATE OF e
    `,
    [enrollmentIds],
  );

  const enrollments = enrollmentResult.rows;

  // ----------------------------------------
  // VALIDATE ALL ENROLLMENTS FOUND
  // ----------------------------------------

  if (enrollments.length !== enrollmentIds.length) {
    throw createServiceError(
      "Sebagian Enrollment tidak ditemukan atau siswanya sudah dihapus.",
      404,
    );
  }

  if (enrollments.length === 0) {
    throw createServiceError("Contract minimal harus memiliki satu anggota.");
  }

  // ----------------------------------------
  // VALIDATE SAME BRANCH
  // ----------------------------------------

  const firstEnrollment = enrollments[0];

  const differentBranch = enrollments.some(
    (enrollment) => enrollment.branchId !== firstEnrollment.branchId,
  );

  if (differentBranch) {
    throw createServiceError(
      "Semua Enrollment dalam satu Contract harus berasal dari Branch yang sama.",
    );
  }

  // ----------------------------------------
  // VALIDATE SAME OFFERING
  // ----------------------------------------

  const differentOffering = enrollments.some(
    (enrollment) => enrollment.offeringId !== firstEnrollment.offeringId,
  );

  if (differentOffering) {
    throw createServiceError(
      "Semua Enrollment dalam satu Contract harus menggunakan Offering yang sama.",
    );
  }

  // ----------------------------------------
  // VALIDATE EXISTING ACTIVE MEMBERSHIP
  // ----------------------------------------

  const existingMembershipResult = await client.query(
    `
      SELECT
        ecm.enrollment_id AS "enrollmentId",
        ec.contract_code AS "contractCode"

      FROM enrollment_contract_members ecm

      INNER JOIN enrollment_contracts ec
        ON ec.id = ecm.contract_id

      WHERE ecm.enrollment_id = ANY($1::uuid[])
        AND ecm.status = 'active'

      FOR UPDATE OF ecm
    `,
    [enrollmentIds],
  );

  if (existingMembershipResult.rowCount > 0) {
    throw createServiceError(
      "Salah satu Enrollment sudah menjadi anggota Contract aktif.",
      409,
    );
  }

  return {
    enrollments,
    branchId: firstEnrollment.branchId,
    offeringId: firstEnrollment.offeringId,
    offering: firstEnrollment,
  };
}

// ==========================================
// CREATE ENROLLMENT CONTRACT
// ==========================================

export async function createEnrollmentContract(data, auditContext = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ----------------------------------------
    // VALIDATE ENROLLMENTS
    // ----------------------------------------

    const { enrollments, branchId, offeringId, offering } =
      await validateContractEnrollments(client, data.members);

    // ----------------------------------------
    // VALIDATE CONTRACT DATES
    // ----------------------------------------

    const dateResult = await client.query(
      `
        SELECT CURRENT_DATE::text AS today
      `,
    );

    const effectiveStartDate = data.startDate || dateResult.rows[0].today;

    const effectiveEndDate = data.endDate ?? null;

    if (effectiveEndDate !== null && effectiveEndDate < effectiveStartDate) {
      throw createServiceError(
        "Tanggal selesai Contract tidak boleh sebelum tanggal mulai.",
      );
    }

    // ----------------------------------------
    // INSERT CONTRACT SNAPSHOT
    // ----------------------------------------

    const contractResult = await client.query(
      `
        INSERT INTO enrollment_contracts (
          branch_id,
          offering_id,

          contract_code,

          offering_code,
          offering_name,

          delivery_type,
          learning_method,

          pricing_unit,
          unit_price,

          start_date,
          end_date,

          total_price,

          billing_period,
          meeting_quota,
          is_unlimited,

          session_duration_minutes,
          is_flexible_duration,

          min_students,
          max_students,

          status,
          notes,
          created_by
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          COALESCE($10::date, CURRENT_DATE),
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          $17,
          $18,
          $19,
          $20,
          $21,
          $22
        )
        RETURNING id
      `,
      [
        branchId,
        offeringId,

        data.contractCode,

        offering.offeringCode,
        offering.offeringName,

        offering.deliveryType,
        offering.learningMethod,

        offering.pricingUnit,
        offering.unitPrice,

        data.startDate ?? null,
        effectiveEndDate,

        data.totalPrice,

        offering.billingPeriod,
        offering.meetingQuota,
        offering.isUnlimited,

        offering.sessionDurationMinutes,
        offering.isFlexibleDuration,

        offering.minStudents,
        offering.maxStudents,

        data.status || "pending",
        data.notes ?? null,
        auditContext.userId ?? null,
      ],
    );

    const contractId = contractResult.rows[0].id;

    // ----------------------------------------
    // INSERT CONTRACT MEMBERS
    // ----------------------------------------

    for (const member of data.members) {
      await client.query(
        `
          INSERT INTO enrollment_contract_members (
            contract_id,
            enrollment_id,
            contribution_amount,
            joined_at,
            status,
            notes
          )
          VALUES (
            $1,
            $2,
            $3,
            COALESCE($4::date, $5::date, CURRENT_DATE),
            'active',
            $6
          )
        `,
        [
          contractId,
          member.enrollmentId,
          member.contributionAmount,
          member.joinedAt ?? null,
          data.startDate ?? null,
          member.notes ?? null,
        ],
      );
    }

    // ----------------------------------------
    // VALIDATE CONTRIBUTION TOTAL
    // ----------------------------------------

    const contributionResult = await client.query(
      `
        SELECT
          COALESCE(
            SUM(contribution_amount),
            0
          ) AS contribution_total,

          (
            COALESCE(
              SUM(contribution_amount),
              0
            ) = $2::numeric
          ) AS is_matching

        FROM enrollment_contract_members

        WHERE contract_id = $1
      `,
      [contractId, data.totalPrice],
    );

    if (!contributionResult.rows[0].is_matching) {
      throw createServiceError(
        "Total kontribusi seluruh anggota harus sama dengan total harga Contract.",
      );
    }

    // ----------------------------------------
    // GET CREATED CONTRACT
    // ----------------------------------------

    const contract = await getEnrollmentContractByIdWithClient(
      client,
      contractId,
    );

    // ----------------------------------------
    // AUDIT LOG
    // ----------------------------------------

    await createAuditLog(
      {
        userId: auditContext.userId,
        branchId,
        action: "ENROLLMENT_CONTRACT_CREATED",
        entityTable: "enrollment_contracts",
        entityId: contractId,
        oldValues: null,
        newValues: contract,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return contract;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// UPDATE ENROLLMENT CONTRACT
// ==========================================

export async function updateEnrollmentContract(id, data, auditContext = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ----------------------------------------
    // LOCK CONTRACT
    // ----------------------------------------

    const lockResult = await client.query(
      `
        SELECT id
        FROM enrollment_contracts
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
    // GET OLD CONTRACT
    // ----------------------------------------

    const oldContract = await getEnrollmentContractByIdWithClient(client, id);

    // ----------------------------------------
    // VALIDATE DATES
    // ----------------------------------------

    const nextEndDate =
      data.endDate !== undefined ? data.endDate : oldContract.endDate;

    if (nextEndDate !== null && nextEndDate < oldContract.startDate) {
      throw createServiceError(
        "Tanggal selesai Contract tidak boleh sebelum tanggal mulai.",
      );
    }

    // ----------------------------------------
    // FILTER ALLOWED FIELDS
    // ----------------------------------------

    const fields = Object.keys(contractFields).filter(
      (key) => data[key] !== undefined,
    );

    if (fields.length === 0) {
      await client.query("COMMIT");
      return oldContract;
    }

    const assignments = fields.map(
      (key, index) => `${contractFields[key]} = $${index + 1}`,
    );

    const values = fields.map((key) => data[key]);

    values.push(id);

    await client.query(
      `
        UPDATE enrollment_contracts
        SET
          ${assignments.join(", ")},
          updated_at = NOW()
        WHERE id = $${values.length}
      `,
      values,
    );

    // ----------------------------------------
    // GET UPDATED CONTRACT
    // ----------------------------------------

    const newContract = await getEnrollmentContractByIdWithClient(client, id);

    // ----------------------------------------
    // AUDIT LOG
    // ----------------------------------------

    await createAuditLog(
      {
        userId: auditContext.userId,
        branchId: oldContract.branchId,
        action: "ENROLLMENT_CONTRACT_UPDATED",
        entityTable: "enrollment_contracts",
        entityId: id,
        oldValues: oldContract,
        newValues: newContract,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return newContract;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// UPDATE CONTRACT STATUS
// ==========================================

export async function updateEnrollmentContractStatus(
  id,
  status,
  auditContext = {},
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ----------------------------------------
    // LOCK CONTRACT
    // ----------------------------------------

    const lockResult = await client.query(
      `
        SELECT id
        FROM enrollment_contracts
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
    // GET OLD CONTRACT
    // ----------------------------------------

    const oldContract = await getEnrollmentContractByIdWithClient(client, id);

    // ----------------------------------------
    // PREVENT REACTIVATING TERMINAL CONTRACT
    // ----------------------------------------

    const terminalStatuses = ["completed", "cancelled"];

    if (
      terminalStatuses.includes(oldContract.status) &&
      oldContract.status !== status
    ) {
      throw createServiceError(
        "Contract yang sudah selesai atau dibatalkan tidak dapat diaktifkan kembali. Buat Contract baru untuk perpanjangan.",
      );
    }

    // ----------------------------------------
    // UPDATE CONTRACT STATUS
    // ----------------------------------------

    await client.query(
      `
        UPDATE enrollment_contracts
        SET
          status = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [status, id],
    );

    // ----------------------------------------
    // CLOSE ACTIVE MEMBERS WHEN CONTRACT ENDS
    // ----------------------------------------

    if (status === "completed" || status === "cancelled") {
      const memberStatus = status === "completed" ? "completed" : "left";

      await client.query(
        `
          UPDATE enrollment_contract_members
          SET
            status = $1,
            left_at = COALESCE(left_at, CURRENT_DATE),
            updated_at = NOW()
          WHERE contract_id = $2
            AND status = 'active'
        `,
        [memberStatus, id],
      );
    }

    // ----------------------------------------
    // GET UPDATED CONTRACT
    // ----------------------------------------

    const newContract = await getEnrollmentContractByIdWithClient(client, id);

    // ----------------------------------------
    // AUDIT LOG
    // ----------------------------------------

    await createAuditLog(
      {
        userId: auditContext.userId,
        branchId: oldContract.branchId,
        action: "ENROLLMENT_CONTRACT_STATUS_UPDATED",
        entityTable: "enrollment_contracts",
        entityId: id,
        oldValues: {
          status: oldContract.status,
        },
        newValues: {
          status: newContract.status,
          members: newContract.members,
        },
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return newContract;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// UPDATE CONTRACT MEMBER
// ==========================================

export async function updateEnrollmentContractMember(
  contractId,
  enrollmentId,
  data,
  auditContext = {},
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ----------------------------------------
    // LOCK CONTRACT
    // ----------------------------------------

    const contractLock = await client.query(
      `
        SELECT
          id,
          branch_id AS "branchId",
          status
        FROM enrollment_contracts
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [contractId],
    );

    if (contractLock.rowCount === 0) {
      await client.query("COMMIT");
      return null;
    }

    const contract = contractLock.rows[0];

    if (["completed", "cancelled"].includes(contract.status)) {
      throw createServiceError(
        "Anggota Contract yang sudah selesai atau dibatalkan tidak dapat diubah.",
      );
    }

    // ----------------------------------------
    // LOCK MEMBER
    // ----------------------------------------

    const memberResult = await client.query(
      `
        SELECT
          id,
          enrollment_id,
          status,
          left_at,
          notes
        FROM enrollment_contract_members
        WHERE contract_id = $1
          AND enrollment_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [contractId, enrollmentId],
    );

    if (memberResult.rowCount === 0) {
      await client.query("COMMIT");
      return null;
    }

    const oldMember = memberResult.rows[0];

    // ----------------------------------------
    // VALIDATE LEFT DATE
    // ----------------------------------------

    if (data.status === "active" && data.leftAt != null) {
      throw createServiceError(
        "Anggota Contract berstatus aktif tidak boleh memiliki tanggal keluar.",
      );
    }

    // ----------------------------------------
    // UPDATE MEMBER
    // ----------------------------------------

    const nextLeftAt = data.status === "active" ? null : (data.leftAt ?? null);

    await client.query(
      `
        UPDATE enrollment_contract_members
        SET
          status = $1,

          left_at = CASE
            WHEN $1 = 'active' THEN NULL
            ELSE COALESCE($2::date, CURRENT_DATE)
          END,

          notes = CASE
            WHEN $3::boolean THEN $4::text
            ELSE notes
          END,

          updated_at = NOW()

        WHERE contract_id = $5
          AND enrollment_id = $6
      `,
      [
        data.status,
        nextLeftAt,
        data.notes !== undefined,
        data.notes ?? null,
        contractId,
        enrollmentId,
      ],
    );

    // ----------------------------------------
    // GET UPDATED CONTRACT
    // ----------------------------------------

    const updatedContract = await getEnrollmentContractByIdWithClient(
      client,
      contractId,
    );

    const newMember = updatedContract.members.find(
      (member) => member.enrollmentId === enrollmentId,
    );

    // ----------------------------------------
    // AUDIT LOG
    // ----------------------------------------

    await createAuditLog(
      {
        userId: auditContext.userId,
        branchId: contract.branchId,
        action: "ENROLLMENT_CONTRACT_MEMBER_UPDATED",
        entityTable: "enrollment_contract_members",
        entityId: oldMember.id,
        oldValues: oldMember,
        newValues: newMember,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      },
      client,
    );

    await client.query("COMMIT");

    return updatedContract;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
