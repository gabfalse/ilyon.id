import {
  getPublicVacancies,
  submitApplication,
  trackApplication,
} from "../services/recruitmentPublic.service.js";

// ==========================================
// GET PUBLIC VACANCIES
// ==========================================

export async function getVacancies(req, res, next) {
  try {
    const data = await getPublicVacancies();

    return res.status(200).json({
      success: true,
      message: "Daftar lowongan berhasil diambil.",
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// SUBMIT APPLICATION
// ==========================================

export async function applyForVacancy(req, res, next) {
  try {
    const data = await submitApplication(req.body, req.file);

    return res.status(201).json({
      success: true,
      message: "Lamaran berhasil dikirim.",
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// TRACK APPLICATION
// ==========================================

export async function checkApplicationStatus(req, res, next) {
  try {
    const { applicationNumber, trackingToken } = req.body;

    const data = await trackApplication(applicationNumber, trackingToken);

    return res.status(200).json({
      success: true,
      message: "Status lamaran berhasil diambil.",
      data,
    });
  } catch (error) {
    next(error);
  }
}
