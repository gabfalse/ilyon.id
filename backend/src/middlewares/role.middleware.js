// src/middlewares/role.middleware.js

export function requireRole(...allowedRoles) {
  return function (req, res, next) {
    try {
      // Pastikan pengguna sudah terautentikasi
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Silakan login terlebih dahulu.",
        });
      }

      // Pastikan akun masih aktif
      if (!req.user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Akun tidak aktif.",
        });
      }

      // Ambil kode role dari session pengguna
      const userRoles = Array.isArray(req.user.roles)
        ? req.user.roles.map((role) => role.roleCode)
        : [];

      // Periksa apakah pengguna memiliki salah satu role
      const hasAccess = allowedRoles.some((role) => userRoles.includes(role));

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Anda tidak memiliki izin untuk mengakses fitur ini.",
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
