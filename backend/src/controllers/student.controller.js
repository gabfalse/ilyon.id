import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  updateStudentStatus,
} from "../services/student.service.js";

// ==========================================
// AUDIT CONTEXT
// ==========================================

function getAuditContext(req) {
  return {
    userId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || null,
  };
}

// ==========================================
// GET: DAFTAR SISWA
// ==========================================

export async function listStudents(req, res, next) {
  try {
    const {
      search = "",
      status,
      primaryBranchId,
      page = "1",
      limit = "10",
    } = req.query;

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

    const allowedStatuses = [
      "active",
      "inactive",
      "graduated",
      "transferred",
      "withdrawn",
    ];

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Parameter status tidak valid.",
      });
    }

    const result = await getAllStudents({
      search: String(search).trim(),
      status,
      primaryBranchId,
      page: parsedPage,
      limit: parsedLimit,
    });

    return res.status(200).json({
      success: true,
      message: "Daftar siswa berhasil diambil.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET: DETAIL SISWA
// ==========================================

export async function detailStudent(req, res, next) {
  try {
    const student = await getStudentById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Siswa tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detail siswa berhasil diambil.",
      data: student,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// POST: TAMBAH SISWA
// ==========================================

export async function storeStudent(req, res, next) {
  try {
    const student = await createStudent(
      {
        ...req.body,
        // Identitas pembuat diambil dari sesi login,
        // bukan dari input frontend.
        createdBy: req.user.id,
      },
      getAuditContext(req),
    );

    return res.status(201).json({
      success: true,
      message: "Siswa berhasil ditambahkan.",
      data: student,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Kode siswa sudah digunakan.",
      });
    }

    return next(error);
  }
}

// ==========================================
// PUT: EDIT SISWA
// ==========================================

export async function editStudent(req, res, next) {
  try {
    const student = await updateStudent(
      req.params.id,
      req.body,
      getAuditContext(req),
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Siswa tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data siswa berhasil diperbarui.",
      data: student,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Kode siswa sudah digunakan.",
      });
    }

    return next(error);
  }
}

// ==========================================
// PATCH: UBAH STATUS SISWA
// ==========================================

export async function changeStudentStatus(req, res, next) {
  try {
    const student = await updateStudentStatus(
      req.params.id,
      req.body.status,
      getAuditContext(req),
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Siswa tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Status siswa berhasil diperbarui.",
      data: student,
    });
  } catch (error) {
    return next(error);
  }
}
