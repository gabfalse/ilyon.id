import { Router } from "express";

import {
  listEnrollments,
  detailEnrollment,
  storeEnrollment,
  editEnrollment,
  changeEnrollmentStatus,
} from "../controllers/enrollment.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  createEnrollmentSchema,
  updateEnrollmentSchema,
  updateEnrollmentStatusSchema,
} from "../validators/enrollment.validator.js";

// ==========================================
// VALIDATION MIDDLEWARE
// ==========================================

function validate(schema) {
  return function (req, res, next) {
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

    return next();
  };
}

const router = Router();

// ==========================================
// AUTHORIZATION
// Super Admin only
// ==========================================

router.use(authenticate, requireRole("super_admin"));

// ==========================================
// GET: DAFTAR ENROLLMENT
// ==========================================

router.get("/", listEnrollments);

// ==========================================
// GET: DETAIL ENROLLMENT
// ==========================================

router.get("/:id", detailEnrollment);

// ==========================================
// POST: TAMBAH ENROLLMENT
// ==========================================

router.post(
  "/",
  verifyOrigin,
  verifyCsrfToken,
  validate(createEnrollmentSchema),
  storeEnrollment,
);

// ==========================================
// PUT: EDIT ENROLLMENT
// ==========================================

router.put(
  "/:id",
  verifyOrigin,
  verifyCsrfToken,
  validate(updateEnrollmentSchema),
  editEnrollment,
);

// ==========================================
// PATCH: UBAH STATUS ENROLLMENT
// ==========================================

router.patch(
  "/:id/status",
  verifyOrigin,
  verifyCsrfToken,
  validate(updateEnrollmentStatusSchema),
  changeEnrollmentStatus,
);

export default router;
