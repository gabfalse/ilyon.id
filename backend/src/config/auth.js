import dotenv from "dotenv";

dotenv.config();

// ==========================================
// AUTHENTICATION CONFIGURATION
// ==========================================

export const AUTH_CONFIG = {
  // Cookie session login
  cookieName: "ilyon_session",

  // Masa berlaku session: 7 hari
  sessionDuration: 7 * 24 * 60 * 60 * 1000,

  // Masa berlaku reset password: 30 menit
  passwordResetDuration: 30 * 60 * 1000,

  // Cookie challenge verifikasi email
  emailVerificationCookieName: "ilyon_email_verification",

  // Masa berlaku challenge: 30 menit
  emailVerificationChallengeDuration: 30 * 60 * 1000,

  // Cookie identitas perangkat registrasi
  registrationDeviceCookieName: "ilyon_registration_device",

  // Masa berlaku identitas perangkat: 30 hari
  registrationDeviceDuration: 30 * 24 * 60 * 60 * 1000,
};

// ==========================================
// SHARED COOKIE OPTIONS
// ==========================================

const BASE_HTTP_ONLY_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

// ==========================================
// SESSION COOKIE
// ==========================================

export const SESSION_COOKIE_OPTIONS = {
  ...BASE_HTTP_ONLY_COOKIE_OPTIONS,
  maxAge: AUTH_CONFIG.sessionDuration,
};

// ==========================================
// SESSION COOKIE CLEAR
// ==========================================

export const CLEAR_COOKIE_OPTIONS = {
  ...BASE_HTTP_ONLY_COOKIE_OPTIONS,
};

// ==========================================
// EMAIL VERIFICATION CHALLENGE COOKIE
// ==========================================

export const EMAIL_VERIFICATION_COOKIE_OPTIONS = {
  ...BASE_HTTP_ONLY_COOKIE_OPTIONS,
  maxAge: AUTH_CONFIG.emailVerificationChallengeDuration,
};

// ==========================================
// EMAIL VERIFICATION CHALLENGE COOKIE CLEAR
// ==========================================

export const CLEAR_EMAIL_VERIFICATION_COOKIE_OPTIONS = {
  ...BASE_HTTP_ONLY_COOKIE_OPTIONS,
};

// ==========================================
// REGISTRATION DEVICE COOKIE
// ==========================================

export const REGISTRATION_DEVICE_COOKIE_OPTIONS = {
  ...BASE_HTTP_ONLY_COOKIE_OPTIONS,
  maxAge: AUTH_CONFIG.registrationDeviceDuration,
};

// ==========================================
// REGISTRATION DEVICE COOKIE CLEAR
// ==========================================

export const CLEAR_REGISTRATION_DEVICE_COOKIE_OPTIONS = {
  ...BASE_HTTP_ONLY_COOKIE_OPTIONS,
};
