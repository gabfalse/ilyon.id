import { AUTH_CONFIG } from "../config/auth.js";
import { getSessionByToken } from "../services/session.service.js";

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

export async function authenticate(req, res, next) {
  try {
    // Ambil token dari cookie browser
    const token = req.cookies?.[AUTH_CONFIG.cookieName];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Silakan login terlebih dahulu.",
      });
    }

    // Validasi session ke database
    const session = await getSessionByToken(token);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session tidak valid atau sudah kedaluwarsa.",
      });
    }

    // Simpan informasi pengguna ke request
    req.user = {
      id: session.user_id,
      email: session.email,
      phone: session.phone,
      fullName: session.full_name,
      sessionId: session.session_id,

      isActive: session.is_active,

      // Semua role dan cabang pengguna
      roles: session.roles || [],
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// ROLE AUTHORIZATION MIDDLEWARE
// ==========================================

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Silakan login terlebih dahulu.",
      });
    }

    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [];

    const userRoleCodes = userRoles
      .map((role) => {
        if (typeof role === "string") {
          return role;
        }

        return role?.roleCode;
      })
      .filter(Boolean);

    const hasAllowedRole = allowedRoles.some((role) =>
      userRoleCodes.includes(role),
    );

    if (!hasAllowedRole) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki izin untuk mengakses fitur ini.",
      });
    }

    return next();
  };
}
