import { z } from "zod";

import {
  getParentDashboardByUserId,
  getParentStudentClaimsByUserId,
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
// GET: DASHBOARD PARENT
// ==========================================

export async function getMyParentDashboard(req, res, next) {
  try {
    const dashboard = await getParentDashboardByUserId(req.user.id);

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
// GET: RIWAYAT PENGAJUAN ANAK PARENT
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
