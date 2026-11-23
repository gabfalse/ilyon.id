import { z } from "zod";

// ==========================================
// ENUM / PILIHAN NILAI
// ==========================================

const enrollmentStatus = z.enum([
  "pending",
  "active",
  "paused",
  "completed",
  "cancelled",
]);

const billingPeriod = z.enum([
  "per_session",
  "weekly",
  "monthly",
  "package",
  "custom",
]);

// ==========================================
// VALIDASI TANGGAL
// ==========================================

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.");

// ==========================================
// CREATE ENROLLMENT
// ==========================================

export const createEnrollmentSchema = z
  .object({
    studentId: z.string().uuid("ID siswa tidak valid."),

    programId: z.string().uuid("ID program tidak valid."),

    offeringId: z.string().uuid("ID offering tidak valid."),

    startDate: dateSchema.optional(),

    endDate: dateSchema.nullable().optional(),

    status: enrollmentStatus.default("active"),

    agreedPrice: z.number().min(0).optional(),

    billingPeriod: billingPeriod.nullable().optional(),

    notes: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) =>
      data.startDate == null ||
      data.endDate == null ||
      data.endDate >= data.startDate,
    {
      message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      path: ["endDate"],
    },
  );

// ==========================================
// UPDATE ENROLLMENT
// ==========================================

export const updateEnrollmentSchema = z
  .object({
    startDate: dateSchema.optional(),

    endDate: dateSchema.nullable().optional(),

    agreedPrice: z.number().min(0).optional(),

    billingPeriod: billingPeriod.nullable().optional(),

    notes: z.string().trim().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu data Enrollment harus diisi.",
  })
  .refine(
    (data) =>
      data.startDate == null ||
      data.endDate == null ||
      data.endDate >= data.startDate,
    {
      message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      path: ["endDate"],
    },
  );

// ==========================================
// UPDATE ENROLLMENT STATUS
// ==========================================

export const updateEnrollmentStatusSchema = z.object({
  status: enrollmentStatus,
});
