import {
  getAllUsers,
  getUserById,
  getAvailableBranches,
  setBranchAdminAssignments,
} from "../services/userManagement.service.js";

// ==========================================
// LIST USERS
// ==========================================

export async function listUsers(req, res, next) {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    const result = await getAllUsers({
      search,
      page: Number(page),
      limit: Number(limit),
    });

    return res.status(200).json({
      success: true,
      message: "Daftar pengguna berhasil diambil.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// DETAIL USER
// ==========================================

export async function detailUser(req, res, next) {
  try {
    const { id } = req.params;

    const user = await getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detail pengguna berhasil diambil.",
      data: user,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// LIST AVAILABLE BRANCHES
// ==========================================

export async function listAvailableBranches(req, res, next) {
  try {
    const branches = await getAvailableBranches();

    return res.status(200).json({
      success: true,
      message: "Daftar cabang aktif berhasil diambil.",
      data: branches,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// UPDATE BRANCH ADMIN ASSIGNMENTS
// ==========================================

export async function updateBranchAdminAssignments(req, res, next) {
  try {
    const { id } = req.params;
    const { branchIds } = req.body;

    const user = await setBranchAdminAssignments({
      userId: id,
      branchIds,
      assignedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: "Penugasan Admin Cabang berhasil diperbarui.",
      data: user,
    });
  } catch (error) {
    return next(error);
  }
}
