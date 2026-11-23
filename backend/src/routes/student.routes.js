
import { Router } from "express";

import {
  listStudents,
  detailStudent,
  storeStudent,
  editStudent,
  changeStudentStatus,
} from "../controllers/student.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  createStudentSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
} from "../validators/student.validator.js";

const router = Router();

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

// ==========================================
// AUTHORIZATION
// ==========================================

// Sementara modul siswa hanya dapat dikelola
// oleh super_admin.
router.use(authenticate, requireRole("super_admin"));

// ==========================================
// GET: DAFTAR SISWA
// ==========================================

router.get("/", listStudents);

// ==========================================
// GET: DETAIL SISWA
// ==========================================

router.get("/:id", detailStudent);

// ==========================================
// POST: TAMBAH SISWA
// ==========================================

router.post(
  "/",
  verifyOrigin,
  verifyCsrfToken,
  validate(createStudentSchema),
  storeStudent
);

// ==========================================
// PUT: EDIT SISWA
// ==========================================

router.put(
  "/:id",
  verifyOrigin,
  verifyCsrfToken,
  validate(updateStudentSchema),
  editStudent
);

// ==========================================
// PATCH: UBAH STATUS SISWA
// ==========================================

router.patch(
  "/:id/status",
  verifyOrigin,
  verifyCsrfToken,
  validate(updateStudentStatusSchema),
  changeStudentStatus
);

export default router;
