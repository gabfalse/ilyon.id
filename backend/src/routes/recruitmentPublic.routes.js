import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";

import {
  getVacancies,
  applyForVacancy,
  checkApplicationStatus,
} from "../controllers/recruitmentPublic.controller.js";

import {
  verifyOrigin,
  verifyRecruitmentCsrfToken,
  issueRecruitmentCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  uploadRecruitmentCv,
  validateRecruitmentCvFile,
} from "../middlewares/recruitmentUpload.middleware.js";

import {
  submitApplicationSchema,
  trackApplicationSchema,
} from "../validators/recruitment.validator.js";

import { rateLimit } from "express-rate-limit";

const router = Router();

// ==========================================
// RATE LIMITERS
// ==========================================

const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Terlalu banyak percobaan mengirim lamaran. Silakan coba lagi nanti.",
  },
});

const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Terlalu banyak percobaan melacak lamaran. Silakan coba lagi nanti.",
  },
});

// ==========================================
// VALIDATION
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

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/recruitment/public/vacancies
// Tetap bisa diakses tanpa login
router.get("/vacancies", getVacancies);

// POST /api/recruitment/public/applications
// Wajib login untuk mengirim lamaran
router.post(
  "/applications",
  authenticate,
  verifyOrigin,
  verifyRecruitmentCsrfToken,
  applicationLimiter,
  uploadRecruitmentCv,
  validateRecruitmentCvFile,
  validateBody(submitApplicationSchema),
  applyForVacancy,
);

// POST /api/recruitment/public/track
// Tetap bisa diakses tanpa login
router.post(
  "/track",
  verifyOrigin,
  verifyRecruitmentCsrfToken,
  trackingLimiter,
  validateBody(trackApplicationSchema),
  checkApplicationStatus,
);

// ==========================================
// PUBLIC CSRF
// ==========================================

// GET /api/recruitment/public/csrf
router.get("/csrf", issueRecruitmentCsrfToken);

export default router;
