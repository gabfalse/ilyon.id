import { z } from "zod";

export const createSubjectSchema = z.object({
  subjectCode: z
    .string()
    .trim()
    .min(2, "Kode mata pelajaran minimal 2 karakter.")
    .max(50, "Kode mata pelajaran maksimal 50 karakter.")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Kode hanya boleh berisi huruf, angka, garis bawah, dan tanda hubung.",
    ),
  subjectName: z
    .string()
    .trim()
    .min(2, "Nama mata pelajaran minimal 2 karakter.")
    .max(150, "Nama mata pelajaran maksimal 150 karakter."),
  description: z.string().trim().max(1000).nullable().optional(),
});

export const updateSubjectSchema = z
  .object({
    subjectCode: z
      .string()
      .trim()
      .min(2)
      .max(50)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    subjectName: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu data harus diubah.",
  });

export const updateSubjectStatusSchema = z.object({
  isActive: z.boolean({
    required_error: "Status aktif wajib diisi.",
  }),
});

export const updateProgramSubjectsSchema = z.object({
  subjects: z.array(
    z.object({
      subjectId: z.string().uuid("ID mata pelajaran tidak valid."),
      isRequired: z.boolean().default(false),
    }),
  ),
});
