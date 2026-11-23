import { z } from "zod";

// ==========================================
// VALIDASI LOGIN
// ==========================================

export const loginSchema = z.object({
  identifier: z
    .string({
      required_error: "Email atau nomor telepon wajib diisi",
    })
    .trim()
    .min(1, "Email atau nomor telepon wajib diisi"),

  password: z
    .string({
      required_error: "Password wajib diisi",
    })
    .min(1, "Password wajib diisi")
    .max(128, "Password maksimal 128 karakter"),
});

// ==========================================
// VALIDASI REGISTRASI PENGGUNA UMUM
// ==========================================

export const registerSchema = z.object({
  fullName: z
    .string({
      required_error: "Nama lengkap wajib diisi",
    })
    .trim()
    .min(1, "Nama lengkap wajib diisi")
    .max(150, "Nama maksimal 150 karakter"),

  email: z
    .string({
      required_error: "Email wajib diisi",
    })
    .trim()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .max(180, "Email maksimal 180 karakter"),

  phone: z
    .string({
      required_error: "Nomor telepon wajib diisi",
    })
    .trim()
    .regex(/^[0-9]{10,15}$/, "Nomor telepon harus 10-15 digit"),

  password: z
    .string({
      required_error: "Password wajib diisi",
    })
    .min(8, "Password minimal 8 karakter")
    .max(128, "Password maksimal 128 karakter"),
});

// ==========================================
// VALIDASI VERIFIKASI EMAIL OTP
// ==========================================

export const verifyEmailOtpSchema = z.object({
  otp: z
    .string({
      required_error: "Kode OTP wajib diisi",
    })
    .regex(/^[0-9]{6}$/, "Kode OTP harus terdiri dari 6 digit"),
});

// ==========================================
// VALIDASI KIRIM ULANG OTP
// ==========================================

export const resendEmailOtpSchema = z.object({});

// ==========================================
// VALIDASI AKTIVASI AKUN TUTOR / STAFF
// ==========================================

export const activateAccountSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i, "Token aktivasi tidak valid"),

  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(128, "Password maksimal 128 karakter"),
});
