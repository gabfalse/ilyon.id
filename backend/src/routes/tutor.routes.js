import { Router } from "express";
import { z } from "zod";

import {
  listTutors,
  detailTutor,
  storeTutor,
  updateTutorController,
  updateTutorStatusController,
} from "../controllers/tutor.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  createTutorSchema,
  updateTutorSchema,
} from "../validators/tutor.validator.js";

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

// ==========================================
// AUTHORIZATION
// ==========================================

router.use(authenticate, requireRole("super_admin"));

// ==========================================
// GET: DAFTAR TUTOR
// ==========================================

router.get("/", listTutors);

// ==========================================
// GET: DETAIL TUTOR
// ==========================================

router.get(
  "/:id",
  validateParams(
    z.object({
      id: z.uuid("ID tutor tidak valid"),
    }),
  ),
  detailTutor,
);

// ==========================================
// POST: TAMBAH TUTOR + AKUN LOGIN
// ==========================================

router.post(
  "/",
  verifyOrigin,
  verifyCsrfToken,
  validate(createTutorSchema),
  storeTutor,
);

// ==========================================
// PUT: UPDATE TUTOR
// ==========================================

router.put(
  "/:id",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(
    z.object({
      id: z.uuid("ID tutor tidak valid"),
    }),
  ),
  validate(updateTutorSchema),
  updateTutorController,
);

// ==========================================
// PATCH: AKTIFKAN / NONAKTIFKAN TUTOR
// ==========================================

export async function updateTutorStatus(id, isActive) {
  return apiRequest(`/api/tutors/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

// ==========================================
// PATCH: AKTIFKAN / NONAKTIFKAN TUTOR
// ==========================================

router.patch(
  "/:id/status",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(
    z.object({
      id: z.uuid("ID tutor tidak valid"),
    }),
  ),
  validate(
    z.object({
      isActive: z.boolean({
        error: "Status akun harus berupa boolean.",
      }),
    }),
  ),
  updateTutorStatusController,
);

export default router;
