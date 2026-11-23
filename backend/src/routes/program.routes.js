import { Router } from "express";

import {
  getPrograms,
  getProgram,
  postProgram,
  putProgram,
  patchProgramStatus,
  getProgramOfferings,
  getActiveProgramOfferings,
  getOffering,
  postProgramOffering,
  putProgramOffering,
  patchProgramOfferingStatus,

  // Program - Subject Mapping
  getProgramSubjects,
  getAvailableProgramSubjects,
  postProgramSubject,
  patchProgramSubject,
  deleteProgramSubject,
  getParentProgramOfferings,
} from "../controllers/program.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  createProgramSchema,
  updateProgramSchema,
  updateProgramStatusSchema,
  createOfferingSchema,
  updateOfferingSchema,
  updateOfferingStatusSchema,
  createProgramSubjectSchema,
  updateProgramSubjectSchema,
} from "../validators/program.validator.js";

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

// Semua endpoint wajib login
router.use(authenticate);
router.get(
  "/parent/offerings",
  requireRole("parent"),
  getParentProgramOfferings,
);
// ==========================================
// READ ACCESS
// Super Admin dan Branch Admin
// ==========================================

router.get("/", requireRole("super_admin", "branch_admin"), getPrograms);

router.get(
  "/:programId/offerings/active",
  requireRole("super_admin", "branch_admin"),
  getActiveProgramOfferings,
);

router.get(
  "/:programId/offerings",
  requireRole("super_admin", "branch_admin"),
  getProgramOfferings,
);

router.get(
  "/offerings/:offeringId",
  requireRole("super_admin", "branch_admin"),
  getOffering,
);

router.get("/:id", requireRole("super_admin", "branch_admin"), getProgram);

router.get(
  "/:programId/subjects/available",
  requireRole("super_admin", "branch_admin"),
  getAvailableProgramSubjects,
);

router.get(
  "/:programId/subjects",
  requireRole("super_admin", "branch_admin"),
  getProgramSubjects,
);

// ==========================================
// WRITE ACCESS
// Super Admin only
// ==========================================

router.post(
  "/",
  verifyOrigin,
  verifyCsrfToken,
  requireRole("super_admin"),
  validate(createProgramSchema),
  postProgram,
);

router.put(
  "/:id",
  verifyOrigin,
  verifyCsrfToken,
  requireRole("super_admin"),
  validate(updateProgramSchema),
  putProgram,
);

router.patch(
  "/:id/status",
  verifyOrigin,
  verifyCsrfToken,
  requireRole("super_admin"),
  validate(updateProgramStatusSchema),
  patchProgramStatus,
);

// ==========================================
// PROGRAM - SUBJECT MAPPING WRITE ACCESS
// Super Admin only
// ==========================================

router.post(
  "/:programId/subjects",
  verifyOrigin,
  verifyCsrfToken,
  requireRole("super_admin"),
  validate(createProgramSubjectSchema),
  postProgramSubject,
);

router.patch(
  "/:programId/subjects/:subjectId",
  verifyOrigin,
  verifyCsrfToken,
  requireRole("super_admin"),
  validate(updateProgramSubjectSchema),
  patchProgramSubject,
);

router.delete(
  "/:programId/subjects/:subjectId",
  verifyOrigin,
  verifyCsrfToken,
  requireRole("super_admin"),
  deleteProgramSubject,
);

// ==========================================
// OFFERING WRITE ACCESS
// Super Admin only
// ==========================================

router.post(
  "/:programId/offerings",
  verifyOrigin,
  verifyCsrfToken,
  requireRole("super_admin"),
  validate(createOfferingSchema),
  postProgramOffering,
);

router.put(
  "/offerings/:offeringId",
  verifyOrigin,
  verifyCsrfToken,
  requireRole("super_admin"),
  validate(updateOfferingSchema),
  putProgramOffering,
);

router.patch(
  "/offerings/:offeringId/status",
  verifyOrigin,
  verifyCsrfToken,
  requireRole("super_admin"),
  validate(updateOfferingStatusSchema),
  patchProgramOfferingStatus,
);

export default router;
