import { Router } from "express";
import { z } from "zod";

import {
  listParents,
  listEligibleParentAccounts,
  detailParent,
  storeParent,
  restoreParentAccount,
  editParent,
  linkStudent,
  unlinkStudent,
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
  createParentSchema,
  updateParentSchema,
  linkParentStudentSchema,
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

const parentIdSchema = z.object({
  id: z.uuid(),
});

const parentStudentIdSchema = z.object({
  id: z.uuid(),
  studentId: z.uuid(),
});

const claimIdSchema = z.object({
  claimId: z.uuid(),
});

// ==========================================
// AUTHENTICATION, AUTHORIZATION & BRANCH
// ==========================================

router.use(authenticate);

// ==========================================
// POST: PARENT MENGAJUKAN KLAIM SISWA
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
// DASHBOARD KHUSUS AKUN PARENT
// ==========================================

router.get("/me/dashboard", requireRole("parent"), getMyParentDashboard);

router.get(
  "/me/student-claims",
  requireRole("parent"),
  getMyParentStudentClaims,
);

// ==========================================
// GET: PENCARIAN SISWA UNTUK PARENT
// ==========================================

router.get(
  "/me/available-students",
  requireRole("parent"),
  searchStudentsForParentController,
);

// ==========================================
// ENDPOINT MANAJEMEN PARENT
// KHUSUS SUPER ADMIN DAN BRANCH ADMIN
// ==========================================

router.use(requireRole("super_admin", "branch_admin"), resolveActiveBranch);

// Admin: melihat seluruh pengajuan anak sesuai hak akses cabang
router.get("/student-claims", listParentStudentClaims);

// ==========================================
// POST: ADMIN MENYETUJUI KLAIM SISWA
// ==========================================

router.post(
  "/student-claims/:claimId/approve",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(claimIdSchema),
  approveStudentClaim,
);

// ==========================================
// POST: ADMIN MENOLAK KLAIM SISWA
// ==========================================

router.post(
  "/student-claims/:claimId/reject",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(claimIdSchema),
  validate(rejectParentStudentClaimSchema),
  rejectStudentClaim,
);

// ==========================================
// GET: AKUN YANG MEMENUHI SYARAT MENJADI PARENT
// ==========================================

router.get("/eligible-accounts", listEligibleParentAccounts);

// ==========================================
// GET: DAFTAR ORANG TUA
// ==========================================

router.get("/", listParents);

// ==========================================
// PUT: RESTORE PARENT ROLE
// ==========================================

router.post(
  "/:id/restore-user",
  verifyOrigin,
  verifyCsrfToken,
  restoreParentAccount,
);

// ==========================================
// GET: DETAIL ORANG TUA
// ==========================================

router.get("/:id", validateParams(parentIdSchema), detailParent);

// ==========================================
// POST: TAMBAH ORANG TUA
// ==========================================

router.post(
  "/",
  verifyOrigin,
  verifyCsrfToken,
  validate(createParentSchema),
  storeParent,
);

// ==========================================
// PUT: EDIT ORANG TUA
// ==========================================

router.put(
  "/:id",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(parentIdSchema),
  validate(updateParentSchema),
  editParent,
);

// ==========================================
// POST: HUBUNGKAN ORANG TUA DENGAN SISWA
// ==========================================

router.post(
  "/:id/students",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(parentIdSchema),
  validate(linkParentStudentSchema),
  linkStudent,
);

// ==========================================
// DELETE: LEPASKAN HUBUNGAN ORANG TUA DAN SISWA
// ==========================================

router.delete(
  "/:id/students/:studentId",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(parentStudentIdSchema),
  unlinkStudent,
);

export default router;
