import { Router } from "express";
import { z } from "zod";

import {
  getMyParentDashboard,
  submitStudentClaim,
  searchStudentsForParentController,
  approveStudentClaim,
  rejectStudentClaim,
  getMyParentStudentClaims,
  listParentStudentClaims,
} from "../controllers/parent.controller.js";

import { resolveActiveBranch } from "../middlewares/activeBranch.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  createParentStudentClaimSchema,
  rejectParentStudentClaimSchema,
} from "../validators/parent.validator.js";

const router = Router();

// ==========================================
// VALIDASI REQUEST BODY
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

// ==========================================
// VALIDASI UUID PARAMETER
// ==========================================

function validateParams(schema) {
  return function (req, res, next) {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Parameter ID tidak valid.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    return next();
  };
}

const claimIdSchema = z.object({
  claimId: z.uuid(),
});

// ==========================================
// AUTHENTICATION
// ==========================================

router.use(authenticate);

// ==========================================
// PARENT: DASHBOARD
// ==========================================

router.get("/me/dashboard", requireRole("parent"), getMyParentDashboard);

// ==========================================
// PARENT: DAFTAR PENGAJUAN ANAK
// ==========================================

router.get(
  "/me/student-claims",
  requireRole("parent"),
  getMyParentStudentClaims,
);

// ==========================================
// PARENT: MENCARI SISWA TERDAFTAR
// ==========================================

router.get(
  "/me/available-students",
  requireRole("parent"),
  searchStudentsForParentController,
);

// ==========================================
// PARENT: MENGAJUKAN KLAIM SISWA
// ==========================================

router.post(
  "/me/student-claims",
  requireRole("parent"),
  verifyOrigin,
  verifyCsrfToken,
  validate(createParentStudentClaimSchema),
  submitStudentClaim,
);

// ==========================================
// ADMIN: AKSES PENGAJUAN ANAK
// ==========================================

router.use(requireRole("super_admin", "branch_admin"), resolveActiveBranch);

// ==========================================
// ADMIN: DAFTAR PENGAJUAN ANAK
// ==========================================

router.get("/student-claims", listParentStudentClaims);

// ==========================================
// ADMIN: MENYETUJUI PENGAJUAN
// ==========================================

router.post(
  "/student-claims/:claimId/approve",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(claimIdSchema),
  approveStudentClaim,
);

// ==========================================
// ADMIN: MENOLAK PENGAJUAN
// ==========================================

router.post(
  "/student-claims/:claimId/reject",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(claimIdSchema),
  validate(rejectParentStudentClaimSchema),
  rejectStudentClaim,
);

export default router;
