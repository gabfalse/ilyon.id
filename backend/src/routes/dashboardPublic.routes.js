import { Router } from "express";

import {
  getDashboardStatistics,
  getPrograms,
} from "../controllers/dashboardPublic.controller.js";

const router = Router();

// ==========================================
// PUBLIC DASHBOARD STATISTICS
// ==========================================

// GET /api/public/dashboard-statistics
router.get("/dashboard-statistics", getDashboardStatistics);

// ==========================================
// PUBLIC PROGRAMS
// ==========================================

// GET /api/public/programs
router.get("/programs", getPrograms);

export default router;
