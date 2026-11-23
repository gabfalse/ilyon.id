import { Router } from "express";
import { z } from "zod";

import {
  listHrDocuments,
  detailHrDocument,
  storeHrDocument,
  updateHrDocumentController,
  replaceHrDocumentFileController,
  verifyHrDocumentController,
  downloadHrDocumentController,
  deleteHrDocumentController,
} from "../controllers/hrDocument.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  uploadHrDocument,
  validateHrDocumentFile,
} from "../middlewares/hrDocumentUpload.middleware.js";

import {
  createHrDocumentSchema,
  updateHrDocumentSchema,
  verifyHrDocumentSchema,
} from "../validators/hrDocument.validator.js";

const router = Router();

// ==========================================
// VALIDATION HELPERS
// ==========================================

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Data yang dikirim tidak valid.",
        errors: result.error.issues,
      });
    }

    req.body = result.data;
    return next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Parameter tidak valid.",
        errors: result.error.issues,
      });
    }

    req.params = result.data;
    return next();
  };
}

// ==========================================
// MULTIPART METADATA PARSER
// ==========================================
function parseMultipartMetadata(req, res, next) {
  try {
    const optionalFields = [
      "documentNumber",
      "issuedDate",
      "expiryDate",
      "notes",
    ];

    for (const field of optionalFields) {
      if (req.body[field] === "") {
        req.body[field] = null;
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
// ==========================================
// UUID VALIDATION
// ==========================================

const documentIdSchema = z.object({
  id: z.uuid("ID dokumen HR tidak valid"),
});

const profileIdSchema = z.object({
  profileId: z.uuid("ID profil HR tidak valid"),
});

// ==========================================
// AUTHORIZATION
// ==========================================

router.use(authenticate, requireRole("super_admin"));

// ==========================================
// GET: DAFTAR DOKUMEN PROFIL HR
// ==========================================

router.get(
  "/profile/:profileId",
  validateParams(profileIdSchema),
  listHrDocuments,
);

// ==========================================
// GET: DETAIL DOKUMEN
// ==========================================

router.get("/:id", validateParams(documentIdSchema), detailHrDocument);

// ==========================================
// POST: UPLOAD DOKUMEN HR
// ==========================================

router.post(
  "/",
  verifyOrigin,
  verifyCsrfToken,
  uploadHrDocument,
  parseMultipartMetadata,
  validateHrDocumentFile,
  validate(createHrDocumentSchema),
  storeHrDocument,
);

// ==========================================
// PUT: UPDATE METADATA
// ==========================================

router.put(
  "/:id",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(documentIdSchema),
  validate(updateHrDocumentSchema),
  updateHrDocumentController,
);

// ==========================================
// PATCH: REPLACE FILE
// ==========================================

router.patch(
  "/:id/replace",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(documentIdSchema),
  uploadHrDocument,
  validateHrDocumentFile,
  replaceHrDocumentFileController,
);

// ==========================================
// PATCH: VERIFY / REJECT
// ==========================================

router.patch(
  "/:id/verification",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(documentIdSchema),
  validate(verifyHrDocumentSchema),
  verifyHrDocumentController,
);

// ==========================================
// GET: DOWNLOAD URL
// ==========================================

router.get(
  "/:id/download",
  validateParams(documentIdSchema),
  downloadHrDocumentController,
);

// ==========================================
// DELETE: HAPUS DOKUMEN
// ==========================================

router.delete(
  "/:id",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(documentIdSchema),
  deleteHrDocumentController,
);

export default router;
