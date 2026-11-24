import { Router } from "express";

import {
  loginLimiter,
  registerLimiter,
  verifyEmailOtpLimiter,
  resendEmailOtpLimiter,
} from "../middlewares/authRateLimit.middleware.js";

import { switchAccountModeController } from "../controllers/accountMode.controller.js";

import {
  register,
  login,
  logout,
  me,
  verifyEmail,
  resendEmailOtp,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

import {
  registerSchema,
  loginSchema,
  verifyEmailOtpSchema,
  resendEmailOtpSchema,
  switchAccountModeSchema,
} from "../validators/auth.validator.js";

import {
  issueCsrfToken,
  verifyCsrfToken,
  verifyOrigin,
} from "../middlewares/csrf.middleware.js";

const router = Router();

// ==========================================
// VALIDATION MIDDLEWARE
// ==========================================

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Data yang dikirim tidak valid",
        errors: result.error.flatten().fieldErrors,
      });
    }

    req.body = result.data;
    next();
  };
}

// ==========================================
// CSRF TOKEN
// ==========================================

router.get("/csrf", issueCsrfToken);

// ==========================================
// REGISTRATION
// ==========================================

router.post(
  "/register",
  registerLimiter,
  verifyOrigin,
  verifyCsrfToken,
  validate(registerSchema),
  register,
);

// ==========================================
// EMAIL VERIFICATION
// ==========================================

router.post(
  "/verify-email",
  verifyEmailOtpLimiter,
  verifyOrigin,
  verifyCsrfToken,
  validate(verifyEmailOtpSchema),
  verifyEmail,
);

router.post(
  "/resend-email-otp",
  resendEmailOtpLimiter,
  verifyOrigin,
  verifyCsrfToken,
  validate(resendEmailOtpSchema),
  resendEmailOtp,
);

// ==========================================
// LOGIN
// ==========================================

router.post(
  "/login",
  loginLimiter,
  verifyOrigin,
  verifyCsrfToken,
  validate(loginSchema),
  login,
);

// ==========================================
// LOGOUT
// ==========================================

router.post("/logout", verifyOrigin, verifyCsrfToken, authenticate, logout);

// ==========================================
// CURRENT USER
// ==========================================

router.get("/me", authenticate, me);

export default router;

// ==========================================
// ACCOUNT MODE SWITCH
// ==========================================

router.patch(
  "/switch-mode",
  verifyOrigin,
  verifyCsrfToken,
  authenticate,
  validate(switchAccountModeSchema),
  switchAccountModeController,
);
