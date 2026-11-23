import { apiRequest } from "./Api";

const BASE_URL = "/api/branches";

// ==========================================
// DAFTAR CABANG
// ==========================================

export async function getBranches(params = {}) {
  const query = new URLSearchParams();

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.isActive !== undefined && params.isActive !== "") {
    query.set("isActive", String(params.isActive));
  }

  query.set("page", String(params.page || 1));
  query.set("limit", String(params.limit || 10));

  return apiRequest(`${BASE_URL}?${query.toString()}`);
}

// ==========================================
// PARENT - DAFTAR UNIT AKTIF
// ==========================================

export async function getActiveBranchesForParent() {
  return apiRequest(`${BASE_URL}/parent/units`);
}

// ==========================================
// DETAIL CABANG
// ==========================================

export async function getBranchById(id) {
  return apiRequest(`${BASE_URL}/${id}`);
}

// ==========================================
// TAMBAH CABANG
// ==========================================

export async function createBranch(data) {
  return apiRequest(BASE_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ==========================================
// EDIT CABANG
// ==========================================

export async function updateBranch(id, data) {
  return apiRequest(`${BASE_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ==========================================
// UBAH STATUS CABANG
// ==========================================

export async function updateBranchStatus(id, isActive) {
  return apiRequest(`${BASE_URL}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}
