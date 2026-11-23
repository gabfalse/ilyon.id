import { apiRequest } from "./Api";

// ==========================================
// PUBLIC PROGRAM SERVICE
// ==========================================

const ProgramPublicService = {
  async getPrograms() {
    const response = await apiRequest("/api/public/programs");

    return response.data;
  },
};

export default ProgramPublicService;
