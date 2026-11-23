import { apiRequest } from "./Api";

const BASE_URL = "/api/enrollments";

// ==========================================
// GET ENROLLMENTS
// ==========================================

export async function getEnrollments(params = {}) {
  const query = new URLSearchParams();

  const filters = [
    "search",
    "status",
    "branchId",
    "studentId",
    "programId",
    "offeringId",
  ];

  filters.forEach((key) => {
    if (params[key] !== undefined && params[key] !== "") {
      query.set(key, String(params[key]));
    }
  });

  query.set("page", String(params.page || 1));
  query.set("limit", String(params.limit || 10));

  return apiRequest(`${BASE_URL}?${query.toString()}`);
}

// ==========================================
// GET ENROLLMENT DETAIL
// ==========================================

export async function getEnrollmentById(id) {
  return apiRequest(`${BASE_URL}/${id}`);
}

// ==========================================
// CREATE ENROLLMENT
// ==========================================

export async function createEnrollment(data) {
  return apiRequest(BASE_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ==========================================
// UPDATE ENROLLMENT
// ==========================================

export async function updateEnrollment(id, data) {
  return apiRequest(`${BASE_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ==========================================
// UPDATE ENROLLMENT STATUS
// ==========================================

export async function updateEnrollmentStatus(id, status) {
  return apiRequest(`${BASE_URL}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
