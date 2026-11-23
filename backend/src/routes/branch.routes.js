import { Router } from "express";

import {
  listBranches,
  detailBranch,
  storeBranch,
  editBranch,
  changeBranchStatus,
  getParentBranches,
} from "../controllers/branch.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  createBranchSchema,
  updateBranchSchema,
  updateBranchStatusSchema,
} from "../validators/branch.validator.js";

const router = Router();

// Middleware validasi menggunakan Zod
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

// Semua endpoint wajib login
router.use(authenticate);

// GET: Daftar unit aktif untuk Parent
router.get("/parent/units", requireRole("parent"), getParentBranches);

// Semua endpoint manajemen cabang hanya untuk super_admin
router.use(requireRole("super_admin"));

// GET: Daftar cabang
router.get("/", listBranches);

// GET: Detail cabang
router.get("/:id", detailBranch);

// POST: Tambah cabang
router.post(
  "/",
  verifyOrigin,
  verifyCsrfToken,
  validate(createBranchSchema),
  storeBranch,
);

// PUT: Edit cabang
router.put(
  "/:id",
  verifyOrigin,
  verifyCsrfToken,
  validate(updateBranchSchema),
  editBranch,
);

// PATCH: Ubah status cabang
router.patch(
  "/:id/status",
  verifyOrigin,
  verifyCsrfToken,
  validate(updateBranchStatusSchema),
  changeBranchStatus,
);

export default router;
