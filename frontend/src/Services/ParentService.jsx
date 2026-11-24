import { apiRequest } from "./Api";

// ==========================================
// PARENT: DASHBOARD
// ==========================================

export async function getMyParentDashboard() {
  return apiRequest("/api/parents/me/dashboard");
}

// ==========================================
// PARENT: DAFTAR PENGAJUAN ANAK
// ==========================================

export async function getMyParentStudentClaims() {
  return apiRequest("/api/parents/me/student-claims");
}

// ==========================================
// PARENT: AJUKAN KLAIM SISWA
// ==========================================

export async function submitStudentClaim(payload) {
  return apiRequest("/api/parents/me/student-claims", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// PARENT: CARI SISWA TERDAFTAR
// ==========================================

export async function searchStudentsForParent(branchId, search) {
  const query = new URLSearchParams({
    branchId,
    search,
  });

  return apiRequest(`/api/parents/me/available-students?${query.toString()}`);
}

// ==========================================
// ADMIN: DAFTAR PENGAJUAN ANAK
// ==========================================

export async function getAdminParentStudentClaims() {
  return apiRequest("/api/parents/student-claims");
}

// ==========================================
// ADMIN: SETUJUI PENGAJUAN ANAK
// ==========================================

export async function approveParentStudentClaim(claimId) {
  return apiRequest(`/api/parents/student-claims/${claimId}/approve`, {
    method: "POST",
  });
}

// ==========================================
// ADMIN: TOLAK PENGAJUAN ANAK
// ==========================================

export async function rejectParentStudentClaim(claimId, reviewNotes) {
  return apiRequest(`/api/parents/student-claims/${claimId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reviewNotes }),
  });
}
