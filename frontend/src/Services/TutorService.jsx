import { apiRequest } from "./Api";

// ==========================================
// GET: DAFTAR TUTOR
// ==========================================

export async function getTutors(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });

  return apiRequest(`/api/tutors?${query.toString()}`);
}

// ==========================================
// GET: DETAIL TUTOR
// ==========================================

export async function getTutorById(id) {
  return apiRequest(`/api/tutors/${id}`);
}

// ==========================================
// POST: TAMBAH TUTOR + AKUN LOGIN
// ==========================================

export async function createTutor(payload) {
  return apiRequest("/api/tutors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// PUT: UPDATE TUTOR
// ==========================================

export async function updateTutor(id, payload) {
  return apiRequest(`/api/tutors/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// PATCH: AKTIFKAN / NONAKTIFKAN TUTOR
// ==========================================

export async function updateTutorStatus(id, isActive) {
  return apiRequest(`/api/tutors/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

// ==========================================
// GET TUTOR BY LOGIN USER ID
// ==========================================

export async function getTutorByUserId(userId) {
  const result = await pool.query(
    `
      SELECT id
      FROM tutor_profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getTutorById(result.rows[0].id);
}

// ==========================================
// GET PROFIL TUTOR YANG SEDANG LOGIN
// ==========================================

export async function getMyTutorProfile() {
  return apiRequest("/api/tutors/me");
}

// ==========================================
// GET MY TUTOR STUDENTS
// ==========================================

export async function getMyTutorStudents(params = {}) {
  const query = new URLSearchParams(params).toString();

  return apiRequest(`/api/tutors/me/students${query ? `?${query}` : ""}`);
}
