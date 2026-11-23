import { z } from "zod";

// ==========================================
// PARENT PROFILE FIELDS
// ==========================================

const parentProfileFields = {
  fullName: z
    .string()
    .trim()
    .min(2, "Nama orang tua minimal 2 karakter")
    .max(180, "Nama orang tua maksimal 180 karakter"),

  relationshipLabel: z
    .string()
    .trim()
    .max(80, "Hubungan maksimal 80 karakter")
    .nullish()
    .transform((value) => value || null),

  phone: z
    .string()
    .trim()
    .max(40, "Nomor telepon maksimal 40 karakter")
    .nullish()
    .transform((value) => value || null),

  whatsapp: z
    .string()
    .trim()
    .max(40, "Nomor WhatsApp maksimal 40 karakter")
    .nullish()
    .transform((value) => value || null),

  email: z
    .string()
    .trim()
    .email("Format email tidak valid")
    .max(180, "Email maksimal 180 karakter")
    .or(z.literal(""))
    .nullish()
    .transform((value) => value || null),

  address: z
    .string()
    .trim()
    .max(5000, "Alamat maksimal 5000 karakter")
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
// CREATE PARENT VALIDATOR
// ==========================================

export const createParentSchema = z.object({
  userId: z.uuid("Akun pengguna tidak valid"),
  ...parentProfileFields,
});

// ==========================================
// UPDATE PARENT VALIDATOR
// ==========================================

export const updateParentSchema = z
  .object(parentProfileFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu data harus diubah",
  });

// ==========================================
// LINK PARENT WITH STUDENT VALIDATOR
// ==========================================

export const linkParentStudentSchema = z.object({
  studentId: z.uuid("ID siswa tidak valid"),

  relationshipLabel: z
    .string()
    .trim()
    .max(80, "Hubungan maksimal 80 karakter")
    .nullish()
    .transform((value) => value || null),

  isPrimaryContact: z.boolean().default(false),

  canViewProgress: z.boolean().default(false),

  canReceiveNotifications: z.boolean().default(false),
});

// ==========================================
// PARENT STUDENT CLAIM VALIDATOR
// ==========================================

export const createParentStudentClaimSchema = z
  .object({
    branchId: z.uuid("Unit tidak valid"),

    // Pilihan 1: siswa yang sudah terdaftar.
    requestedStudentId: z.uuid("ID siswa tidak valid").optional(),

    // Pilihan 2: siswa baru.
    studentName: z
      .string()
      .trim()
      .min(2, "Nama siswa minimal 2 karakter")
      .max(180, "Nama siswa maksimal 180 karakter")
      .optional(),

    birthDate: z.iso.date("Tanggal lahir tidak valid").optional(),

    whatsappNumber: z
      .string()
      .trim()
      .min(8, "Nomor WhatsApp minimal 8 karakter")
      .max(30, "Nomor WhatsApp maksimal 30 karakter"),

    relationshipLabel: z
      .string()
      .trim()
      .max(80, "Hubungan maksimal 80 karakter")
      .nullish()
      .transform((value) => value || null),
  })
  .refine(
    (data) =>
      (Boolean(data.requestedStudentId) &&
        !data.studentName &&
        !data.birthDate) ||
      (!data.requestedStudentId &&
        Boolean(data.studentName) &&
        Boolean(data.birthDate)),
    {
      message:
        "Pilih siswa terdaftar atau isi nama dan tanggal lahir siswa baru.",
      path: ["requestedStudentId"],
    },
  );

// ==========================================
// REJECT PARENT STUDENT CLAIM VALIDATOR
// ==========================================

export const rejectParentStudentClaimSchema = z.object({
  reviewNotes: z
    .string()
    .trim()
    .max(1000, "Catatan penolakan maksimal 1000 karakter")
    .nullish()
    .transform((value) => value || null),
});
