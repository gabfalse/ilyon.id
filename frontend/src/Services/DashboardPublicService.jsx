import { apiRequest } from "./Api";

// ==========================================
// PUBLIC DASHBOARD STATISTICS
// ==========================================

const DashboardPublicService = {
  async getStatistics() {
    const response = await apiRequest("/api/public/dashboard-statistics");

    return response.data;
  },
};

export default DashboardPublicService;
