import { Router } from "express";
import { z } from "zod";

import {
  listStaff,
  detailStaff,
  storeStaff,
  updateStaffController,
  transferStaffController,
  updateStaffStatusController,
} from "../controllers/staff.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  createStaffSchema,
  updateStaffSchema,
  transferStaffSchema,
  updateStaffStatusSchema,
} from "../validators/staff.validator.js";

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
    next();
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
    next();
  };
}

const staffIdSchema = z.object({
  id: z.uuid("ID staff tidak valid"),
});

// ==========================================
// AUTHORIZATION
// ==========================================

router.use(authenticate, requireRole("super_admin"));

// ==========================================
// GET: DAFTAR STAFF
// ==========================================

router.get("/", listStaff);

// ==========================================
// GET: DETAIL STAFF
// ==========================================

router.get("/:id", validateParams(staffIdSchema), detailStaff);

// ==========================================
// POST: TAMBAH STAFF + AKUN LOGIN
// ==========================================

router.post(
  "/",
  verifyOrigin,
  verifyCsrfToken,
  validate(createStaffSchema),
  storeStaff,
);

// ==========================================
// PUT: UPDATE STAFF
// ==========================================

router.put(
  "/:id",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(staffIdSchema),
  validate(updateStaffSchema),
  updateStaffController,
);

// ==========================================
// PATCH: TRANSFER STAFF KE CABANG LAIN
// ==========================================

router.patch(
  "/:id/transfer",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(staffIdSchema),
  validate(transferStaffSchema),
  transferStaffController,
);

// ==========================================
// PATCH: AKTIFKAN / NONAKTIFKAN STAFF
// ==========================================

router.patch(
  "/:id/status",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(staffIdSchema),
  validate(updateStaffStatusSchema),
  updateStaffStatusController,
);

export default router;
