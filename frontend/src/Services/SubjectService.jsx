import { apiRequest } from "./Api";

const BASE_URL = "/api/subjects";

// ==========================================
// SUBJECT
// ==========================================

export async function getSubjects(params = {}) {
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

export async function getSubjectById(id) {
  return apiRequest(`${BASE_URL}/${id}`);
}

export async function createSubject(data) {
  return apiRequest(BASE_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSubject(id, data) {
  return apiRequest(`${BASE_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function updateSubjectStatus(id, isActive) {
  return apiRequest(`${BASE_URL}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

// ==========================================
// PROGRAM SUBJECT MAPPING
// ==========================================

export async function getProgramSubjects(programId) {
  return apiRequest(`${BASE_URL}/program/${programId}`);
}

export async function updateProgramSubjects(programId, subjects) {
  return apiRequest(`${BASE_URL}/program/${programId}`, {
    method: "PUT",
    body: JSON.stringify({ subjects }),
  });
}
