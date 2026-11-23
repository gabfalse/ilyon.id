import { z } from "zod";

// ==========================================
// ENUM
// ==========================================

const employmentTypes = ["full_time", "part_time", "contract", "internship"];

const vacancyStatuses = ["draft", "published", "closed", "archived"];

const applicationStatuses = [
  "submitted",
  "screening",
  "shortlisted",
  "interview",
  "accepted",
  "rejected",
  "talent_pool",
  "withdrawn",
];

const interviewTypes = ["onsite", "online", "phone"];

const interviewStatuses = ["scheduled", "completed", "cancelled", "no_show"];

const interviewOutcomes = ["pending", "passed", "failed", "hold"];

// ==========================================
// HELPERS
// ==========================================

const optionalText = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  return value;
}, z.string().nullable().optional());

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    }

    return value;
  },
  z
    .string()
    .url("Format URL tidak valid.")
    .refine((value) => {
      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
      } catch {
        return false;
      }
    }, "URL harus menggunakan HTTP atau HTTPS.")
    .nullable()
    .optional(),
);

const uuidSchema = z.uuid("ID tidak valid.");

const emailSchema = z
  .string()
  .trim()
  .email("Format email tidak valid.")
  .max(255, "Email maksimal 255 karakter.")
  .transform((value) => value.toLowerCase());

// ==========================================
// VACANCY VALIDATOR
// ==========================================

export const createVacancySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Judul lowongan minimal 3 karakter.")
    .max(150),

  branchId: uuidSchema.nullable().optional(),

  employmentType: z.enum(employmentTypes),

  location: optionalText,

  description: z.string().trim().min(10, "Deskripsi minimal 10 karakter."),

  responsibilities: optionalText,

  requirements: z.string().trim().min(10, "Persyaratan minimal 10 karakter."),

  openings: z.coerce.number().int().min(1, "Jumlah posisi minimal 1."),

  closesAt: z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim() === "") {
        return null;
      }

      return value;
    },
    z.iso
      .datetime({
        offset: true,
        message: "Tanggal penutupan lowongan tidak valid.",
      })
      .nullable()
      .optional(),
  ),
});

export const updateVacancySchema = createVacancySchema.partial().extend({
  status: z.enum(vacancyStatuses).optional(),
});

// ==========================================
// APPLICATION TRACKING VALIDATOR
// ==========================================

export const trackApplicationSchema = z.object({
  applicationNumber: z.string().trim().min(5).max(50),

  trackingToken: z.string().min(32).max(200),
});

// ==========================================
// SUBMIT APPLICATION VALIDATOR
// ==========================================

export const submitApplicationSchema = z.object({
  vacancyId: uuidSchema,

  fullName: z
    .string()
    .trim()
    .min(3, "Nama lengkap minimal 3 karakter.")
    .max(150, "Nama lengkap maksimal 150 karakter."),

  email: emailSchema,

  phone: z
    .string()
    .trim()
    .min(8, "Nomor telepon minimal 8 karakter.")
    .max(30, "Nomor telepon maksimal 30 karakter."),

  address: optionalText,
  city: optionalText,
  province: optionalText,

  educationLevel: z
    .string()
    .trim()
    .min(1, "Pendidikan terakhir wajib diisi.")
    .max(100),

  educationMajor: optionalText,

  experienceYears: z.coerce
    .number()
    .int()
    .min(0, "Pengalaman kerja tidak boleh negatif.")
    .max(80, "Pengalaman kerja tidak valid.")
    .default(0),

  currentOccupation: optionalText,

  coverLetter: optionalText,

  portfolioUrl: optionalUrl,
});

// ==========================================
// APPLICATION STATUS VALIDATOR
// ==========================================

export const updateApplicationStatusSchema = z.object({
  status: z.enum(applicationStatuses),

  notes: optionalText,
});

// ==========================================
// INTERVIEW VALIDATOR
// ==========================================

export const createInterviewSchema = z.object({
  interviewType: z.enum(interviewTypes),

  scheduledAt: z.iso.datetime({
    offset: true,
    message: "Tanggal wawancara tidak valid.",
  }),

  durationMinutes: z.coerce.number().int().min(15).max(480).default(60),

  locationOrLink: optionalText,

  interviewerId: uuidSchema,

  interviewRound: z.coerce.number().int().min(1).default(1),
});

export const updateInterviewSchema = z.object({
  interviewType: z.enum(interviewTypes).optional(),

  scheduledAt: z.iso
    .datetime({
      offset: true,
    })
    .optional(),

  durationMinutes: z.coerce.number().int().min(15).max(480).optional(),

  locationOrLink: optionalText,

  interviewerId: uuidSchema.optional(),

  status: z.enum(interviewStatuses).optional(),

  outcome: z.enum(interviewOutcomes).optional(),

  internalNotes: optionalText,
});

// ==========================================
// EVALUATION VALIDATOR
// ==========================================

export const createEvaluationSchema = z.object({
  interviewId: uuidSchema.nullable().optional(),

  evaluationStage: z.enum(["screening", "interview", "final"]),

  score: z.coerce.number().min(0).max(100).nullable().optional(),

  recommendation: z.enum(["pending", "recommended", "not_recommended", "hold"]),

  strengths: optionalText,

  weaknesses: optionalText,

  internalNotes: optionalText,
});

export const applicationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(150).optional(),
  status: z.enum(applicationStatuses).optional(),
  vacancyId: uuidSchema.optional(),
});

export const applicationIdParamsSchema = z.object({
  id: uuidSchema,
});

export const applicationDocumentParamsSchema = z.object({
  applicationId: uuidSchema,
  documentId: uuidSchema,
});