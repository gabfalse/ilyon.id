import { z } from "zod";

// ==========================================
// TUTOR BRANCH ASSIGNMENT VALIDATOR
// ==========================================

const tutorBranchAssignmentSchema = z
  .object({
    id: z.uuid("ID penugasan tidak valid").optional(),

    branchId: z.uuid("ID cabang tidak valid"),

    assignedFrom: z.iso.date("Tanggal mulai penugasan tidak valid").optional(),

    assignedUntil: z.iso.date("Tanggal akhir penugasan tidak valid").nullish(),

    isPrimary: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (!data.assignedFrom || !data.assignedUntil) {
        return true;
      }

      return data.assignedUntil >= data.assignedFrom;
    },
    {
      message: "Tanggal akhir tidak boleh sebelum tanggal mulai",
      path: ["assignedUntil"],
    },
  );
// ==========================================
// SHARED TUTOR VALIDATION
// ==========================================

function validateTutorData(data, ctx) {
  // Email atau nomor telepon wajib tersedia
  if (!data.email && !data.phone) {
    ctx.addIssue({
      code: "custom",
      message: "Email atau nomor telepon wajib diisi",
      path: ["email"],
    });
  }

  const assignments = data.branchAssignments;

  // ==========================================
  // VALIDASI PERIODE PENUGASAN
  // ==========================================

  for (let i = 0; i < assignments.length; i++) {
    for (let j = i + 1; j < assignments.length; j++) {
      const first = assignments[i];
      const second = assignments[j];

      if (first.branchId !== second.branchId) {
        continue;
      }

      // Jika satu cabang memiliki beberapa periode,
      // tanggal mulai masing-masing periode wajib diisi.
      if (!first.assignedFrom || !second.assignedFrom) {
        ctx.addIssue({
          code: "custom",
          message:
            "Tanggal mulai wajib diisi jika cabang memiliki beberapa periode penugasan",
          path: ["branchAssignments", j, "assignedFrom"],
        });

        continue;
      }

      // null berarti tidak memiliki batas akhir.
      const firstEnd = first.assignedUntil ?? "9999-12-31";
      const secondEnd = second.assignedUntil ?? "9999-12-31";

      const overlaps =
        first.assignedFrom <= secondEnd && second.assignedFrom <= firstEnd;

      if (overlaps) {
        ctx.addIssue({
          code: "custom",
          message:
            "Periode penugasan pada cabang yang sama tidak boleh tumpang tindih",
          path: ["branchAssignments", j],
        });
      }
    }
  }
}

// ==========================================
// TUTOR PROFILE FIELDS
// ==========================================

const tutorProfileShape = {
  fullName: z
    .string()
    .trim()
    .min(2, "Nama tutor minimal 2 karakter")
    .max(180, "Nama tutor maksimal 180 karakter"),

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

  tutorCode: z
    .string()
    .trim()
    .max(50, "Kode tutor maksimal 50 karakter")
    .nullish()
    .transform((value) => value || null),

  educationLevel: z
    .string()
    .trim()
    .max(100, "Jenjang pendidikan maksimal 100 karakter")
    .nullish()
    .transform((value) => value || null),

  educationMajor: z
    .string()
    .trim()
    .max(180, "Jurusan maksimal 180 karakter")
    .nullish()
    .transform((value) => value || null),

  experienceYears: z
    .number()
    .min(0, "Pengalaman tidak boleh negatif")
    .nullish()
    .transform((value) => value ?? null),

  expertise: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Keahlian tidak boleh kosong")
        .max(100, "Keahlian maksimal 100 karakter"),
    )
    .nullish()
    .transform((value) => value || []),

  employmentStatus: z
    .enum(["active", "inactive", "resigned", "on_leave"])
    .default("active"),

  joinDate: z.iso
    .date("Tanggal bergabung tidak valid")
    .nullish()
    .transform((value) => value || null),

  emergencyContactName: z
    .string()
    .trim()
    .max(180, "Nama kontak darurat maksimal 180 karakter")
    .nullish()
    .transform((value) => value || null),

  emergencyContactPhone: z
    .string()
    .trim()
    .max(40, "Nomor kontak darurat maksimal 40 karakter")
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

  branchAssignments: z
    .array(tutorBranchAssignmentSchema)
    .min(1, "Tutor harus ditugaskan ke minimal satu cabang"),
};

// ==========================================
// CREATE TUTOR VALIDATOR
// ==========================================

export const createTutorSchema = z
  .object({
    ...tutorProfileShape,

    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(128, "Password maksimal 128 karakter"),
  })
  .superRefine(validateTutorData);

// ==========================================
// UPDATE TUTOR VALIDATOR
// ==========================================

export const updateTutorSchema = z
  .object(tutorProfileShape)
  .superRefine(validateTutorData);
