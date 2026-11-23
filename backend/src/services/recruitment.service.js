import { randomBytes } from "node:crypto";

import { pool } from "../config/database.js";
import { createAuditLog } from "./auditLog.service.js";

// ==========================================
// CONSTANTS
// ==========================================

const VACANCY_STATUSES = ["draft", "published", "closed", "archived"];

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship"];

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

function createVacancyCode() {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const randomPart = randomBytes(4).toString("hex").toUpperCase();

  return `REC-${datePart}-${randomPart}`;
}

function normalizeNullableText(value) {
  if (typeof value !== "string") return value ?? null;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeDate(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createServiceError("Tanggal tidak valid.");
  }

  return date;
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

function validateEmploymentType(value) {
  if (value !== undefined && !EMPLOYMENT_TYPES.includes(value)) {
    throw createServiceError("Jenis pekerjaan tidak valid.");
  }
}

function validateVacancyStatus(value) {
  if (value !== undefined && !VACANCY_STATUSES.includes(value)) {
    throw createServiceError("Status lowongan tidak valid.");
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
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "RECRUITMENT TRANSACTION ROLLBACK FAILED:",
          rollbackError.message,
        );
      }
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
// VACANCY SELECT
// ==========================================

const vacancySelect = `
  SELECT
    rv.id,
    rv.vacancy_code AS "vacancyCode",
    rv.title,
    rv.branch_id AS "branchId",
    b.branch_name AS "branchName",
    rv.employment_type AS "employmentType",
    rv.location,
    rv.description,
    rv.responsibilities,
    rv.requirements,
    rv.openings,
    rv.status,
    rv.published_at AS "publishedAt",
    rv.closes_at AS "closesAt",
    rv.created_by AS "createdBy",
    rv.updated_by AS "updatedBy",
    rv.created_at AS "createdAt",
    rv.updated_at AS "updatedAt"
  FROM recruitment_vacancies rv
  LEFT JOIN branches b ON b.id = rv.branch_id
`;

// ==========================================
// GET ALL VACANCIES
// ==========================================

export async function getAllVacancies({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search = "",
  status,
  employmentType,
} = {}) {
  const pagination = normalizePagination(page, limit);

  validateVacancyStatus(status);
  validateEmploymentType(employmentType);

  const conditions = [];
  const values = [];

  if (search && typeof search === "string") {
    values.push(`%${search.trim()}%`);
    conditions.push(`
      (
        rv.vacancy_code ILIKE $${values.length}
        OR rv.title ILIKE $${values.length}
        OR rv.location ILIKE $${values.length}
      )
    `);
  }

  if (status) {
    values.push(status);
    conditions.push(`rv.status = $${values.length}`);
  }

  if (employmentType) {
    values.push(employmentType);
    conditions.push(`rv.employment_type = $${values.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM recruitment_vacancies rv
    ${whereClause}
  `;

  const countResult = await pool.query(countQuery, values);
  const total = countResult.rows[0].total;

  const dataValues = [...values, pagination.limit, pagination.offset];

  const dataQuery = `
    ${vacancySelect}
    ${whereClause}
    ORDER BY rv.created_at DESC
    LIMIT $${dataValues.length - 1}
    OFFSET $${dataValues.length}
  `;

  const dataResult = await pool.query(dataQuery, dataValues);

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
// GET VACANCY BY ID
// ==========================================

export async function getVacancyById(vacancyId) {
  const result = await pool.query(
    `
      ${vacancySelect}
      WHERE rv.id = $1
      LIMIT 1
    `,
    [vacancyId],
  );

  if (!result.rowCount) {
    throw createServiceError("Lowongan tidak ditemukan.", 404);
  }

  return result.rows[0];
}

// ==========================================
// CREATE VACANCY
// ==========================================

export async function createVacancy(
  data,
  { actorId, ipAddress = null, userAgent = null } = {},
) {
  validateActor(actorId);
  validateEmploymentType(data.employmentType);

  const vacancyCode = createVacancyCode();

  const branchId = data.branchId ?? null;
  const title = data.title.trim();
  const location = normalizeNullableText(data.location);
  const description = data.description.trim();
  const responsibilities = normalizeNullableText(data.responsibilities);
  const requirements = normalizeNullableText(data.requirements);
  const openings = data.openings;
  const closesAt = normalizeDate(data.closesAt);

  if (openings < 1) {
    throw createServiceError("Jumlah posisi harus minimal satu.");
  }

  if (closesAt && closesAt <= new Date()) {
    throw createServiceError(
      "Tanggal penutupan lowongan harus berada di masa depan.",
    );
  }

  return executeTransaction(async (client) => {
    const insertResult = await client.query(
      `
        INSERT INTO recruitment_vacancies (
          vacancy_code,
          title,
          branch_id,
          employment_type,
          location,
          description,
          responsibilities,
          requirements,
          openings,
          status,
          closes_at,
          created_by,
          updated_by
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, 'draft', $10, $11, $11
        )
        RETURNING id
      `,
      [
        vacancyCode,
        title,
        branchId,
        data.employmentType,
        location,
        description,
        responsibilities,
        requirements,
        openings,
        closesAt,
        actorId,
      ],
    );

    const vacancyId = insertResult.rows[0].id;

    const vacancyResult = await client.query(
      `
        ${vacancySelect}
        WHERE rv.id = $1
      `,
      [vacancyId],
    );

    const vacancy = vacancyResult.rows[0];

    await createAuditLog(
      {
        userId: actorId,
        branchId,
        action: "RECRUITMENT_VACANCY_CREATED",
        entityTable: "recruitment_vacancies",
        entityId: vacancyId,
        oldValues: null,
        newValues: vacancy,
        ipAddress,
        userAgent,
      },
      client,
    );

    return vacancy;
  });
}

// ==========================================
// UPDATE VACANCY
// ==========================================

export async function updateVacancy(
  vacancyId,
  data,
  { actorId, ipAddress = null, userAgent = null } = {},
) {
  validateActor(actorId);
  validateEmploymentType(data.employmentType);
  validateVacancyStatus(data.status);

  const fieldMap = {
    title: {
      column: "title",
      normalize: (value) => value.trim(),
    },
    branchId: {
      column: "branch_id",
      normalize: (value) => value ?? null,
    },
    employmentType: {
      column: "employment_type",
      normalize: (value) => value,
    },
    location: {
      column: "location",
      normalize: normalizeNullableText,
    },
    description: {
      column: "description",
      normalize: (value) => value.trim(),
    },
    responsibilities: {
      column: "responsibilities",
      normalize: normalizeNullableText,
    },
    requirements: {
      column: "requirements",
      normalize: normalizeNullableText,
    },
    openings: {
      column: "openings",
      normalize: (value) => value,
    },
    closesAt: {
      column: "closes_at",
      normalize: normalizeDate,
    },
    status: {
      column: "status",
      normalize: (value) => value,
    },
  };

  const updates = [];

  for (const [key, config] of Object.entries(fieldMap)) {
    if (Object.hasOwn(data, key)) {
      updates.push({
        column: config.column,
        value: config.normalize(data[key]),
      });
    }
  }

  if (!updates.length) {
    throw createServiceError("Tidak ada data yang diperbarui.");
  }

  const openingsUpdate = updates.find((item) => item.column === "openings");

  if (openingsUpdate && openingsUpdate.value < 1) {
    throw createServiceError("Jumlah posisi harus minimal satu.");
  }

  const closesAtUpdate = updates.find((item) => item.column === "closes_at");

  if (
    closesAtUpdate &&
    closesAtUpdate.value &&
    closesAtUpdate.value <= new Date()
  ) {
    throw createServiceError(
      "Tanggal penutupan lowongan harus berada di masa depan.",
    );
  }

  return executeTransaction(async (client) => {
    const oldResult = await client.query(
      `
        ${vacancySelect}
        WHERE rv.id = $1
        FOR UPDATE OF rv
      `,
      [vacancyId],
    );

    if (!oldResult.rowCount) {
      throw createServiceError("Lowongan tidak ditemukan.", 404);
    }

    const oldVacancy = oldResult.rows[0];

    const values = [];
    const assignments = [];

    for (const update of updates) {
      values.push(update.value);
      assignments.push(`${update.column} = $${values.length}`);
    }

    values.push(actorId);
    assignments.push(`updated_by = $${values.length}`);

    // Set published_at when first published.
    assignments.push(`
      published_at = CASE
        WHEN $${values.length + 1} = 'published'
          AND published_at IS NULL
        THEN NOW()
        ELSE published_at
      END
    `);

    values.push(
      updates.find((item) => item.column === "status")?.value ??
        oldVacancy.status,
    );

    values.push(vacancyId);

    const updateResult = await client.query(
      `
        UPDATE recruitment_vacancies
        SET
          ${assignments.join(", ")},
          updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING id
      `,
      values,
    );

    const newResult = await client.query(
      `
        ${vacancySelect}
        WHERE rv.id = $1
      `,
      [updateResult.rows[0].id],
    );

    const newVacancy = newResult.rows[0];

    await createAuditLog(
      {
        userId: actorId,
        branchId: newVacancy.branchId,
        action: "RECRUITMENT_VACANCY_UPDATED",
        entityTable: "recruitment_vacancies",
        entityId: vacancyId,
        oldValues: oldVacancy,
        newValues: newVacancy,
        ipAddress,
        userAgent,
      },
      client,
    );

    return newVacancy;
  });
}

// ==========================================
// UPDATE VACANCY STATUS
// ==========================================

export async function updateVacancyStatus(
  vacancyId,
  status,
  { actorId, ipAddress = null, userAgent = null } = {},
) {
  return updateVacancy(
    vacancyId,
    { status },
    { actorId, ipAddress, userAgent },
  );
}

// ==========================================
// DELETE VACANCY
// ==========================================

export async function deleteVacancy(
  vacancyId,
  { actorId, ipAddress = null, userAgent = null } = {},
) {
  validateActor(actorId);

  return executeTransaction(async (client) => {
    const vacancyResult = await client.query(
      `
        ${vacancySelect}
        WHERE rv.id = $1
        FOR UPDATE OF rv
      `,
      [vacancyId],
    );

    if (!vacancyResult.rowCount) {
      throw createServiceError("Lowongan tidak ditemukan.", 404);
    }

    const vacancy = vacancyResult.rows[0];

    const applicationResult = await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM recruitment_applications
        WHERE vacancy_id = $1
      `,
      [vacancyId],
    );

    if (applicationResult.rows[0].total > 0) {
      throw createServiceError(
        "Lowongan sudah memiliki lamaran dan tidak dapat dihapus. Gunakan status archived.",
        409,
      );
    }

    await client.query(
      `
        DELETE FROM recruitment_vacancies
        WHERE id = $1
      `,
      [vacancyId],
    );

    await createAuditLog(
      {
        userId: actorId,
        branchId: vacancy.branchId,
        action: "RECRUITMENT_VACANCY_DELETED",
        entityTable: "recruitment_vacancies",
        entityId: vacancyId,
        oldValues: vacancy,
        newValues: null,
        ipAddress,
        userAgent,
      },
      client,
    );

    return {
      id: vacancyId,
      vacancyCode: vacancy.vacancyCode,
      deleted: true,
    };
  });
}
