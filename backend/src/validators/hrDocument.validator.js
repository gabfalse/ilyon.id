import { z } from "zod";

// ==========================================
// DOCUMENT TYPES
// ==========================================

const documentTypes = [
  "identity",
  "education",
  "certification",
  "cv",
  "employment_contract",
  "employment_letter",
  "other",
];

// ==========================================
// SHARED DOCUMENT VALIDATION
// ==========================================

const hrDocumentShape = {
  documentType: z.enum(documentTypes, {
    error: "Jenis dokumen tidak valid",
  }),

  documentName: z
    .string()
    .trim()
    .min(2, "Nama dokumen minimal 2 karakter")
    .max(180, "Nama dokumen maksimal 180 karakter"),

  documentNumber: z
    .string()
    .trim()
    .max(100, "Nomor dokumen maksimal 100 karakter")
    .nullish()
    .transform((value) => value || null),

  issuedDate: z.iso
    .date("Tanggal penerbitan tidak valid")
    .nullish()
    .transform((value) => value || null),

  expiryDate: z.iso
    .date("Tanggal kedaluwarsa tidak valid")
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
// SHARED DATE VALIDATION
// ==========================================

function validateDocumentDates(data, ctx) {
  if (data.issuedDate && data.expiryDate && data.expiryDate < data.issuedDate) {
    ctx.addIssue({
      code: "custom",
      message: "Tanggal kedaluwarsa tidak boleh sebelum tanggal penerbitan",
      path: ["expiryDate"],
    });
  }
}

// ==========================================
// CREATE DOCUMENT VALIDATOR
// ==========================================

export const createHrDocumentSchema = z
  .object({
    ...hrDocumentShape,

    hrPersonProfileId: z.uuid("ID profil HR tidak valid"),
  })
  .superRefine(validateDocumentDates);

// ==========================================
// UPDATE DOCUMENT METADATA VALIDATOR
// ==========================================

export const updateHrDocumentSchema = z
  .object({
    documentType: hrDocumentShape.documentType,
    documentName: hrDocumentShape.documentName,
    documentNumber: hrDocumentShape.documentNumber,
    issuedDate: hrDocumentShape.issuedDate,
    expiryDate: hrDocumentShape.expiryDate,
    notes: hrDocumentShape.notes,
  })
  .superRefine(validateDocumentDates);

// ==========================================
// VERIFY / REJECT DOCUMENT VALIDATOR
// ==========================================

export const verifyHrDocumentSchema = z.object({
  verificationStatus: z.enum(["verified", "rejected"], {
    error: "Status verifikasi tidak valid",
  }),
});
