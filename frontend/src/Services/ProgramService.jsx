import { apiRequest } from "./Api";

const BASE_URL = "/api/programs";

// ==========================================
// PROGRAM
// ==========================================

export async function getPrograms(params = {}) {
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

export async function getProgramById(id) {
  return apiRequest(`${BASE_URL}/${id}`);
}

export async function createProgram(data) {
  return apiRequest(BASE_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProgram(id, data) {
  return apiRequest(`${BASE_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function updateProgramStatus(id, isActive) {
  return apiRequest(`${BASE_URL}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

// ==========================================
// PROGRAM - SUBJECT MAPPING
// ==========================================

// Mengambil Subject yang sudah terhubung ke Program
export async function getProgramSubjects(programId) {
  return apiRequest(`${BASE_URL}/${programId}/subjects`);
}

// Mengambil Subject aktif yang belum terhubung ke Program
export async function getAvailableProgramSubjects(programId, params = {}) {
  const query = new URLSearchParams();

  if (params.search) {
    query.set("search", params.search);
  }

  const queryString = query.toString();

  const url = `${BASE_URL}/${programId}/subjects/available${
    queryString ? `?${queryString}` : ""
  }`;

  return apiRequest(url);
}

// Menambahkan Subject ke Program
export async function addProgramSubject(programId, data) {
  return apiRequest(`${BASE_URL}/${programId}/subjects`, {
    method: "POST",
    body: JSON.stringify({
      subjectId: data.subjectId,
      isRequired: data.isRequired ?? false,
    }),
  });
}

// Mengubah status Subject menjadi wajib atau pilihan
export async function updateProgramSubject(programId, subjectId, isRequired) {
  return apiRequest(`${BASE_URL}/${programId}/subjects/${subjectId}`, {
    method: "PATCH",
    body: JSON.stringify({ isRequired }),
  });
}

// Melepaskan Subject dari Program
export async function deleteProgramSubject(programId, subjectId) {
  return apiRequest(`${BASE_URL}/${programId}/subjects/${subjectId}`, {
    method: "DELETE",
  });
}

// ==========================================
// PROGRAM OFFERINGS
// ==========================================

export async function getProgramOfferings(programId, params = {}) {
  const query = new URLSearchParams();

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.isActive !== undefined && params.isActive !== "") {
    query.set("isActive", String(params.isActive));
  }

  query.set("page", String(params.page || 1));
  query.set("limit", String(params.limit || 10));

  return apiRequest(`${BASE_URL}/${programId}/offerings?${query.toString()}`);
}

export async function getActiveProgramOfferings(programId) {
  return apiRequest(`${BASE_URL}/${programId}/offerings/active`);
}

export async function getOfferingById(offeringId) {
  return apiRequest(`${BASE_URL}/offerings/${offeringId}`);
}

export async function createProgramOffering(programId, data) {
  return apiRequest(`${BASE_URL}/${programId}/offerings`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProgramOffering(offeringId, data) {
  return apiRequest(`${BASE_URL}/offerings/${offeringId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function updateProgramOfferingStatus(offeringId, isActive) {
  return apiRequest(`${BASE_URL}/offerings/${offeringId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

// ==========================================
// PARENT - KATALOG OFFERING AKTIF
// ==========================================

export async function getActiveOfferingsForParent() {
  return apiRequest("/api/programs/parent/offerings");
}
