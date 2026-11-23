import { z } from "zod";

// ==========================================
// SHARED STAFF PROFILE VALIDATION
// ==========================================

const staffProfileShape = {
  fullName: z
    .string()
    .trim()
    .min(2, "Nama staff minimal 2 karakter")
    .max(180, "Nama staff maksimal 180 karakter"),

  email: z
    .string()
    .trim()
    .email("Format email tidak valid")
    .max(180, "Email maksimal 180 karakter")
    .or(z.literal(""))
    .nullish()
    .transform((value) => value || null),

  phone: z
    .string()
    .trim()
    .max(40, "Nomor telepon maksimal 40 karakter")
    .nullish()
    .transform((value) => value || null),

  staffCode: z
    .string()
    .trim()
    .max(40, "Kode staff maksimal 40 karakter")
    .nullish()
    .transform((value) => value || null),

  jobTitle: z
    .string()
    .trim()
    .max(120, "Jabatan maksimal 120 karakter")
    .nullish()
    .transform((value) => value || null),

  employmentStatus: z
    .enum(["active", "inactive", "resigned", "on_leave"])
    .default("active"),

  joinDate: z.iso
    .date("Tanggal bergabung tidak valid")
    .nullish()
    .transform((value) => value || null),

  notes: z
    .string()
    .trim()
    .max(5000, "Catatan maksimal 5000 karakter")
    .nullish()
    .transform((value) => value || null),
};

// ==========================================
// SHARED VALIDATION
// ==========================================

function validateStaffData(data, ctx) {
  if (!data.email && !data.phone) {
    ctx.addIssue({
      code: "custom",
      message: "Email atau nomor telepon wajib diisi",
      path: ["email"],
    });
  }
}

// ==========================================
// CREATE STAFF VALIDATOR
// ==========================================

export const createStaffSchema = z
  .object({
    ...staffProfileShape,

    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(128, "Password maksimal 128 karakter"),

    branchId: z.uuid("ID cabang tidak valid"),

    assignedFrom: z.iso.date("Tanggal mulai penugasan tidak valid").optional(),
  })
  .superRefine(validateStaffData);

// ==========================================
// UPDATE STAFF VALIDATOR
// ==========================================

export const updateStaffSchema = z
  .object({
    ...staffProfileShape,
  })
  .superRefine(validateStaffData);

// ==========================================
// TRANSFER STAFF VALIDATOR
// ==========================================

export const transferStaffSchema = z.object({
  branchId: z.uuid("ID cabang tujuan tidak valid"),

  assignedFrom: z.iso
    .date("Tanggal efektif perpindahan tidak valid")
    .optional(),

  reason: z
    .string()
    .trim()
    .max(1000, "Alasan perpindahan maksimal 1000 karakter")
    .nullish()
    .transform((value) => value || null),
});

// ==========================================
// UPDATE STAFF STATUS VALIDATOR
// ==========================================

export const updateStaffStatusSchema = z.object({
  isActive: z.boolean({
    error: "Status akun harus berupa boolean",
  }),
});
