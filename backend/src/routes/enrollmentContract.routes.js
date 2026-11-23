import { Router } from "express";

import {
  listEnrollmentContracts,
  detailEnrollmentContract,
  storeEnrollmentContract,
  editEnrollmentContract,
  changeEnrollmentContractStatus,
  changeEnrollmentContractMember,
} from "../controllers/enrollmentContract.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  createEnrollmentContractSchema,
  updateEnrollmentContractSchema,
  updateEnrollmentContractStatusSchema,
  updateEnrollmentContractMemberSchema,
} from "../validators/enrollmentContract.validator.js";

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
// GET: DAFTAR ENROLLMENT CONTRACT
// ==========================================

router.get("/", listEnrollmentContracts);

// ==========================================
// GET: DETAIL ENROLLMENT CONTRACT
// ==========================================

router.get("/:id", detailEnrollmentContract);

// ==========================================
// POST: CREATE ENROLLMENT CONTRACT
// ==========================================

router.post(
  "/",
  verifyOrigin,
  verifyCsrfToken,
  validate(createEnrollmentContractSchema),
  storeEnrollmentContract,
);

// ==========================================
// PUT: UPDATE ENROLLMENT CONTRACT
// ==========================================

router.put(
  "/:id",
  verifyOrigin,
  verifyCsrfToken,
  validate(updateEnrollmentContractSchema),
  editEnrollmentContract,
);

// ==========================================
// PATCH: UPDATE CONTRACT STATUS
// ==========================================

router.patch(
  "/:id/status",
  verifyOrigin,
  verifyCsrfToken,
  validate(updateEnrollmentContractStatusSchema),
  changeEnrollmentContractStatus,
);

// ==========================================
// PATCH: UPDATE CONTRACT MEMBER
// ==========================================

router.patch(
  "/:contractId/members/:enrollmentId",
  verifyOrigin,
  verifyCsrfToken,
  validate(updateEnrollmentContractMemberSchema),
  changeEnrollmentContractMember,
);

export default router;
