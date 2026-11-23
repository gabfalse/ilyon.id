import { pool } from "../config/database.js";
import { s3, storageBucket } from "../config/storage.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createAuditLog } from "./auditLog.service.js";
import { decryptTrackingToken } from "../utils/recruitmentTokenCrypto.js";
// ==========================================
// CONSTANTS
// ==========================================

const APPLICATION_STATUSES = [
  "submitted",
  "screening",
  "shortlisted",
  "interview",
  "accepted",
  "rejected",
  "talent_pool",
  "withdrawn",
];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// ==========================================
// HELPERS
// ==========================================

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = message;
  return error;
}

function normalizePagination(page, limit) {
  const normalizedPage = Math.max(1, Number.parseInt(page, 10) || DEFAULT_PAGE);

  const normalizedLimit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(limit, 10) || DEFAULT_LIMIT),
  );

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset: (normalizedPage - 1) * normalizedLimit,
  };
}

function validateStatus(status) {
  if (status !== undefined && !APPLICATION_STATUSES.includes(status)) {
    throw createServiceError("Status lamaran tidak valid.");
  }
}

function validateActor(actorId) {
  if (!actorId) {
    throw createServiceError("Identitas administrator tidak ditemukan.", 401);
  }
}

// ==========================================
// TRANSACTION
// ==========================================

async function executeTransaction(callback) {
  const client = await pool.connect();
  let commitAttempted = false;

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    commitAttempted = true;
    await client.query("COMMIT");

    return result;
  } catch (error) {
    if (!commitAttempted) {
      await client.query("ROLLBACK").catch(() => {});
    } else {
      error.commitOutcomeUnknown = true;
      error.statusCode = 503;
      error.publicMessage =
        "Hasil transaksi belum dapat dipastikan. Periksa kembali data sebelum mengulangi tindakan.";
    }

    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// APPLICATION SELECT
// ==========================================

const applicationSelect = `
  SELECT
    ra.id,
    ra.vacancy_id AS "vacancyId",
    ra.application_number AS "applicationNumber",
    ra.full_name AS "fullName",
    ra.email,
    ra.phone,
    ra.city,
    ra.province,
    ra.education_level AS "educationLevel",
    ra.education_major AS "educationMajor",
    ra.experience_years AS "experienceYears",
    ra.current_occupation AS "currentOccupation",
    ra.status,
    ra.submitted_at AS "submittedAt",
    ra.converted_user_id AS "convertedUserId",
    ra.converted_profile_type AS "convertedProfileType",
    ra.converted_at AS "convertedAt",
    rv.vacancy_code AS "vacancyCode",
    rv.title AS "vacancyTitle",
    rv.employment_type AS "employmentType"
  FROM recruitment_applications ra
  INNER JOIN recruitment_vacancies rv
    ON rv.id = ra.vacancy_id
`;

// ==========================================
// GET ALL APPLICATIONS
// ==========================================

export async function getAllApplications({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search = "",
  status,
  vacancyId,
} = {}) {
  const pagination = normalizePagination(page, limit);

  validateStatus(status);

  const conditions = [];
  const values = [];

  if (search && typeof search === "string") {
    values.push(`%${search.trim()}%`);

    conditions.push(`
      (
        ra.application_number ILIKE $${values.length}
        OR ra.full_name ILIKE $${values.length}
        OR ra.email ILIKE $${values.length}
        OR ra.phone ILIKE $${values.length}
      )
    `);
  }

  if (status) {
    values.push(status);
    conditions.push(`ra.status = $${values.length}`);
  }

  if (vacancyId) {
    values.push(vacancyId);
    conditions.push(`ra.vacancy_id = $${values.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM recruitment_applications ra
      INNER JOIN recruitment_vacancies rv
        ON rv.id = ra.vacancy_id
      ${whereClause}
    `,
    values,
  );

  const total = countResult.rows[0].total;

  const dataValues = [...values, pagination.limit, pagination.offset];

  const dataResult = await pool.query(
    `
      ${applicationSelect}
      ${whereClause}
      ORDER BY ra.submitted_at DESC
      LIMIT $${dataValues.length - 1}
      OFFSET $${dataValues.length}
    `,
    dataValues,
  );

  return {
    items: dataResult.rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}

// ==========================================
// GET APPLICATION DETAIL
// ==========================================

export async function getApplicationById(applicationId) {
  const applicationResult = await pool.query(
    `
      ${applicationSelect}
      WHERE ra.id = $1
      LIMIT 1
    `,
    [applicationId],
  );

  if (!applicationResult.rowCount) {
    throw createServiceError("Lamaran tidak ditemukan.", 404);
  }

  const application = applicationResult.rows[0];

  const detailResult = await pool.query(
    `
      SELECT
        address,
        cover_letter AS "coverLetter",
        portfolio_url AS "portfolioUrl"
      FROM recruitment_applications
      WHERE id = $1
    `,
    [applicationId],
  );

  const documentResult = await pool.query(
    `
      SELECT
        rd.id,
        rd.file_id AS "fileId",
        rd.document_type AS "documentType",
        rd.document_name AS "documentName",
        rd.verification_status AS "verificationStatus",
        rd.created_at AS "createdAt",
        f.original_file_name AS "originalFileName",
        f.mime_type AS "mimeType",
        f.file_size_bytes AS "fileSizeBytes",
        f.is_private AS "isPrivate",
        f.storage_provider AS "storageProvider",
        f.storage_key AS "storageKey"
      FROM recruitment_documents rd
      INNER JOIN files f
        ON f.id = rd.file_id
      WHERE rd.application_id = $1
      ORDER BY rd.created_at DESC
    `,
    [applicationId],
  );

  const historyResult = await pool.query(
    `
      SELECT
        rsh.id,
        rsh.from_status AS "fromStatus",
        rsh.to_status AS "toStatus",
        rsh.notes,
        rsh.created_at AS "createdAt",
        u.full_name AS "changedByName"
      FROM recruitment_stage_histories rsh
      LEFT JOIN users u
        ON u.id = rsh.changed_by
      WHERE rsh.application_id = $1
      ORDER BY rsh.created_at ASC
    `,
    [applicationId],
  );

  return {
    ...application,
    ...detailResult.rows[0],
    documents: documentResult.rows.map((document) => {
      const { storageKey, storageProvider, isPrivate, ...publicDocument } =
        document;

      return publicDocument;
    }),
    history: historyResult.rows,
  };
}

// ==========================================
// GET PRIVATE DOCUMENT URL
// ==========================================

export async function getApplicationDocumentUrl(applicationId, documentId) {
  const result = await pool.query(
    `
      SELECT
        f.storage_provider AS "storageProvider",
        f.storage_key AS "storageKey",
        f.is_private AS "isPrivate",
        f.mime_type AS "mimeType",
        f.original_file_name AS "originalFileName"
      FROM recruitment_documents rd
      INNER JOIN files f
        ON f.id = rd.file_id
      WHERE rd.application_id = $1
        AND rd.id = $2
      LIMIT 1
    `,
    [applicationId, documentId],
  );

  if (!result.rowCount) {
    throw createServiceError("Dokumen lamaran tidak ditemukan.", 404);
  }

  const file = result.rows[0];

  if (file.storageProvider !== "neon" || !file.storageKey || !file.isPrivate) {
    throw createServiceError(
      "Dokumen tidak tersedia melalui penyimpanan privat.",
      409,
    );
  }

  const command = new GetObjectCommand({
    Bucket: storageBucket,
    Key: file.storageKey,
    ResponseContentType: file.mimeType || "application/pdf",
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.originalFileName)}"`,
  });

  const url = await getSignedUrl(s3, command, {
    expiresIn: 300,
  });

  return {
    url,
    expiresIn: 300,
  };
}
// ==========================================
// GET APPLICATION TRACKING TOKEN
// ==========================================

export async function getApplicationTrackingToken(
  applicationId,
  { actorId, ipAddress = null, userAgent = null } = {},
) {
  validateActor(actorId);

  return executeTransaction(async (client) => {
    const result = await client.query(
      `
        SELECT
          id,
          application_number AS "applicationNumber",
          tracking_token_encrypted AS "trackingTokenEncrypted"
        FROM recruitment_applications
        WHERE id = $1
        LIMIT 1
        FOR SHARE
      `,
      [applicationId],
    );

    if (!result.rowCount) {
      throw createServiceError("Lamaran tidak ditemukan.", 404);
    }

    const application = result.rows[0];

    if (!application.trackingTokenEncrypted) {
      return {
        available: false,
        trackingToken: null,
      };
    }

    const trackingToken = decryptTrackingToken(
      application.trackingTokenEncrypted,
    );

    await createAuditLog(
      {
        userId: actorId,
        action: "RECRUITMENT_APPLICATION_TRACKING_TOKEN_VIEWED",
        entityTable: "recruitment_applications",
        entityId: applicationId,
        oldValues: null,
        newValues: {
          applicationNumber: application.applicationNumber,
          action: "tracking_token_revealed",
        },
        ipAddress,
        userAgent,
      },
      client,
    );

    return {
      available: true,
      trackingToken,
    };
  });
}
// ==========================================
// UPDATE APPLICATION STATUS
// ==========================================

export async function updateApplicationStatus(
  applicationId,
  { status, notes = null },
  { actorId, ipAddress = null, userAgent = null } = {},
) {
  validateActor(actorId);
  validateStatus(status);

  if (!status) {
    throw createServiceError("Status lamaran wajib diisi.");
  }

  const normalizedNotes =
    typeof notes === "string" && notes.trim() ? notes.trim() : null;

  return executeTransaction(async (client) => {
    const oldResult = await client.query(
      `
        SELECT
          ra.id,
          ra.status,
          ra.converted_user_id AS "convertedUserId",
          ra.vacancy_id AS "vacancyId",
          rv.title AS "vacancyTitle"
        FROM recruitment_applications ra
        INNER JOIN recruitment_vacancies rv
          ON rv.id = ra.vacancy_id
        WHERE ra.id = $1
        FOR UPDATE OF ra
      `,
      [applicationId],
    );

    if (!oldResult.rowCount) {
      throw createServiceError("Lamaran tidak ditemukan.", 404);
    }

    const oldApplication = oldResult.rows[0];

    if (oldApplication.convertedUserId) {
      throw createServiceError(
        "Status lamaran yang sudah dikonversi tidak dapat diubah.",
        409,
      );
    }

    if (oldApplication.status === status) {
      throw createServiceError(
        "Status lamaran sudah menggunakan status tersebut.",
        409,
      );
    }

    await client.query(
      `
        UPDATE recruitment_applications
        SET
          status = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [status, applicationId],
    );

    await client.query(
      `
        INSERT INTO recruitment_stage_histories (
          application_id,
          from_status,
          to_status,
          notes,
          changed_by
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [applicationId, oldApplication.status, status, normalizedNotes, actorId],
    );

    const newApplication = {
      ...oldApplication,
      status,
    };

    await createAuditLog(
      {
        userId: actorId,
        action: "RECRUITMENT_APPLICATION_STATUS_UPDATED",
        entityTable: "recruitment_applications",
        entityId: applicationId,
        oldValues: {
          status: oldApplication.status,
        },
        newValues: {
          status,
          notes: normalizedNotes,
        },
        ipAddress,
        userAgent,
      },
      client,
    );

    return newApplication;
  });
}
