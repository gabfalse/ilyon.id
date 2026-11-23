import { apiRequest } from "./Api";

const BASE_URL = "/api/recruitment/vacancies";

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
// GET DAFTAR LOWONGAN
// ==========================================

export async function getRecruitmentVacancies(params = {}) {
  const query = buildQuery(params);
  const endpoint = query ? `${BASE_URL}?${query}` : BASE_URL;

  const result = await apiRequest(endpoint);

  return result.data;
}

// ==========================================
// GET DETAIL LOWONGAN
// ==========================================

export async function getRecruitmentVacancyById(vacancyId) {
  if (!vacancyId) {
    throw new Error("ID lowongan wajib diisi.");
  }

  const result = await apiRequest(
    `${BASE_URL}/${encodeURIComponent(vacancyId)}`,
  );

  return result.data;
}

// ==========================================
// CREATE LOWONGAN
// ==========================================

export async function createRecruitmentVacancy(data) {
  const result = await apiRequest(BASE_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });

  return result.data;
}

// ==========================================
// UPDATE LOWONGAN
// ==========================================

export async function updateRecruitmentVacancy(vacancyId, data) {
  if (!vacancyId) {
    throw new Error("ID lowongan wajib diisi.");
  }

  const result = await apiRequest(
    `${BASE_URL}/${encodeURIComponent(vacancyId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );

  return result.data;
}

// ==========================================
// UPDATE STATUS LOWONGAN
// ==========================================

export async function updateRecruitmentVacancyStatus(vacancyId, status) {
  if (!vacancyId) {
    throw new Error("ID lowongan wajib diisi.");
  }

  const result = await apiRequest(
    `${BASE_URL}/${encodeURIComponent(vacancyId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

  return result.data;
}

// ==========================================
// DELETE LOWONGAN
// ==========================================

export async function deleteRecruitmentVacancy(vacancyId) {
  if (!vacancyId) {
    throw new Error("ID lowongan wajib diisi.");
  }

  const result = await apiRequest(
    `${BASE_URL}/${encodeURIComponent(vacancyId)}`,
    {
      method: "DELETE",
    },
  );

  return result.data;
}

// ==========================================
// TEST EMAIL RESEND
// ==========================================

export async function sendRecruitmentTestEmail() {
  const result = await apiRequest("/api/recruitment/email/test", {
    method: "POST",
  });

  return result;
}
