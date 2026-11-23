import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import {
  AUTH_CONFIG,
  REGISTRATION_DEVICE_COOKIE_OPTIONS,
} from "../config/auth.js";

const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 1000,
};

const CSRF_COOKIE_NAME = "ilyon_csrf";
const RECRUITMENT_CSRF_COOKIE_NAME = "ilyon_recruitment_csrf";

// ==========================================
// SECRET
// ==========================================

function getCsrfSecret() {
  const secret = process.env.CSRF_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("CSRF_SECRET belum diatur atau kurang dari 32 karakter");
  }

  return secret;
}

// ==========================================
// SIGN TOKEN
// ==========================================

function signToken(token) {
  return createHmac("sha256", getCsrfSecret())
    .update(token)
    .digest("base64url");
}

// ==========================================
// SAFE STRING COMPARISON
// ==========================================

function safeCompare(value1, value2) {
  if (typeof value1 !== "string" || typeof value2 !== "string") {
    return false;
  }

  const buffer1 = Buffer.from(value1);
  const buffer2 = Buffer.from(value2);

  if (buffer1.length !== buffer2.length) {
    return false;
  }

  return timingSafeEqual(buffer1, buffer2);
}

// ==========================================
// ALLOWED ORIGINS
// ==========================================

function getAllowedOrigins() {
  return [
    process.env.FRONTEND_URL,
    ...(process.env.NODE_ENV !== "production" ? ["http://localhost:5173"] : []),
  ].filter(Boolean);
}

// ==========================================
// VERIFY ORIGIN
// ==========================================

export function verifyOrigin(req, res, next) {
  const origin = req.get("Origin");
  const allowedOrigins = getAllowedOrigins();

  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      success: false,
      message: "Origin tidak diizinkan",
    });
  }

  return next();
}

// ==========================================
// REGISTRATION DEVICE COOKIE
// ==========================================
function issueRegistrationDeviceCookie(req, res) {
  const cookieName = AUTH_CONFIG.registrationDeviceCookieName;

  let deviceToken = req.cookies?.[cookieName];

  if (
    typeof deviceToken !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(deviceToken)
  ) {
    deviceToken = randomBytes(32).toString("base64url");
  }

  res.cookie(cookieName, deviceToken, REGISTRATION_DEVICE_COOKIE_OPTIONS);

  return deviceToken;
}
// ==========================================
// ISSUE CSRF TOKEN
// ==========================================

function createIssueCsrfToken(cookieName, options = {}) {
  return function issueToken(req, res, next) {
    try {
      if (options.registrationDevice) {
        issueRegistrationDeviceCookie(req, res);
      }

      const token = randomBytes(32).toString("base64url");
      const signature = signToken(token);
      const signedToken = `${token}.${signature}`;

      res.cookie(cookieName, signedToken, CSRF_COOKIE_OPTIONS);

      return res.status(200).json({
        success: true,
        message: "CSRF token berhasil dibuat",
        data: {
          csrfToken: token,
        },
      });
    } catch (error) {
      return next(error);
    }
  };
}

// ==========================================
// VERIFY CSRF TOKEN
// ==========================================

function createVerifyCsrfToken(cookieName) {
  return function verifyToken(req, res, next) {
    try {
      const headerToken = req.get("X-CSRF-Token");
      const cookieToken = req.cookies?.[cookieName];

      if (!headerToken || !cookieToken) {
        return res.status(403).json({
          success: false,
          message: "CSRF token tidak ditemukan",
        });
      }

      const separatorIndex = cookieToken.lastIndexOf(".");

      if (separatorIndex === -1) {
        return res.status(403).json({
          success: false,
          message: "Format CSRF token tidak valid",
        });
      }

      const token = cookieToken.slice(0, separatorIndex);
      const signature = cookieToken.slice(separatorIndex + 1);

      if (!safeCompare(headerToken, token)) {
        return res.status(403).json({
          success: false,
          message: "CSRF token tidak cocok",
        });
      }

      const expectedSignature = signToken(token);

      if (!safeCompare(signature, expectedSignature)) {
        return res.status(403).json({
          success: false,
          message: "Tanda tangan CSRF token tidak valid",
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

// ==========================================
// DEFAULT CSRF - AUTH / ADMIN / HR
// ==========================================

export const issueCsrfToken = createIssueCsrfToken(CSRF_COOKIE_NAME, {
  registrationDevice: true,
});

export const verifyCsrfToken = createVerifyCsrfToken(CSRF_COOKIE_NAME);

// ==========================================
// RECRUITMENT CSRF
// ==========================================

export const issueRecruitmentCsrfToken = createIssueCsrfToken(
  RECRUITMENT_CSRF_COOKIE_NAME,
);

export const verifyRecruitmentCsrfToken = createVerifyCsrfToken(
  RECRUITMENT_CSRF_COOKIE_NAME,
);
