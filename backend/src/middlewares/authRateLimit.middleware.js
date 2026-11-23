import { rateLimit } from "express-rate-limit";

// ==========================================
// LOGIN RATE LIMITER
// ==========================================

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  skipSuccessfulRequests: true,

  message: {
    success: false,
    message:
      "Terlalu banyak percobaan login. Silakan coba lagi setelah 15 menit.",
  },
});

// ==========================================
// REGISTRATION RATE LIMITER
// ==========================================

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message: "Terlalu banyak percobaan registrasi. Silakan coba lagi nanti.",
  },
});

// ==========================================
// EMAIL OTP VERIFICATION RATE LIMITER
// ==========================================

export const verifyEmailOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Terlalu banyak percobaan verifikasi OTP. Silakan coba lagi setelah 15 menit.",
  },
});

// ==========================================
// RESEND EMAIL OTP RATE LIMITER
// ==========================================

export const resendEmailOtpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Terlalu banyak permintaan pengiriman ulang OTP. Silakan coba lagi nanti.",
  },
});
