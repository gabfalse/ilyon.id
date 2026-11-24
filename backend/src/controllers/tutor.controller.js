import {
  getAllTutors,
  getTutorById,
  getTutorByUserId,
  createTutor,
  updateTutor,
  updateTutorStatus,
} from "../services/tutor.service.js";
import {
  getMyTutorStudents,
  getMyTutorStudentById,
} from "../services/student.service.js";

// ==========================================
// GET: DAFTAR TUTOR
// ==========================================

export async function listTutors(req, res, next) {
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

    const result = await getAllTutors({
      search: String(search).trim(),
      employmentStatus,
      branchId,
      page: parsedPage,
      limit: parsedLimit,
    });

    return res.status(200).json({
      success: true,
      message: "Daftar tutor berhasil diambil.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET: DETAIL TUTOR
// ==========================================

export async function detailTutor(req, res, next) {
  try {
    const tutor = await getTutorById(req.params.id);

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: "Tutor tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detail tutor berhasil diambil.",
      data: tutor,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// POST: TAMBAH TUTOR
// ==========================================

export async function storeTutor(req, res, next) {
  try {
    const tutor = await createTutor(req.body, {
      actorId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(201).json({
      success: true,
      message: "Tutor dan akun login berhasil dibuat.",
      data: tutor,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PUT: UPDATE TUTOR
// ==========================================

export async function updateTutorController(req, res, next) {
  try {
    const tutor = await updateTutor(req.params.id, req.body, {
      actorId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: "Data tutor berhasil diperbarui.",
      data: tutor,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PATCH: UPDATE STATUS TUTOR
// ==========================================

export async function updateTutorStatusController(req, res, next) {
  try {
    const tutor = await updateTutorStatus(req.params.id, req.body.isActive, {
      actorId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: req.body.isActive
        ? "Tutor berhasil diaktifkan kembali."
        : "Tutor berhasil dinonaktifkan.",
      data: tutor,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET MY TUTOR PROFILE
// ==========================================

export async function getMyTutorProfile(req, res, next) {
  try {
    const tutor = await getTutorByUserId(req.user.id);

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: "Profil tutor tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profil tutor berhasil diambil.",
      data: tutor,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET MY TUTOR STUDENTS
// ==========================================

export async function getMyTutorStudentsController(req, res, next) {
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

    const result = await getMyTutorStudents({
      userId: req.user.id,
      search: String(search).trim(),
      page: parsedPage,
      limit: parsedLimit,
    });

    return res.status(200).json({
      success: true,
      message: "Daftar siswa tutor berhasil diambil.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET MY TUTOR STUDENT DETAIL
// ==========================================

export async function getMyTutorStudentDetailController(req, res, next) {
  try {
    const student = await getMyTutorStudentById(req.user.id, req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Siswa tidak ditemukan atau tidak termasuk cabang penugasan Anda.",
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
