import { randomBytes } from "node:crypto";

import {
  registerUser,
  loginUser,
  getEmailVerificationChallengeUserId,
  deleteEmailVerificationChallenge,
} from "../services/auth.service.js";

import {
  sendEmailVerification,
  verifyEmailOtp,
} from "../services/emailVerification.service.js";

import { revokeSession } from "../services/session.service.js";

import {
  AUTH_CONFIG,
  SESSION_COOKIE_OPTIONS,
  CLEAR_COOKIE_OPTIONS,
  EMAIL_VERIFICATION_COOKIE_OPTIONS,
  CLEAR_EMAIL_VERIFICATION_COOKIE_OPTIONS,
  REGISTRATION_DEVICE_COOKIE_OPTIONS,
} from "../config/auth.js";

// ==========================================
// REGISTRATION DEVICE TOKEN
// ==========================================

function getOrCreateRegistrationDeviceToken(req, res) {
  const cookieName = AUTH_CONFIG.registrationDeviceCookieName;
  const existingToken = req.cookies?.[cookieName];

  // Token randomBytes(32) dalam format base64url memiliki 43 karakter.
  if (
    typeof existingToken === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(existingToken)
  ) {
    res.cookie(cookieName, existingToken, REGISTRATION_DEVICE_COOKIE_OPTIONS);

    return existingToken;
  }

  const deviceToken = randomBytes(32).toString("base64url");

  res.cookie(cookieName, deviceToken, REGISTRATION_DEVICE_COOKIE_OPTIONS);

  return deviceToken;
}

// ==========================================
// REGISTER
// ==========================================

export async function register(req, res, next) {
  try {
    getOrCreateRegistrationDeviceToken(req, res);

    const result = await registerUser(req.body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Challenge hanya disimpan dalam cookie HttpOnly.
    res.cookie(
      AUTH_CONFIG.emailVerificationCookieName,
      result.challengeToken,
      EMAIL_VERIFICATION_COOKIE_OPTIONS,
    );

    // Kirim OTP ke email yang didaftarkan.
    await sendEmailVerification(result.user.id);

    return res.status(201).json({
      success: true,
      message:
        "Registrasi berhasil. Silakan periksa email untuk kode verifikasi.",
      data: {
        user: result.user,
        emailVerificationRequired: true,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// VERIFY EMAIL OTP
// ==========================================

export async function verifyEmail(req, res, next) {
  try {
    const challengeToken =
      req.cookies?.[AUTH_CONFIG.emailVerificationCookieName];

    if (!challengeToken) {
      const error = new Error(
        "Sesi verifikasi tidak ditemukan. Silakan ulangi proses registrasi.",
      );
      error.statusCode = 401;
      throw error;
    }

    const deviceToken = req.cookies?.[AUTH_CONFIG.registrationDeviceCookieName];

    if (
      typeof deviceToken !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(deviceToken)
    ) {
      const error = new Error(
        "Identitas perangkat tidak ditemukan. Silakan ulangi proses registrasi.",
      );
      error.statusCode = 401;
      throw error;
    }

    // Identitas user berasal dari challenge cookie.
    const userId = await getEmailVerificationChallengeUserId(challengeToken);

    // Token perangkat diteruskan ke service verifikasi.
    await verifyEmailOtp(userId, req.body.otp, deviceToken);

    // Hapus challenge setelah verifikasi berhasil.
    await deleteEmailVerificationChallenge(userId, challengeToken).catch(
      (error) => {
        console.error(
          "Gagal menghapus email verification challenge:",
          error.message,
        );
      },
    );

    res.clearCookie(
      AUTH_CONFIG.emailVerificationCookieName,
      CLEAR_EMAIL_VERIFICATION_COOKIE_OPTIONS,
    );

    return res.status(200).json({
      success: true,
      message: "Verifikasi email berhasil. Silakan login.",
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// RESEND EMAIL OTP
// ==========================================

export async function resendEmailOtp(req, res, next) {
  try {
    const challengeToken =
      req.cookies?.[AUTH_CONFIG.emailVerificationCookieName];

    if (!challengeToken) {
      const error = new Error(
        "Sesi verifikasi tidak ditemukan. Silakan ulangi proses registrasi.",
      );
      error.statusCode = 401;
      throw error;
    }

    const userId = await getEmailVerificationChallengeUserId(challengeToken);

    await sendEmailVerification(userId);

    return res.status(200).json({
      success: true,
      message: "Kode verifikasi berhasil dikirim ulang.",
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// LOGIN
// ==========================================

export async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;

    const result = await loginUser(identifier, password, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.cookie(
      AUTH_CONFIG.cookieName,
      result.sessionToken,
      SESSION_COOKIE_OPTIONS,
    );

    return res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        user: result.user,
        session: result.session,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// LOGOUT
// ==========================================

export async function logout(req, res, next) {
  try {
    const token = req.cookies?.[AUTH_CONFIG.cookieName];

    if (token) {
      await revokeSession(token);
    }

    res.clearCookie(AUTH_CONFIG.cookieName, CLEAR_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Logout berhasil",
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET CURRENT USER
// ==========================================

export async function me(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
}
