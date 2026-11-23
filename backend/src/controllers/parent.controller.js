import { z } from "zod";

import {
  getAllParents,
  getParentById,
  getEligibleParentAccounts,
  createParent,
  updateParent,
  linkParentWithStudent,
  getParentDashboardByUserId,
  getParentStudentClaimsByUserId,
  unlinkParentFromStudent,
  restoreParentToUser,
  createParentStudentClaim,
  searchStudentsForParent,
  getAllParentStudentClaims,
  approveParentStudentClaim,
  rejectParentStudentClaim,
} from "../services/parent.service.js";

const zIsValidUuid = (value) => z.string().uuid().safeParse(value).success;

// ==========================================
// MEMBENTUK ACCESS CONTEXT DARI SESSION
// ==========================================

function getParentAccess(req) {
  const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];

  const isSuperAdmin = roles.some((role) => role?.roleCode === "super_admin");

  if (isSuperAdmin) {
    return {
      isSuperAdmin: true,
      branchIds: [],
      activeBranchId: null,
    };
  }

  const branchIds = [
    ...new Set(
      roles
        .filter((role) => role?.roleCode === "branch_admin")
        .map((role) => role.branchId)
        .filter(
          (branchId) => typeof branchId === "string" && branchId.trim() !== "",
        ),
    ),
  ];

  if (branchIds.length === 0) {
    const error = new Error("Anda tidak memiliki penugasan cabang yang aktif.");
    error.statusCode = 403;
    throw error;
  }

  const activeBranchId = req.activeBranchId ?? null;

  // Validasi tambahan: cabang aktif harus termasuk penugasan pengguna.
  if (activeBranchId !== null && !branchIds.includes(activeBranchId)) {
    const error = new Error("Cabang aktif tidak termasuk penugasan Anda.");
    error.statusCode = 403;
    throw error;
  }

  return {
    isSuperAdmin: false,
    branchIds,
    activeBranchId,
  };
}

// ==========================================
// GET: DAFTAR AKUN YANG BISA DIJADIKAN ORANG TUA
// ==========================================

export async function listEligibleParentAccounts(req, res, next) {
  try {
    const accounts = await getEligibleParentAccounts();

    return res.status(200).json({
      success: true,
      message: "Daftar akun yang memenuhi syarat berhasil diambil.",
      data: accounts,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET: DAFTAR ORANG TUA
// ==========================================

export async function listParents(req, res, next) {
  try {
    const { search = "", page = "1", limit = "10" } = req.query;

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);

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

    const access = getParentAccess(req);

    const result = await getAllParents({
      search: String(search).trim(),
      page: parsedPage,
      limit: parsedLimit,
      access,
    });

    return res.status(200).json({
      success: true,
      message: "Daftar orang tua berhasil diambil.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET: DETAIL ORANG TUA
// ==========================================

export async function detailParent(req, res, next) {
  try {
    const access = getParentAccess(req);

    const parent = await getParentById(req.params.id, access);

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Orang tua tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detail orang tua berhasil diambil.",
      data: parent,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// POST: TAMBAH ORANG TUA
// ==========================================

export async function storeParent(req, res, next) {
  try {
    const access = getParentAccess(req);

    const parent = await createParent(req.body, {
      ...access,
      assignedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(201).json({
      success: true,
      message: "Orang tua berhasil ditambahkan.",
      data: parent,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PUT: EDIT ORANG TUA
// ==========================================

export async function editParent(req, res, next) {
  try {
    const access = getParentAccess(req);

    const parent = await updateParent(req.params.id, req.body, access);

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Orang tua tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data orang tua berhasil diperbarui.",
      data: parent,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// POST: HUBUNGKAN ORANG TUA DENGAN SISWA
// ==========================================

export async function linkStudent(req, res, next) {
  try {
    const access = getParentAccess(req);

    const parent = await linkParentWithStudent(req.params.id, req.body, access);

    return res.status(200).json({
      success: true,
      message: "Orang tua berhasil dihubungkan dengan siswa.",
      data: parent,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// DELETE: LEPASKAN HUBUNGAN ORANG TUA DAN SISWA
// ==========================================

export async function unlinkStudent(req, res, next) {
  try {
    const access = getParentAccess(req);

    const result = await unlinkParentFromStudent(
      req.params.id,
      req.params.studentId,
      access,
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Hubungan orang tua dengan siswa tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hubungan orang tua dengan siswa berhasil dilepaskan.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function restoreParentAccount(req, res, next) {
  try {
    const access = getParentAccess(req);

    const result = await restoreParentToUser(req.params.id, {
      ...access,
      assignedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: "Akun berhasil dikembalikan menjadi User.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET: DASHBOARD PARENT YANG SEDANG LOGIN
// ==========================================

export async function getMyParentDashboard(req, res, next) {
  try {
    const dashboard = await getParentDashboardByUserId(req.user.id);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: "Profil orang tua tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dashboard orang tua berhasil diambil.",
      data: dashboard,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET MY PARENT STUDENT CLAIMS
// ==========================================

export async function getMyParentStudentClaims(req, res, next) {
  try {
    const claims = await getParentStudentClaimsByUserId(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Riwayat pengajuan anak berhasil diambil.",
      data: claims,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET: ADMIN LIST PARENT STUDENT CLAIMS
// ==========================================
export async function listParentStudentClaims(req, res, next) {
  try {
    const access = getParentAccess(req);
    const claims = await getAllParentStudentClaims(access);

    return res.status(200).json({
      success: true,
      message: "Daftar pengajuan anak berhasil diambil.",
      data: claims,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET: PENCARIAN SISWA UNTUK PARENT
// ==========================================

export async function searchStudentsForParentController(req, res, next) {
  try {
    const branchId = String(req.query.branchId || "").trim();
    const search = String(req.query.search || "").trim();

    if (!zIsValidUuid(branchId)) {
      return res.status(400).json({
        success: false,
        message: "Unit tidak valid.",
      });
    }

    if (search.length < 2) {
      return res.status(200).json({
        success: true,
        message: "Masukkan minimal 2 karakter nama siswa.",
        data: [],
      });
    }

    if (search.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Pencarian maksimal 100 karakter.",
      });
    }

    const students = await searchStudentsForParent({
      branchId,
      search,
    });

    return res.status(200).json({
      success: true,
      message: "Pencarian siswa berhasil.",
      data: students,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// POST: PARENT MENGAJUKAN KLAIM SISWA
// ==========================================

export async function submitStudentClaim(req, res, next) {
  try {
    const claim = await createParentStudentClaim(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message:
        "Permintaan menghubungkan siswa berhasil diajukan dan menunggu pemeriksaan admin.",
      data: claim,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// POST: ADMIN MENYETUJUI KLAIM SISWA
// ==========================================

export async function approveStudentClaim(req, res, next) {
  try {
    const claimId = req.params.claimId;

    if (!zIsValidUuid(claimId)) {
      return res.status(400).json({
        success: false,
        message: "ID pengajuan tidak valid.",
      });
    }

    const access = getParentAccess(req);

    const result = await approveParentStudentClaim(claimId, {
      ...access,
      assignedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: "Pengajuan siswa berhasil disetujui.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// POST: ADMIN MENOLAK KLAIM SISWA
// ==========================================

export async function rejectStudentClaim(req, res, next) {
  try {
    const claimId = req.params.claimId;

    if (!zIsValidUuid(claimId)) {
      return res.status(400).json({
        success: false,
        message: "ID pengajuan tidak valid.",
      });
    }

    const access = getParentAccess(req);

    const result = await rejectParentStudentClaim(
      claimId,
      req.body.reviewNotes,
      {
        ...access,
        assignedBy: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Pengajuan siswa berhasil ditolak.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
