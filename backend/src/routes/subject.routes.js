import express from "express";

import {
  getSubjects,
  getSubject,
  createSubjectController,
  updateSubjectController,
  updateSubjectStatusController,
  getProgramSubjectsController,
  updateProgramSubjectsController,
} from "../controllers/subject.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  createSubjectSchema,
  updateSubjectSchema,
  updateSubjectStatusSchema,
  updateProgramSubjectsSchema,
} from "../validators/subject.validator.js";

const router = express.Router();

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

router.use(authenticate);

// ==========================================
// READ: SUPER ADMIN DAN ADMIN CABANG
// ==========================================

router.get("/", requireRole("super_admin", "branch_admin"), getSubjects);

router.get(
  "/program/:programId",
  requireRole("super_admin", "branch_admin"),
  getProgramSubjectsController,
);

router.get("/:id", requireRole("super_admin", "branch_admin"), getSubject);

// ==========================================
// WRITE: SUPER ADMIN SAJA
// ==========================================

router.post(
  "/",
  verifyOrigin,
  verifyCsrfToken,
  requireRole("super_admin"),
  validate(createSubjectSchema),
  createSubjectController,
);

router.put(
  "/:id",
  verifyOrigin,
  verifyCsrfToken,
  requireRole("super_admin"),
  validate(updateSubjectSchema),
  updateSubjectController,
);

router.patch(
  "/:id/status",
  verifyOrigin,
  verifyCsrfToken,
  requireRole("super_admin"),
  validate(updateSubjectStatusSchema),
  updateSubjectStatusController,
);

router.put(
  "/program/:programId",
  verifyOrigin,
  verifyCsrfToken,
  requireRole("super_admin"),
  validate(updateProgramSubjectsSchema),
  updateProgramSubjectsController,
);

export default router;
