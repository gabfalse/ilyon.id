import { z } from "zod";

// ==========================================
// ENUM / PILIHAN NILAI
// ==========================================

const deliveryType = z.enum(["online", "onsite", "visit"]);

const learningMethod = z.enum(["regular", "private", "small_group", "clinic"]);

const billingPeriod = z.enum([
  "per_session",
  "weekly",
  "monthly",
  "package",
  "custom",
]);

const pricingUnit = z.enum(["per_student", "per_group"]);

// ==========================================
// VALIDASI DASAR PROGRAM
// ==========================================

const programBaseSchema = z.object({
  programCode: z
    .string()
    .trim()
    .min(2, "Kode program minimal 2 karakter.")
    .max(50, "Kode program maksimal 50 karakter.")
    .regex(
      /^[A-Z0-9_]+$/,
      "Kode program hanya boleh menggunakan huruf kapital, angka, dan underscore.",
    ),

  programName: z
    .string()
    .trim()
    .min(2, "Nama program minimal 2 karakter.")
    .max(150),

  description: z.string().trim().nullable().optional(),

  defaultDurationMinutes: z.number().int().positive().nullable().optional(),

  defaultPrice: z.number().min(0).default(0),

  minStudents: z.number().int().positive().nullable().optional(),

  maxStudents: z.number().int().positive().nullable().optional(),

  isActive: z.boolean().default(true),
});

// ==========================================
// CREATE PROGRAM
// ==========================================

export const createProgramSchema = programBaseSchema.refine(
  (data) =>
    data.minStudents == null ||
    data.maxStudents == null ||
    data.maxStudents >= data.minStudents,
  {
    message: "Maksimal siswa tidak boleh lebih kecil dari minimal siswa.",
    path: ["maxStudents"],
  },
);

// ==========================================
// UPDATE PROGRAM
// ==========================================

export const updateProgramSchema = programBaseSchema
  .partial()
  .refine(
    (data) =>
      data.minStudents == null ||
      data.maxStudents == null ||
      data.maxStudents >= data.minStudents,
    {
      message: "Maksimal siswa tidak boleh lebih kecil dari minimal siswa.",
      path: ["maxStudents"],
    },
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu data program harus diisi.",
  });

// ==========================================
// UPDATE STATUS PROGRAM
// ==========================================

export const updateProgramStatusSchema = z.object({
  isActive: z.boolean(),
});

// ==========================================
// VALIDASI DASAR PROGRAM OFFERING
// ==========================================

const offeringBaseSchema = z.object({
  offeringCode: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(
      /^[A-Z0-9_]+$/,
      "Kode offering hanya boleh menggunakan huruf kapital, angka, dan underscore.",
    ),

  offeringName: z
    .string()
    .trim()
    .min(2, "Nama offering minimal 2 karakter.")
    .max(150),

  deliveryType,

  learningMethod,

  billingPeriod,

  price: z.number().min(0).default(0),

  pricingUnit: pricingUnit.default("per_student"),

  meetingQuota: z.number().int().positive().nullable().optional(),

  isUnlimited: z.boolean().default(false),

  minStudents: z.number().int().positive().nullable().optional(),

  maxStudents: z.number().int().positive().nullable().optional(),

  sessionDurationMinutes: z.number().int().positive().nullable().optional(),

  isFlexibleDuration: z.boolean().default(false),

  description: z.string().trim().nullable().optional(),

  isActive: z.boolean().default(true),
});

// ==========================================
// CREATE OFFERING
// ==========================================

export const createOfferingSchema = offeringBaseSchema
  .refine(
    (data) =>
      data.minStudents == null ||
      data.maxStudents == null ||
      data.maxStudents >= data.minStudents,
    {
      message: "Maksimal siswa tidak boleh lebih kecil dari minimal siswa.",
      path: ["maxStudents"],
    },
  )
  .refine((data) => !data.isUnlimited || data.meetingQuota == null, {
    message:
      "Offering tanpa batas pertemuan tidak boleh memiliki kuota pertemuan.",
    path: ["meetingQuota"],
  });

// ==========================================
// UPDATE OFFERING
// ==========================================

export const updateOfferingSchema = offeringBaseSchema
  .partial()
  .refine(
    (data) =>
      data.minStudents == null ||
      data.maxStudents == null ||
      data.maxStudents >= data.minStudents,
    {
      message: "Maksimal siswa tidak boleh lebih kecil dari minimal siswa.",
      path: ["maxStudents"],
    },
  )
  .refine((data) => data.isUnlimited !== true || data.meetingQuota == null, {
    message:
      "Offering tanpa batas pertemuan tidak boleh memiliki kuota pertemuan.",
    path: ["meetingQuota"],
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu data offering harus diisi.",
  });

// ==========================================
// UPDATE STATUS OFFERING
// ==========================================

export const updateOfferingStatusSchema = z.object({
  isActive: z.boolean(),
});

import { pool } from "../config/database.js";

// ==========================================
// FIELD MAPPING
// ==========================================

const programFields = {
  programCode: "program_code",
  programName: "program_name",
  description: "description",
  defaultDurationMinutes: "default_duration_minutes",
  defaultPrice: "default_price",
  minStudents: "min_students",
  maxStudents: "max_students",
};

const offeringFields = {
  offeringCode: "offering_code",
  offeringName: "offering_name",
  deliveryType: "delivery_type",
  learningMethod: "learning_method",
  billingPeriod: "billing_period",
  price: "price",
  pricingUnit: "pricing_unit",
  meetingQuota: "meeting_quota",
  isUnlimited: "is_unlimited",
  minStudents: "min_students",
  maxStudents: "max_students",
  sessionDurationMinutes: "session_duration_minutes",
  isFlexibleDuration: "is_flexible_duration",
  description: "description",
};

// ==========================================
// SELECT HELPERS
// ==========================================

const programSelect = `
  SELECT
    id,
    program_code AS "programCode",
    program_name AS "programName",
    delivery_type AS "deliveryType",
    program_model AS "programModel",
    description,
    default_duration_minutes AS "defaultDurationMinutes",
    default_price AS "defaultPrice",
    billing_period AS "billingPeriod",
    min_students AS "minStudents",
    max_students AS "maxStudents",
    is_active AS "isActive",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM programs
`;

const offeringSelect = `
  SELECT
    po.id,
    po.program_id AS "programId",
    p.program_code AS "programCode",
    p.program_name AS "programName",
    po.offering_code AS "offeringCode",
    po.offering_name AS "offeringName",
    po.delivery_type AS "deliveryType",
    po.learning_method AS "learningMethod",
    po.billing_period AS "billingPeriod",
    po.price,
    po.pricing_unit AS "pricingUnit",
    po.meeting_quota AS "meetingQuota",
    po.is_unlimited AS "isUnlimited",
    po.min_students AS "minStudents",
    po.max_students AS "maxStudents",
    po.session_duration_minutes AS "sessionDurationMinutes",
    po.is_flexible_duration AS "isFlexibleDuration",
    po.description,
    po.is_active AS "isActive",
    po.created_at AS "createdAt",
    po.updated_at AS "updatedAt"
  FROM program_offerings po
  INNER JOIN programs p ON p.id = po.program_id
`;

// ==========================================
// PROGRAM
// ==========================================

// Mengambil seluruh program
export async function getAllPrograms({
  search = "",
  isActive,
  page = 1,
  limit = 10,
} = {}) {
  const conditions = [];
  const values = [];
  let index = 1;

  if (search) {
    conditions.push(`
      (
        program_name ILIKE $${index}
        OR program_code ILIKE $${index}
      )
    `);

    values.push(`%${search}%`);
    index++;
  }

  if (typeof isActive === "boolean") {
    conditions.push(`is_active = $${index}`);
    values.push(isActive);
    index++;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)
      FROM programs
      ${whereClause}
    `,
    values,
  );

  const dataResult = await pool.query(
    `
      ${programSelect}
      ${whereClause}
      ORDER BY created_at DESC
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

// Mengambil detail program
export async function getProgramById(id) {
  const result = await pool.query(
    `
      ${programSelect}
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
}

// Membuat program baru
export async function createProgram(data) {
  const fields = Object.keys(programFields).filter(
    (key) => data[key] !== undefined,
  );

  const columns = fields.map((key) => programFields[key]);
  const values = fields.map((key) => data[key]);

  const placeholders = fields.map((_, index) => `$${index + 1}`);

  const result = await pool.query(
    `
      INSERT INTO programs (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING id
    `,
    values,
  );

  return getProgramById(result.rows[0].id);
}

// Memperbarui program
export async function updateProgram(id, data) {
  const fields = Object.keys(programFields).filter(
    (key) => data[key] !== undefined,
  );

  if (fields.length === 0) {
    return getProgramById(id);
  }

  const assignments = fields.map(
    (key, index) => `${programFields[key]} = $${index + 1}`,
  );

  const values = fields.map((key) => data[key]);
  values.push(id);

  const result = await pool.query(
    `
      UPDATE programs
      SET
        ${assignments.join(", ")},
        updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id
    `,
    values,
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getProgramById(id);
}

// Mengubah status program
export async function updateProgramStatus(id, isActive) {
  const result = await pool.query(
    `
      UPDATE programs
      SET
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `,
    [isActive, id],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getProgramById(id);
}

// ==========================================
// PROGRAM OFFERING
// ==========================================

// Mengambil seluruh offering milik program
export async function getAllOfferingsByProgram(
  programId,
  { search = "", isActive, page = 1, limit = 10 } = {},
) {
  const conditions = ["po.program_id = $1"];
  const values = [programId];
  let index = 2;

  if (search) {
    conditions.push(`
      (
        po.offering_name ILIKE $${index}
        OR po.offering_code ILIKE $${index}
        OR po.learning_method ILIKE $${index}
        OR po.delivery_type ILIKE $${index}
      )
    `);

    values.push(`%${search}%`);
    index++;
  }

  if (typeof isActive === "boolean") {
    conditions.push(`po.is_active = $${index}`);
    values.push(isActive);
    index++;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)
      FROM program_offerings po
      ${whereClause}
    `,
    values,
  );

  const dataResult = await pool.query(
    `
      ${offeringSelect}
      ${whereClause}
      ORDER BY po.created_at DESC
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

// Mengambil seluruh offering aktif tanpa pagination
export async function getActiveOfferingsByProgram(programId) {
  const result = await pool.query(
    `
      ${offeringSelect}
      WHERE po.program_id = $1
        AND po.is_active = true
        AND p.is_active = true
      ORDER BY po.offering_name ASC
    `,
    [programId],
  );

  return result.rows;
}

// Mengambil detail offering
export async function getOfferingById(id) {
  const result = await pool.query(
    `
      ${offeringSelect}
      WHERE po.id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
}

// ==========================================
// PROGRAM - SUBJECT MAPPING
// ==========================================

// Memastikan program tersedia
async function ensureProgramExists(programId) {
  const result = await pool.query(
    `
      SELECT id
      FROM programs
      WHERE id = $1
      LIMIT 1
    `,
    [programId],
  );

  if (!result.rows[0]) {
    const error = new Error("Program tidak ditemukan.");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

// Mengambil satu relasi Program - Subject
async function getProgramSubjectById(programId, subjectId) {
  const result = await pool.query(
    `
      SELECT
        s.id AS "subjectId",
        s.subject_code AS "subjectCode",
        s.subject_name AS "subjectName",
        s.description,
        s.is_active AS "isActive",
        ps.program_id AS "programId",
        ps.is_required AS "isRequired",
        ps.created_at AS "createdAt"
      FROM program_subjects ps
      INNER JOIN subjects s
        ON s.id = ps.subject_id
      WHERE ps.program_id = $1
        AND ps.subject_id = $2
      LIMIT 1
    `,
    [programId, subjectId],
  );

  return result.rows[0] || null;
}

// Mengambil seluruh Subject yang terhubung ke Program
export async function getProgramSubjectsByProgram(programId) {
  await ensureProgramExists(programId);

  const result = await pool.query(
    `
      SELECT
        s.id AS "subjectId",
        s.subject_code AS "subjectCode",
        s.subject_name AS "subjectName",
        s.description,
        s.is_active AS "isActive",
        ps.program_id AS "programId",
        ps.is_required AS "isRequired",
        ps.created_at AS "createdAt"
      FROM program_subjects ps
      INNER JOIN subjects s
        ON s.id = ps.subject_id
      WHERE ps.program_id = $1
      ORDER BY s.subject_name ASC
    `,
    [programId],
  );

  return result.rows;
}

// Mengambil Subject yang belum terhubung ke Program
export async function getAvailableProgramSubjects(
  programId,
  { search = "" } = {},
) {
  await ensureProgramExists(programId);

  const values = [programId];
  let searchCondition = "";

  if (search.trim()) {
    values.push(`%${search.trim()}%`);

    searchCondition = `
      AND (
        s.subject_code ILIKE $2
        OR s.subject_name ILIKE $2
      )
    `;
  }

  const result = await pool.query(
    `
      SELECT
        s.id,
        s.subject_code AS "subjectCode",
        s.subject_name AS "subjectName",
        s.description,
        s.is_active AS "isActive"
      FROM subjects s
      WHERE NOT EXISTS (
        SELECT 1
        FROM program_subjects ps
        WHERE ps.program_id = $1
          AND ps.subject_id = s.id
      )
      ${searchCondition}
      ORDER BY s.subject_name ASC
    `,
    values,
  );

  return result.rows;
}

// Menambahkan Subject ke Program
export async function addSubjectToProgram(
  programId,
  { subjectId, isRequired = false },
) {
  await ensureProgramExists(programId);

  const subjectResult = await pool.query(
    `
      SELECT id
      FROM subjects
      WHERE id = $1
      LIMIT 1
    `,
    [subjectId],
  );

  if (!subjectResult.rows[0]) {
    const error = new Error("Subject tidak ditemukan.");
    error.statusCode = 404;
    throw error;
  }

  await pool.query(
    `
      INSERT INTO program_subjects (
        program_id,
        subject_id,
        is_required
      )
      VALUES ($1, $2, $3)
    `,
    [programId, subjectId, isRequired],
  );

  return getProgramSubjectById(programId, subjectId);
}

// Mengubah status wajib / pilihan Subject
export async function updateProgramSubject(programId, subjectId, isRequired) {
  const result = await pool.query(
    `
      UPDATE program_subjects
      SET is_required = $1
      WHERE program_id = $2
        AND subject_id = $3
      RETURNING program_id
    `,
    [isRequired, programId, subjectId],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getProgramSubjectById(programId, subjectId);
}

// Menghapus hubungan Subject dari Program
export async function removeProgramSubject(programId, subjectId) {
  const result = await pool.query(
    `
      DELETE FROM program_subjects
      WHERE program_id = $1
        AND subject_id = $2
      RETURNING program_id
    `,
    [programId, subjectId],
  );

  return result.rowCount > 0;
}

function normalizeOfferingPricing(data) {
  // Tidak ada penyesuaian otomatis.
  // Semua nilai mengikuti pilihan Admin.
  return {
    ...data,
  };
}

// ==========================================
// OFFERING BUSINESS VALIDATION
// ==========================================

async function validateOfferingRules(programId, data) {
  const programResult = await pool.query(
    `
      SELECT
        id,
        program_code,
        program_name
      FROM programs
      WHERE id = $1
      LIMIT 1
    `,
    [programId],
  );

  const program = programResult.rows[0];

  if (!program) {
    const error = new Error("Program tidak ditemukan.");
    error.statusCode = 404;
    throw error;
  }

  const { minStudents, maxStudents, isUnlimited, meetingQuota } = data;

  // ==========================================
  // VALIDASI JUMLAH SISWA
  // ==========================================

  // Tidak membatasi jumlah siswa berdasarkan metode belajar.
  // Hanya memastikan minimal tidak melebihi maksimal.
  if (minStudents != null && maxStudents != null && maxStudents < minStudents) {
    const error = new Error(
      "Maksimal siswa tidak boleh lebih kecil dari minimal siswa.",
    );
    error.statusCode = 400;
    throw error;
  }

  // ==========================================
  // VALIDASI KUOTA PERTEMUAN
  // ==========================================

  if (isUnlimited === true && meetingQuota != null) {
    const error = new Error(
      "Offering tanpa batas pertemuan tidak boleh memiliki kuota pertemuan.",
    );
    error.statusCode = 400;
    throw error;
  }

  return program;
}

// Membuat offering
export async function createOffering(programId, data) {
  const normalizedData = normalizeOfferingPricing(data);

  await validateOfferingRules(programId, normalizedData);

  const fields = Object.keys(offeringFields).filter(
    (key) => normalizedData[key] !== undefined,
  );

  const columns = ["program_id", ...fields.map((key) => offeringFields[key])];

  const values = [programId, ...fields.map((key) => normalizedData[key])];

  const placeholders = values.map((_, index) => `$${index + 1}`);

  const result = await pool.query(
    `
      INSERT INTO program_offerings (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING id
    `,
    values,
  );

  return getOfferingById(result.rows[0].id);
}

// Memperbarui offering

export async function updateOffering(id, data) {
  const current = await getOfferingById(id);

  if (!current) {
    return null;
  }

  const mergedData = {
    deliveryType: current.deliveryType,
    learningMethod: current.learningMethod,
    pricingUnit: current.pricingUnit,
    minStudents: current.minStudents,
    maxStudents: current.maxStudents,
    isUnlimited: current.isUnlimited,
    meetingQuota: current.meetingQuota,
    ...data,
  };

  const normalizedData = normalizeOfferingPricing(mergedData);

  await validateOfferingRules(current.programId, normalizedData);

  const fields = Object.keys(offeringFields).filter(
    (key) =>
      normalizedData[key] !== undefined &&
      (data[key] !== undefined ||
        (key === "pricingUnit" &&
          normalizedData.pricingUnit !== current.pricingUnit)),
  );
  if (fields.length === 0) {
    return current;
  }

  const assignments = fields.map(
    (key, index) => `${offeringFields[key]} = $${index + 1}`,
  );

  const values = fields.map((key) => normalizedData[key]);
  values.push(id);

  const result = await pool.query(
    `
      UPDATE program_offerings
      SET
        ${assignments.join(", ")},
        updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id
    `,
    values,
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getOfferingById(id);
}

// Mengubah status offering
export async function updateOfferingStatus(id, isActive) {
  const result = await pool.query(
    `
      UPDATE program_offerings
      SET
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `,
    [isActive, id],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getOfferingById(id);
}

// ==========================================
// PROGRAM - SUBJECT MAPPING
// ==========================================

// CREATE PROGRAM SUBJECT
export const createProgramSubjectSchema = z.object({
  subjectId: z.string().uuid("ID Subject tidak valid."),
  isRequired: z.boolean().default(false),
});

// UPDATE PROGRAM SUBJECT
export const updateProgramSubjectSchema = z.object({
  isRequired: z.boolean(),
});
