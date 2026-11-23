import { apiRequest } from "./Api";

// ==========================================
// GET: DAFTAR STAFF
// ==========================================

export async function getStaff(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });

  return apiRequest(`/api/staff?${query.toString()}`);
}

// ==========================================
// GET: DETAIL STAFF
// ==========================================

export async function getStaffById(id) {
  return apiRequest(`/api/staff/${id}`);
}

// ==========================================
// POST: TAMBAH STAFF + AKUN LOGIN
// ==========================================

export async function createStaff(payload) {
  return apiRequest("/api/staff", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// PUT: UPDATE STAFF
// ==========================================

export async function updateStaff(id, payload) {
  return apiRequest(`/api/staff/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// PATCH: PINDAH CABANG STAFF
// ==========================================

export async function transferStaff(id, payload) {
  return apiRequest(`/api/staff/${id}/transfer`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// PATCH: AKTIFKAN / NONAKTIFKAN STAFF
// ==========================================

export async function updateStaffStatus(id, isActive) {
  return apiRequest(`/api/staff/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}
