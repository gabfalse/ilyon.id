
import { z } from "zod";

// ==========================================
// CREATE BRANCH VALIDATOR
// ==========================================

export const createBranchSchema = z.object({
  branchCode: z
    .string()
    .trim()
    .min(2, "Kode cabang minimal 2 karakter")
    .max(30, "Kode cabang maksimal 30 karakter")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Kode cabang hanya boleh berisi huruf, angka, - dan _"
    ),

  branchName: z
    .string()
    .trim()
    .min(3, "Nama cabang minimal 3 karakter")
    .max(150, "Nama cabang maksimal 150 karakter"),

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
  .max(180)
  .transform((value) => value || null)
  .pipe(z.string().email("Format email tidak valid").nullable())
  .nullish(),

  address: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform((value) => value || null),

  city: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((value) => value || null),

  province: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((value) => value || null),

  postalCode: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .transform((value) => value || null),

  isHeadOffice: z.boolean().default(false),

  openedAt: z
    .iso
    .date()
    .nullable()
    .optional(),
});

// ==========================================
// UPDATE BRANCH VALIDATOR
// ==========================================

export const updateBranchSchema = createBranchSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "Minimal satu data harus diubah",
    }
  );

// ==========================================
// UPDATE BRANCH STATUS VALIDATOR
// ==========================================

export const updateBranchStatusSchema = z.object({
  isActive: z.boolean({
    error: "Status cabang harus berupa true atau false",
  }),
});
