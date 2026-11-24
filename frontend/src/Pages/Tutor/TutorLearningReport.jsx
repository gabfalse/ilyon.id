import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getMyTutorStudents,
  getMyTutorLearningSubjects,
  createMyTutorLearningSession,
} from "../../Services/TutorService";

// ==========================================
// HELPERS
// ==========================================

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const initialStudentForm = {
  attendanceStatus: "present",
  attendanceNote: "",
  subjectId: "",
  topic: "",
  activityNotes: "",
  strengths: "",
  difficulties: "",
  followUp: "",
  score: "",
  maxScore: "",
};

const attendanceOptions = [
  { value: "present", label: "Hadir" },
  { value: "late", label: "Terlambat" },
  { value: "sick", label: "Sakit" },
  { value: "permission", label: "Izin" },
  { value: "absent", label: "Alpa" },
];

const reportRequiredStatuses = ["present", "late"];

const sessionTypes = [
  { value: "scheduled", label: "Terjadwal" },
  { value: "clinic", label: "Harian" },
  { value: "private", label: "Private" },
  { value: "small_group", label: "Small Group" },
  { value: "makeup", label: "Pengganti" },
  { value: "other", label: "Lainnya" },
];

function isReportRequired(status) {
  return reportRequiredStatuses.includes(status);
}

// ==========================================
// COMPONENT
// ==========================================

export default function TutorLearningReport() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentForm, setStudentForm] = useState(initialStudentForm);

  const [sessionDate, setSessionDate] = useState(getTodayDate());
  const [sessionType, setSessionType] = useState("scheduled");
  const [customSessionType, setCustomSessionType] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ========================================
  // LOAD STUDENTS AND SUBJECTS
  // ========================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [studentResponse, subjectResponse] = await Promise.all([
        getMyTutorStudents({ page: 1, limit: 100 }),
        getMyTutorLearningSubjects(),
      ]);

      let allStudents = studentResponse.data || [];
      const totalPages = studentResponse.pagination?.totalPages || 1;

      for (let page = 2; page <= totalPages; page += 1) {
        const response = await getMyTutorStudents({
          page,
          limit: 100,
        });

        allStudents = [...allStudents, ...(response.data || [])];
      }

      setStudents(allStudents);
      setSubjects(subjectResponse.data || []);
    } catch (err) {
      setError(err.message || "Gagal memuat data pembelajaran.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========================================
  // FILTER STUDENTS
  // ========================================

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (keyword.length < 2) return [];

    return students.filter((student) => {
      return (
        String(student.fullName || "")
          .toLowerCase()
          .includes(keyword) ||
        String(student.studentCode || "")
          .toLowerCase()
          .includes(keyword) ||
        String(student.nickname || "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [students, search]);

  const needsReport = isReportRequired(studentForm.attendanceStatus);

  // ========================================
  // SELECT STUDENT
  // ========================================

  function selectStudent(student) {
    setSelectedStudent(student);
    setStudentForm({ ...initialStudentForm });
    setSearch("");
    setError("");
    setSuccess("");
  }

  function removeSelectedStudent() {
    setSelectedStudent(null);
    setStudentForm({ ...initialStudentForm });
    setError("");
    setSuccess("");
  }

  function updateStudentForm(field, value) {
    setStudentForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // ========================================
  // SAVE ONE STUDENT
  // ========================================

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    try {
      if (!selectedStudent) {
        throw new Error("Pilih siswa terlebih dahulu.");
      }

      if (!sessionDate) {
        throw new Error("Tanggal pembelajaran wajib diisi.");
      }

      if (sessionType === "other" && !customSessionType.trim()) {
        throw new Error("Jenis kegiatan lainnya wajib diisi.");
      }

      if (needsReport && !studentForm.subjectId) {
        throw new Error("Mata pelajaran wajib dipilih.");
      }

      if (needsReport && !studentForm.topic.trim()) {
        throw new Error("Materi pembelajaran wajib diisi.");
      }

      if (studentForm.score !== "" && Number(studentForm.score) < 0) {
        throw new Error("Nilai tidak boleh kurang dari 0.");
      }

      if (studentForm.maxScore !== "" && Number(studentForm.maxScore) <= 0) {
        throw new Error("Nilai maksimal harus lebih dari 0.");
      }

      if (
        studentForm.score !== "" &&
        studentForm.maxScore !== "" &&
        Number(studentForm.score) > Number(studentForm.maxScore)
      ) {
        throw new Error("Nilai tidak boleh melebihi nilai maksimal.");
      }

      if (studentForm.score !== "" && studentForm.maxScore === "") {
        throw new Error("Isi nilai maksimal jika nilai diberikan.");
      }

      const finalNotes =
        sessionType === "other"
          ? `Jenis kegiatan: ${customSessionType.trim()}${
              sessionNotes.trim() ? `\n${sessionNotes.trim()}` : ""
            }`
          : sessionNotes.trim() || null;

      const payload = {
        sessionDate,
        sessionType,
        notes: finalNotes,
        students: [
          {
            studentId: selectedStudent.id,
            attendanceStatus: studentForm.attendanceStatus,
            attendanceNote: studentForm.attendanceNote || null,

            subjectId: needsReport ? studentForm.subjectId : null,

            topic: needsReport ? studentForm.topic.trim() : null,

            activityNotes: needsReport
              ? studentForm.activityNotes || null
              : null,

            strengths: needsReport ? studentForm.strengths || null : null,

            difficulties: needsReport ? studentForm.difficulties || null : null,

            followUp: needsReport ? studentForm.followUp || null : null,

            score:
              needsReport && studentForm.score !== ""
                ? Number(studentForm.score)
                : null,

            maxScore:
              needsReport && studentForm.maxScore !== ""
                ? Number(studentForm.maxScore)
                : null,
          },
        ],
      };

      setSaving(true);

      const response = await createMyTutorLearningSession(payload);

      setSuccess(
        response.message || "Kehadiran dan laporan belajar berhasil disimpan.",
      );

      // Reset form after successful save
      setSelectedStudent(null);
      setStudentForm({ ...initialStudentForm });
      setSearch("");
      setSessionDate(getTodayDate());
      setSessionType("scheduled");
      setCustomSessionType("");
      setSessionNotes("");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      setError(err.message || "Gagal menyimpan pencatatan siswa.");
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-gray-500">
          Memuat data siswa dan mata pelajaran...
        </p>
      </div>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Kehadiran & Laporan Belajar
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Catat kehadiran dan perkembangan belajar satu siswa dalam setiap
          pencatatan.
        </p>
      </div>

      {/* NOTIFICATIONS */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-700">Tidak dapat melanjutkan</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-700">{success}</p>
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Siswa Aktif</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {students.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Status Pencatatan</p>
          <p className="mt-2 text-lg font-bold text-indigo-700">
            {selectedStudent ? "Siap Dicatat" : "Belum Memilih Siswa"}
          </p>
        </div>
      </div>

      {subjects.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-800">
            Belum ada mata pelajaran aktif.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Hubungi administrator untuk mengaktifkan mata pelajaran sebelum
            membuat laporan belajar.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STUDENT PICKER */}
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900">Pilih Siswa</h2>

            <p className="mt-1 text-sm text-gray-500">
              Setiap pencatatan hanya untuk satu siswa. Ketik minimal 2 huruf
              nama atau kode siswa.
            </p>
          </div>

          <div className="space-y-4 p-5">
            {selectedStudent ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-indigo-600">
                    Siswa Terpilih
                  </p>

                  <p className="mt-1 truncate font-semibold text-gray-900">
                    {selectedStudent.fullName}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {selectedStudent.studentCode}
                    {" · "}
                    {selectedStudent.primaryBranchName ||
                      "Cabang tidak tersedia"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={removeSelectedStudent}
                  className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Ganti Siswa
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Ketik nama atau kode siswa..."
                  autoComplete="off"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                {search.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => selectStudent(student)}
                          className="w-full border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-indigo-50"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {student.fullName}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {student.studentCode}
                            {" · "}
                            {student.primaryBranchName ||
                              "Cabang tidak tersedia"}
                          </p>
                        </button>
                      ))
                    ) : (
                      <p className="p-4 text-center text-sm text-gray-500">
                        Tidak ada siswa yang cocok.
                      </p>
                    )}
                  </div>
                )}

                {search.trim().length > 0 && search.trim().length < 2 && (
                  <p className="mt-2 text-xs text-gray-400">
                    Masukkan minimal 2 huruf untuk mencari siswa.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* STUDENT FORM */}
        {selectedStudent && (
          <>
            {/* GENERAL INFORMATION */}
            <section className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 p-5">
                <h2 className="font-semibold text-gray-900">
                  Informasi Pencatatan
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Informasi pembelajaran untuk siswa yang dipilih.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                {/* DATE */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Tanggal Pembelajaran *
                  </label>

                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(event) => setSessionDate(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* SESSION TYPE */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Jenis Kegiatan *
                  </label>

                  <select
                    required
                    value={sessionType}
                    onChange={(event) => setSessionType(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    {sessionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {sessionType === "other" && (
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Jenis Kegiatan Lainnya *
                    </label>

                    <input
                      type="text"
                      required
                      value={customSessionType}
                      onChange={(event) =>
                        setCustomSessionType(event.target.value)
                      }
                      placeholder="Tuliskan jenis kegiatan..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                )}

                {/* NOTES */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Catatan Pencatatan
                  </label>

                  <textarea
                    rows={3}
                    value={sessionNotes}
                    onChange={(event) => setSessionNotes(event.target.value)}
                    placeholder="Contoh: Belum bayar (opsional)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </section>

            {/* ATTENDANCE */}
            <section className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 p-5">
                <h2 className="font-semibold text-gray-900">Data Kehadiran</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Status Kehadiran *
                  </label>

                  <select
                    required
                    value={studentForm.attendanceStatus}
                    onChange={(event) =>
                      updateStudentForm("attendanceStatus", event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    {attendanceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Catatan Kehadiran
                  </label>

                  <input
                    type="text"
                    value={studentForm.attendanceNote}
                    onChange={(event) =>
                      updateStudentForm("attendanceNote", event.target.value)
                    }
                    placeholder="Opsional"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </section>

            {/* LEARNING REPORT */}
            {needsReport ? (
              <section className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-100 p-5">
                  <h2 className="font-semibold text-gray-900">
                    Laporan Belajar
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Mata pelajaran dan materi wajib diisi. Kolom lainnya
                    opsional.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                  {/* SUBJECT */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Mata Pelajaran *
                    </label>

                    <select
                      required
                      value={studentForm.subjectId}
                      onChange={(event) =>
                        updateStudentForm("subjectId", event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">Pilih mata pelajaran</option>

                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.subjectName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* TOPIC */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Materi Pembelajaran *
                    </label>

                    <input
                      type="text"
                      required
                      value={studentForm.topic}
                      onChange={(event) =>
                        updateStudentForm("topic", event.target.value)
                      }
                      placeholder="Contoh: Pertambahan"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  {/* ACTIVITY */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Aktivitas Pembelajaran
                    </label>

                    <textarea
                      rows={3}
                      value={studentForm.activityNotes}
                      onChange={(event) =>
                        updateStudentForm("activityNotes", event.target.value)
                      }
                      placeholder="Aktivitas yang dilakukan siswa..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  {/* STRENGTHS */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Kelebihan / Perkembangan
                    </label>

                    <textarea
                      rows={3}
                      value={studentForm.strengths}
                      onChange={(event) =>
                        updateStudentForm("strengths", event.target.value)
                      }
                      placeholder="Hal yang sudah dikuasai siswa..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  {/* DIFFICULTIES */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Kesulitan
                    </label>

                    <textarea
                      rows={3}
                      value={studentForm.difficulties}
                      onChange={(event) =>
                        updateStudentForm("difficulties", event.target.value)
                      }
                      placeholder="Materi yang masih perlu dilatih..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  {/* FOLLOW UP */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Tindak Lanjut (Opsional)
                    </label>

                    <textarea
                      rows={3}
                      value={studentForm.followUp}
                      onChange={(event) =>
                        updateStudentForm("followUp", event.target.value)
                      }
                      placeholder="Rencana pembelajaran berikutnya..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  {/* SCORES */}
                  <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Nilai
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={studentForm.score}
                        onChange={(event) =>
                          updateStudentForm("score", event.target.value)
                        }
                        placeholder="Opsional"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Nilai Maksimal
                      </label>

                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={studentForm.maxScore}
                        onChange={(event) =>
                          updateStudentForm("maxScore", event.target.value)
                        }
                        placeholder="Opsional"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-medium text-amber-800">
                  Laporan belajar tidak diperlukan.
                </p>

                <p className="mt-1 text-sm text-amber-700">
                  Status kehadiran{" "}
                  <strong>
                    {
                      attendanceOptions.find(
                        (option) =>
                          option.value === studentForm.attendanceStatus,
                      )?.label
                    }
                  </strong>{" "}
                  tidak memerlukan laporan belajar.
                </p>
              </div>
            )}

            {/* SUBMIT */}
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-medium text-gray-900">
                  {selectedStudent.fullName}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {needsReport
                    ? "Kehadiran dan laporan belajar akan disimpan."
                    : "Kehadiran siswa akan disimpan tanpa laporan belajar."}
                </p>
              </div>

              <button
                type="submit"
                disabled={saving || (needsReport && subjects.length === 0)}
                className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Pencatatan Siswa"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
