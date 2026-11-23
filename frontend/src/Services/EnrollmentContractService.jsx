import { apiRequest } from "./Api";

const BASE_URL = "/api/enrollment-contracts";

// ==========================================
// GET ENROLLMENT CONTRACTS
// ==========================================

export async function getEnrollmentContracts(params = {}) {
  const query = new URLSearchParams();

  const filters = ["search", "status", "branchId", "offeringId"];

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
// GET CONTRACT DETAIL
// ==========================================

export async function getEnrollmentContractById(id) {
  return apiRequest(`${BASE_URL}/${id}`);
}

// ==========================================
// CREATE CONTRACT
// ==========================================

export async function createEnrollmentContract(data) {
  return apiRequest(BASE_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ==========================================
// UPDATE CONTRACT
// ==========================================

export async function updateEnrollmentContract(id, data) {
  return apiRequest(`${BASE_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ==========================================
// UPDATE CONTRACT STATUS
// ==========================================

export async function updateEnrollmentContractStatus(id, status) {
  return apiRequest(`${BASE_URL}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ==========================================
// UPDATE CONTRACT MEMBER
// ==========================================

export async function updateEnrollmentContractMember(
  contractId,
  enrollmentId,
  data,
) {
  return apiRequest(`${BASE_URL}/${contractId}/members/${enrollmentId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
