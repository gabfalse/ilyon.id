import { z } from "zod";

// ==========================================
// STUDENT ENUM
// ==========================================

const studentGender = z.enum(["male", "female", "other", "unspecified"]);

const studentStatus = z.enum([
  "active",
  "inactive",
  "graduated",
  "transferred",
  "withdrawn",
]);

// ==========================================
// CREATE STUDENT VALIDATOR
// ==========================================

export const createStudentSchema = z.object({
  primaryBranchId: z
    .uuid("ID cabang tidak valid")
    .nullable()
    .optional()
    .transform((value) => value || null),

  fullName: z
    .string()
    .trim()
    .min(2, "Nama siswa minimal 2 karakter")
    .max(180, "Nama siswa maksimal 180 karakter"),

  nickname: z
    .string()
    .trim()
    .max(100, "Nama panggilan maksimal 100 karakter")
    .nullish()
    .transform((value) => value || null),

  gender: studentGender.nullish().transform((value) => value || null),

  birthDate: z.iso
    .date()
    .nullable()
    .optional()
    .transform((value) => value || null),

  schoolName: z
    .string()
    .trim()
    .max(180, "Nama sekolah maksimal 180 karakter")
    .nullish()
    .transform((value) => value || null),

  schoolGrade: z
    .string()
    .trim()
    .max(80, "Kelas sekolah maksimal 80 karakter")
    .nullish()
    .transform((value) => value || null),

  schoolDismissalTime: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
      "Format jam pulang sekolah harus HH:MM atau HH:MM:SS",
    )
    .nullable()
    .optional()
    .transform((value) => value || null),

  address: z
    .string()
    .trim()
    .max(5000, "Alamat maksimal 5000 karakter")
    .nullish()
    .transform((value) => value || null),

  city: z
    .string()
    .trim()
    .max(100, "Kota maksimal 100 karakter")
    .nullish()
    .transform((value) => value || null),

  province: z
    .string()
    .trim()
    .max(100, "Provinsi maksimal 100 karakter")
    .nullish()
    .transform((value) => value || null),

  studentPhone: z
    .string()
    .trim()
    .max(40, "Nomor telepon maksimal 40 karakter")
    .nullish()
    .transform((value) => value || null),

  notes: z
    .string()
    .trim()
    .max(5000, "Catatan maksimal 5000 karakter")
    .nullish()
    .transform((value) => value || null),

  status: studentStatus.default("active"),
});

// ==========================================
// UPDATE STUDENT VALIDATOR
// ==========================================

export const updateStudentSchema = createStudentSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu data harus diubah",
  });

// ==========================================
// UPDATE STUDENT STATUS VALIDATOR
// ==========================================

export const updateStudentStatusSchema = z.object({
  status: studentStatus,
});
