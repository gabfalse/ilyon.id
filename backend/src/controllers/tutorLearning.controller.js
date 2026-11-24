import {
  getActiveTutorLearningSubjects,
  createMyTutorLearningSession,
  getMyTutorDailyAttendance,
  updateMyTutorAttendance,
} from "../services/tutorLearning.service.js";

// ==========================================
// GET MY TUTOR LEARNING SUBJECTS
// ==========================================

export async function getMyTutorLearningSubjectsController(req, res, next) {
  try {
    const subjects = await getActiveTutorLearningSubjects();

    return res.status(200).json({
      success: true,
      message: "Daftar mata pelajaran berhasil diambil.",
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// CREATE MY TUTOR LEARNING SESSION
// ==========================================

export async function createMyTutorLearningSessionController(req, res, next) {
  try {
    const result = await createMyTutorLearningSession(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: "Kehadiran dan laporan belajar berhasil disimpan.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET MY DAILY ATTENDANCE
// ==========================================

export async function getMyTutorDailyAttendanceController(req, res, next) {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Tanggal wajib diisi dengan format YYYY-MM-DD.",
      });
    }

    const result = await getMyTutorDailyAttendance(req.user.id, date);

    return res.status(200).json({
      success: true,
      message: "Kehadiran harian berhasil diambil.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// UPDATE MY ATTENDANCE
// ==========================================

export async function updateMyTutorAttendanceController(req, res, next) {
  try {
    const result = await updateMyTutorAttendance(
      req.user.id,
      req.params.attendanceId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Kehadiran dan laporan belajar berhasil diperbarui.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
