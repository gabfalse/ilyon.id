import { apiRequest } from "./Api";

const BASE_URL = "/api/recruitment/applications";

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  return query.toString();
}

// ==========================================
// GET DAFTAR LAMARAN
// ==========================================

export async function getRecruitmentApplications(params = {}) {
  const query = buildQuery(params);
  const endpoint = query ? `${BASE_URL}?${query}` : BASE_URL;

  const result = await apiRequest(endpoint);

  return result.data;
}

// ==========================================
// GET DETAIL LAMARAN
// ==========================================

export async function getRecruitmentApplicationById(applicationId) {
  if (!applicationId) {
    throw new Error("ID lamaran wajib diisi.");
  }

  const result = await apiRequest(
    `${BASE_URL}/${encodeURIComponent(applicationId)}`,
  );

  return result.data;
}

// ==========================================
// GET TOKEN PELACAKAN LAMARAN
// ==========================================

export async function getRecruitmentApplicationTrackingToken(applicationId) {
  if (!applicationId) {
    throw new Error("ID lamaran wajib diisi.");
  }

  const result = await apiRequest(
    `${BASE_URL}/${encodeURIComponent(applicationId)}/tracking-token`,
  );

  return result.data;
}

// ==========================================
// GET URL DOKUMEN LAMARAN
// ==========================================

export async function getRecruitmentApplicationDocumentUrl(
  applicationId,
  documentId,
) {
  if (!applicationId || !documentId) {
    throw new Error("ID lamaran dan ID dokumen wajib diisi.");
  }

  const result = await apiRequest(
    `${BASE_URL}/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(documentId)}`,
  );

  return result.data;
}

// ==========================================
// UPDATE STATUS LAMARAN
// ==========================================

export async function updateRecruitmentApplicationStatus(applicationId, data) {
  if (!applicationId) {
    throw new Error("ID lamaran wajib diisi.");
  }

  const result = await apiRequest(
    `${BASE_URL}/${encodeURIComponent(applicationId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );

  return result.data;
}
