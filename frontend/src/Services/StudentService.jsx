import { apiRequest } from "./Api";

export async function getStudents(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });

  return apiRequest(`/api/students?${query.toString()}`);
}

export async function getStudentById(id) {
  return apiRequest(`/api/students/${id}`);
}

export async function createStudent(payload) {
  return apiRequest("/api/students", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStudent(id, payload) {
  return apiRequest(`/api/students/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateStudentStatus(id, status) {
  return apiRequest(`/api/students/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}