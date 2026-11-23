import { apiRequest } from "./Api";

// ==========================================
// GET: DAFTAR DOKUMEN PROFIL HR
// ==========================================

export async function getHrDocumentsByProfile(profileId) {
  return apiRequest(`/api/hr-documents/profile/${profileId}`);
}

// ==========================================
// GET: DETAIL DOKUMEN HR
// ==========================================

export async function getHrDocumentById(id) {
  return apiRequest(`/api/hr-documents/${id}`);
}

// ==========================================
// POST: UPLOAD DOKUMEN HR
// ==========================================

export async function uploadHrDocument(payload) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value instanceof File ? value : String(value));
    }
  });

  return apiRequest("/api/hr-documents", {
    method: "POST",
    body: formData,
  });
}

// ==========================================
// PUT: UPDATE METADATA DOKUMEN
// ==========================================

export async function updateHrDocument(id, payload) {
  return apiRequest(`/api/hr-documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// PATCH: GANTI FILE DOKUMEN
// ==========================================

export async function replaceHrDocumentFile(id, file) {
  const formData = new FormData();
  formData.append("document", file);

  return apiRequest(`/api/hr-documents/${id}/replace`, {
    method: "PATCH",
    body: formData,
  });
}

// ==========================================
// PATCH: VERIFIKASI / TOLAK DOKUMEN
// ==========================================

export async function verifyHrDocument(id, verificationStatus) {
  return apiRequest(`/api/hr-documents/${id}/verification`, {
    method: "PATCH",
    body: JSON.stringify({ verificationStatus }),
  });
}

// ==========================================
// GET: URL DOWNLOAD DOKUMEN
// ==========================================

export async function getHrDocumentDownloadUrl(id) {
  return apiRequest(`/api/hr-documents/${id}/download`);
}

// ==========================================
// DELETE: HAPUS DOKUMEN
// ==========================================

export async function deleteHrDocument(id) {
  return apiRequest(`/api/hr-documents/${id}`, {
    method: "DELETE",
  });
}
