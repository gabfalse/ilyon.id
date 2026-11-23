import {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  transferStaff,
  updateStaffStatus,
} from "../services/staff.service.js";

// ==========================================
// GET: DAFTAR STAFF
// ==========================================

export async function listStaff(req, res, next) {
  try {
    const {
      search = "",
      employmentStatus = "",
      branchId = "",
      page = "1",
      limit = "10",
    } = req.query;

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);

    const allowedStatuses = ["active", "inactive", "resigned", "on_leave"];

    if (
      !Number.isInteger(parsedPage) ||
      parsedPage < 1 ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Parameter page atau limit tidak valid.",
      });
    }

    if (employmentStatus && !allowedStatuses.includes(employmentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status kepegawaian tidak valid.",
      });
    }

    const result = await getAllStaff({
      search: String(search).trim(),
      employmentStatus,
      branchId,
      page: parsedPage,
      limit: parsedLimit,
    });

    return res.status(200).json({
      success: true,
      message: "Daftar staff berhasil diambil.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET: DETAIL STAFF
// ==========================================

export async function detailStaff(req, res, next) {
  try {
    const staff = await getStaffById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detail staff berhasil diambil.",
      data: staff,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// POST: TAMBAH STAFF
// ==========================================

export async function storeStaff(req, res, next) {
  try {
    const staff = await createStaff(req.body, {
      actorId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(201).json({
      success: true,
      message: "Staff dan akun login berhasil dibuat.",
      data: staff,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PUT: UPDATE STAFF
// ==========================================

export async function updateStaffController(req, res, next) {
  try {
    const staff = await updateStaff(req.params.id, req.body, {
      actorId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: "Data staff berhasil diperbarui.",
      data: staff,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PATCH: TRANSFER STAFF
// ==========================================

export async function transferStaffController(req, res, next) {
  try {
    const staff = await transferStaff(req.params.id, req.body, {
      actorId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: "Staff berhasil dipindahkan ke cabang baru.",
      data: staff,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PATCH: UPDATE STATUS STAFF
// ==========================================

export async function updateStaffStatusController(req, res, next) {
  try {
    const staff = await updateStaffStatus(req.params.id, req.body.isActive, {
      actorId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: req.body.isActive
        ? "Staff berhasil diaktifkan kembali."
        : "Staff berhasil dinonaktifkan.",
      data: staff,
    });
  } catch (error) {
    return next(error);
  }
}
