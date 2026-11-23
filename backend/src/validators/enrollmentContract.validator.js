import { z } from "zod";

// ==========================================
// ENUM / PILIHAN NILAI
// ==========================================

const contractStatus = z.enum([
  "pending",
  "active",
  "paused",
  "completed",
  "cancelled",
]);

const contractMemberStatus = z.enum(["active", "completed", "left"]);

// ==========================================
// VALIDASI TANGGAL
// ==========================================

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Tanggal tidak valid.");

// ==========================================
// VALIDASI ANGGOTA CONTRACT
// ==========================================

const contractMemberSchema = z.object({
  enrollmentId: z.string().uuid("ID Enrollment tidak valid."),

  contributionAmount: z
    .number()
    .finite("Kontribusi harus berupa angka yang valid.")
    .min(0, "Kontribusi tidak boleh negatif."),

  joinedAt: dateSchema.optional(),

  notes: z.string().trim().nullable().optional(),
});

// ==========================================
// CREATE ENROLLMENT CONTRACT
// ==========================================

export const createEnrollmentContractSchema = z
  .object({
    contractCode: z
      .string()
      .trim()
      .min(2, "Kode kontrak minimal 2 karakter.")
      .max(50, "Kode kontrak maksimal 50 karakter.")
      .regex(
        /^[A-Z0-9_-]+$/,
        "Kode kontrak hanya boleh menggunakan huruf kapital, angka, underscore, dan tanda hubung.",
      ),

    startDate: dateSchema.optional(),

    endDate: dateSchema.nullable().optional(),

    totalPrice: z
      .number()
      .finite("Total harga harus berupa angka yang valid.")
      .min(0, "Total harga tidak boleh negatif."),

    status: contractStatus.default("pending"),

    notes: z.string().trim().nullable().optional(),

    members: z
      .array(contractMemberSchema)
      .min(1, "Minimal satu Enrollment harus dimasukkan ke Contract."),
  })
  .superRefine((data, ctx) => {
    // ----------------------------------------
    // VALIDASI TANGGAL
    // ----------------------------------------

    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
        path: ["endDate"],
      });
    }

    // ----------------------------------------
    // VALIDASI DUPLIKASI ENROLLMENT
    // ----------------------------------------

    const enrollmentIds = data.members.map((member) => member.enrollmentId);

    const uniqueEnrollmentIds = new Set(enrollmentIds);

    if (uniqueEnrollmentIds.size !== enrollmentIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "Enrollment yang sama tidak boleh dimasukkan dua kali.",
        path: ["members"],
      });
    }
  });

// ==========================================
// UPDATE ENROLLMENT CONTRACT
// ==========================================

export const updateEnrollmentContractSchema = z
  .object({
    endDate: dateSchema.nullable().optional(),

    notes: z.string().trim().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu data Contract harus diubah.",
  });

// ==========================================
// UPDATE CONTRACT STATUS
// ==========================================

export const updateEnrollmentContractStatusSchema = z.object({
  status: contractStatus,
});

// ==========================================
// UPDATE CONTRACT MEMBER
// ==========================================

export const updateEnrollmentContractMemberSchema = z.object({
  status: contractMemberStatus,

  leftAt: dateSchema.nullable().optional(),

  notes: z.string().trim().nullable().optional(),
});
