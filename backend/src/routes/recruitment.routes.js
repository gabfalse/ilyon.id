import { Router } from "express";
import { z } from "zod";

import {
  getVacancies,
  getVacancyDetail,
  createVacancyHandler,
  updateVacancyHandler,
  updateVacancyStatusHandler,
  deleteVacancyHandler,
  sendTestEmailHandler,
} from "../controllers/recruitment.controller.js";

import {
  getApplications,
  getApplicationDetail,
  getApplicationDocument,
  getApplicationTrackingTokenHandler,
  updateApplicationStatusHandler,
} from "../controllers/recruitmentApplication.controller.js";

import { authenticate, requireRole } from "../middlewares/auth.middleware.js";

import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  createVacancySchema,
  updateVacancySchema,
  updateApplicationStatusSchema,
  applicationListQuerySchema,
  applicationIdParamsSchema,
  applicationDocumentParamsSchema,
} from "../validators/recruitment.validator.js";

const router = Router();

// ==========================================
// VALIDATION MIDDLEWARE
// ==========================================

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Data yang dikirim tidak valid.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    req.body = result.data;
    next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Parameter yang dikirim tidak valid.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    res.locals.validatedParams = {
      ...req.params,
      ...result.data,
    };

    req.params = res.locals.validatedParams;

    next();
  };
}

// ==========================================
// PARAMETER SCHEMAS
// ==========================================

const vacancyIdSchema = z.object({
  vacancyId: z.string().uuid("ID lowongan tidak valid."),
});

const vacancyStatusSchema = z.object({
  status: z.enum(["draft", "published", "closed", "archived"]),
});

// ==========================================
// QUERY VALIDATION
// ==========================================

function validateVacancyQuery(req, res, next) {
  const querySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().max(200).optional(),
    status: z.enum(["draft", "published", "closed", "archived"]).optional(),
    employmentType: z
      .enum(["full_time", "part_time", "contract", "internship"])
      .optional(),
  });

  const result = querySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Parameter pencarian tidak valid.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  res.locals.validatedVacancyQuery = result.data;
  next();
}

function validateApplicationQuery(req, res, next) {
  const result = applicationListQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Parameter pencarian lamaran tidak valid.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  res.locals.validatedApplicationQuery = result.data;
  next();
}

// ==========================================
// AUTHORIZATION
// ==========================================

router.use(authenticate, requireRole("super_admin"));

// ==========================================
// EMAIL TEST ROUTE
// ==========================================

router.post("/email/test", verifyOrigin, verifyCsrfToken, sendTestEmailHandler);

// ==========================================
// APPLICATION ROUTES
// ==========================================

// Daftar lamaran kandidat
router.get(
  "/applications",
  validateApplicationQuery,
  (req, res, next) => {
    req.validatedApplicationQuery = res.locals.validatedApplicationQuery;
    next();
  },
  getApplications,
);

// Detail lamaran kandidat
router.get(
  "/applications/:id",
  validateParams(applicationIdParamsSchema),
  getApplicationDetail,
);
// Mengambil token pelacakan milik pelamar
router.get(
  "/applications/:id/tracking-token",
  validateParams(applicationIdParamsSchema),
  getApplicationTrackingTokenHandler,
);
// Membuat signed URL untuk dokumen privat
router.get(
  "/applications/:applicationId/documents/:documentId",
  validateParams(applicationDocumentParamsSchema),
  getApplicationDocument,
);

// Memperbarui status lamaran
router.patch(
  "/applications/:id/status",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(applicationIdParamsSchema),
  validateBody(updateApplicationStatusSchema),
  updateApplicationStatusHandler,
);

// ==========================================
// VACANCY ROUTES
// ==========================================

router.get(
  "/vacancies",
  validateVacancyQuery,
  (req, res, next) => {
    req.validatedVacancyQuery = res.locals.validatedVacancyQuery;
    next();
  },
  getVacancies,
);

router.get(
  "/vacancies/:vacancyId",
  validateParams(vacancyIdSchema),
  getVacancyDetail,
);

router.post(
  "/vacancies",
  verifyOrigin,
  verifyCsrfToken,
  validateBody(createVacancySchema),
  createVacancyHandler,
);

router.patch(
  "/vacancies/:vacancyId",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(vacancyIdSchema),
  validateBody(updateVacancySchema),
  updateVacancyHandler,
);

router.patch(
  "/vacancies/:vacancyId/status",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(vacancyIdSchema),
  validateBody(vacancyStatusSchema),
  updateVacancyStatusHandler,
);

router.delete(
  "/vacancies/:vacancyId",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(vacancyIdSchema),
  deleteVacancyHandler,
);

export default router;
