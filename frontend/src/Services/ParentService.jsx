import { apiRequest } from "./Api";

// ==========================================
// GET: DAFTAR ORANG TUA
// ==========================================

export async function getParents(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });

  return apiRequest(`/api/parents?${query.toString()}`);
}

// ==========================================
// GET: AKUN YANG BISA DIJADIKAN PARENT
// ==========================================

export async function getEligibleParentAccounts() {
  return apiRequest("/api/parents/eligible-accounts");
}

// ==========================================
// GET: DETAIL ORANG TUA
// ==========================================

export async function getParentById(id) {
  return apiRequest(`/api/parents/${id}`);
}

// ==========================================
// POST: TAMBAH ORANG TUA
// ==========================================

export async function createParent(payload) {
  return apiRequest("/api/parents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// PUT: HAPUS ROLE ORANG TUA
// ==========================================

export async function restoreParentToUser(parentId) {
  return apiRequest(`/api/parents/${parentId}/restore-user`, {
    method: "POST",
  });
}

// ==========================================
// PUT: EDIT ORANG TUA
// ==========================================

export async function updateParent(id, payload) {
  return apiRequest(`/api/parents/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// POST: HUBUNGKAN ORANG TUA DENGAN SISWA
// ==========================================

export async function linkParentStudent(parentId, payload) {
  return apiRequest(`/api/parents/${parentId}/students`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// DELETE: LEPASKAN HUBUNGAN DENGAN SISWA
// ==========================================

export async function unlinkParentStudent(parentId, studentId) {
  return apiRequest(`/api/parents/${parentId}/students/${studentId}`, {
    method: "DELETE",
  });
}

export async function getMyParentDashboard() {
  return apiRequest("/api/parents/me/dashboard");
}
export async function getMyParentStudentClaims() {
  return apiRequest("/api/parents/me/student-claims");
}
// ==========================================
// POST: AJUKAN KLAIM SISWA TERDAFTAR
// ==========================================

export async function submitStudentClaim(payload) {
  return apiRequest("/api/parents/me/student-claims", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// GET: CARI SISWA TERDAFTAR UNTUK PARENT
// ==========================================

export async function searchStudentsForParent(branchId, search) {
  const query = new URLSearchParams({
    branchId,
    search,
  });

  return apiRequest(`/api/parents/me/available-students?${query.toString()}`);
}

// ==========================================
// ADMIN: PARENT STUDENT CLAIMS
// ==========================================

export async function getAdminParentStudentClaims() {
  return apiRequest("/api/parents/student-claims");
}

export async function approveParentStudentClaim(claimId) {
  return apiRequest(`/api/parents/student-claims/${claimId}/approve`, {
    method: "POST",
  });
}

export async function rejectParentStudentClaim(claimId, reviewNotes) {
  return apiRequest(`/api/parents/student-claims/${claimId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reviewNotes }),
  });
}
