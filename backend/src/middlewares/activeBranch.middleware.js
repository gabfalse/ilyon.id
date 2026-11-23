export function resolveActiveBranch(req, res, next) {
  try {
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];

    const isSuperAdmin = roles.some((role) => role?.roleCode === "super_admin");

    // Super Admin tidak dibatasi cabang aktif.
    if (isSuperAdmin) {
      req.activeBranchId = null;
      return next();
    }

    // Ambil seluruh cabang yang ditugaskan kepada admin.
    const assignedBranchIds = [
      ...new Set(
        roles
          .filter((role) => role?.roleCode === "branch_admin")
          .map((role) => role.branchId)
          .filter(
            (branchId) =>
              typeof branchId === "string" && branchId.trim() !== "",
          ),
      ),
    ];

    if (!assignedBranchIds.length) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses admin cabang.",
      });
    }

    // Baca cabang aktif dari request header.
    const requestedBranchId = req.get("X-Active-Branch-Id")?.trim();

    // Jika hanya memiliki satu cabang, gunakan otomatis.
    if (!requestedBranchId && assignedBranchIds.length === 1) {
      req.activeBranchId = assignedBranchIds[0];
      return next();
    }

    // Admin multi-cabang wajib memilih cabang aktif.
    if (!requestedBranchId) {
      return res.status(400).json({
        success: false,
        message: "Silakan pilih cabang aktif terlebih dahulu.",
      });
    }

    // Pastikan cabang yang dipilih memang ditugaskan kepada pengguna.
    if (!assignedBranchIds.includes(requestedBranchId)) {
      return res.status(403).json({
        success: false,
        message: "Cabang aktif tidak termasuk penugasan Anda.",
      });
    }

    req.activeBranchId = requestedBranchId;

    return next();
  } catch (error) {
    return next(error);
  }
}
