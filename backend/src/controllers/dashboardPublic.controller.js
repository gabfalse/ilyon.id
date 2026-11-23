import {
  getPublicDashboardStatistics,
  getPublicPrograms,
} from "../services/dashboardPublic.service.js";

// ==========================================
// GET PUBLIC DASHBOARD STATISTICS
// ==========================================

export async function getDashboardStatistics(req, res, next) {
  try {
    const statistics = await getPublicDashboardStatistics();

    return res.status(200).json({
      success: true,
      message: "Dashboard statistics retrieved successfully",
      data: statistics,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET PUBLIC PROGRAMS
// ==========================================

export async function getPrograms(req, res, next) {
  try {
    const programs = await getPublicPrograms();

    return res.status(200).json({
      success: true,
      message: "Public programs retrieved successfully",
      data: programs,
    });
  } catch (error) {
    return next(error);
  }
}
