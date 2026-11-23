import { Router } from "express";
import { z } from "zod";

import {
  listUsers,
  detailUser,
  listAvailableBranches,
  updateBranchAdminAssignments,
} from "../controllers/userManagement.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  listUsersQuerySchema,
  userIdParamSchema,
  setBranchAdminAssignmentsSchema,
} from "../validators/userManagement.validator.js";

const router = Router();

// ==========================================
// VALIDASI QUERY
// ==========================================

function validateQuery(schema) {
  return function (req, res, next) {
    const result = schema.safeParse(req.query);

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

    res.locals.validatedQuery = result.data;

    return next();
  };
}
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
// VALIDASI PARAMETER
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

// ==========================================
// AUTHORIZATION
// ==========================================

router.use(authenticate, requireRole("super_admin"));

// ==========================================
// GET: DAFTAR PENGGUNA
// ==========================================

router.get("/", validateQuery(listUsersQuerySchema), listUsers);

// ==========================================
// GET: DAFTAR CABANG AKTIF
// ==========================================

router.get("/branches", listAvailableBranches);

// ==========================================
// GET: DETAIL PENGGUNA
// ==========================================

router.get("/:id", validateParams(userIdParamSchema), detailUser);

// ==========================================
// PUT: ATUR PENUGASAN BRANCH ADMIN
// ==========================================

router.put(
  "/:id/branch-admin-assignments",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(userIdParamSchema),
  validate(setBranchAdminAssignmentsSchema),
  updateBranchAdminAssignments,
);

export default router;
