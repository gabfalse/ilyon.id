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

// ==========================================
// GET MY TUTOR STUDENT DETAIL
// ==========================================

export async function getMyTutorStudentDetail(studentId) {
  return apiRequest(`/api/tutors/me/students/${encodeURIComponent(studentId)}`);
}

// ==========================================
// TUTOR: KEHADIRAN & LAPORAN BELAJAR
// ==========================================

// GET MATA PELAJARAN AKTIF
export async function getMyTutorLearningSubjects() {
  return apiRequest("/api/tutors/me/learning/subjects");
}

// SIMPAN KEHADIRAN + LAPORAN BELAJAR
export async function createMyTutorLearningSession(payload) {
  return apiRequest("/api/tutors/me/learning/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// TUTOR: KEHADIRAN HARIAN
// ==========================================

// GET DAFTAR KEHADIRAN BERDASARKAN TANGGAL
export async function getMyTutorDailyAttendance(date) {
  return apiRequest(
    `/api/tutors/me/attendance/daily?date=${encodeURIComponent(date)}`,
  );
}

// UPDATE KEHADIRAN DAN LAPORAN BELAJAR
export async function updateMyTutorAttendance(attendanceId, payload) {
  return apiRequest(
    `/api/tutors/me/attendance/${encodeURIComponent(attendanceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}
