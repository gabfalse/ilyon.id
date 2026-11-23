const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL belum dikonfigurasi.");
}

const BASE_URL = "/api/recruitment/public";

// ==========================================
// RESPONSE HANDLER
// ==========================================

async function parseResponse(response) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    const error = new Error(result.message || "Terjadi kesalahan pada server.");

    error.status = response.status;
    error.errors = result.errors || [];

    throw error;
  }

  return result;
}

// ==========================================
// RECRUITMENT CSRF TOKEN
// ==========================================

async function getRecruitmentCsrfToken() {
  const response = await fetch(`${API_URL}${BASE_URL}/csrf`, {
    method: "GET",
    credentials: "include",
  });

  const result = await parseResponse(response);
  const token = result.data?.csrfToken;

  if (!token) {
    throw new Error("Recruitment CSRF token tidak ditemukan.");
  }

  return token;
}

// ==========================================
// GET PUBLIC VACANCIES
// ==========================================

export async function getPublicRecruitmentVacancies() {
  const response = await fetch(`${API_URL}${BASE_URL}/vacancies`, {
    method: "GET",
    credentials: "include",
  });

  const result = await parseResponse(response);

  return result.data;
}

// ==========================================
// SUBMIT APPLICATION
// ==========================================

export async function submitPublicRecruitmentApplication(data, file) {
  if (!file) {
    throw new Error("CV wajib diunggah.");
  }

  const csrfToken = await getRecruitmentCsrfToken();

  const formData = new FormData();

  formData.append("vacancyId", data.vacancyId);
  formData.append("fullName", data.fullName);
  formData.append("email", data.email);
  formData.append("phone", data.phone);
  formData.append("address", data.address || "");
  formData.append("city", data.city || "");
  formData.append("province", data.province || "");
  formData.append("educationLevel", data.educationLevel);
  formData.append("educationMajor", data.educationMajor || "");
  formData.append("experienceYears", String(data.experienceYears ?? 0));
  formData.append("currentOccupation", data.currentOccupation || "");
  formData.append("coverLetter", data.coverLetter || "");
  formData.append("portfolioUrl", data.portfolioUrl || "");
  formData.append("document", file);

  const response = await fetch(`${API_URL}${BASE_URL}/applications`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-CSRF-Token": csrfToken,
    },
    body: formData,
  });

  const result = await parseResponse(response);

  return result.data;
}

// ==========================================
// TRACK APPLICATION
// ==========================================

export async function trackPublicRecruitmentApplication(
  applicationNumber,
  trackingToken,
) {
  const csrfToken = await getRecruitmentCsrfToken();

  const response = await fetch(`${API_URL}${BASE_URL}/track`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({
      applicationNumber,
      trackingToken,
    }),
  });

  const result = await parseResponse(response);

  return result.data;
}
