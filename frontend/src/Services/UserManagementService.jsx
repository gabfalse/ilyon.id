import { apiRequest } from "./api";

const BASE_URL = "/api/user-management";

// Mengambil daftar pengguna dengan pencarian dan pagination.
export async function getUsers({ search = "", page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({
    search,
    page: String(page),
    limit: String(limit),
  });

  return apiRequest(`${BASE_URL}?${params.toString()}`);
}

// Mengambil detail satu pengguna.
export async function getUserById(userId) {
  if (!userId) {
    throw new Error("ID pengguna wajib diisi.");
  }

  return apiRequest(`${BASE_URL}/${encodeURIComponent(userId)}`);
}

// Mengambil daftar cabang aktif.
export async function getAvailableBranches() {
  return apiRequest(`${BASE_URL}/branches`);
}

// Memperbarui penugasan role branch_admin.
export async function updateBranchAdminAssignments(userId, branchIds = []) {
  if (!userId) {
    throw new Error("ID pengguna wajib diisi.");
  }

  if (!Array.isArray(branchIds)) {
    throw new Error("Daftar cabang harus berupa array.");
  }

  return apiRequest(
    `${BASE_URL}/${encodeURIComponent(userId)}/branch-admin-assignments`,
    {
      method: "PUT",
      body: JSON.stringify({ branchIds }),
    },
  );
}
