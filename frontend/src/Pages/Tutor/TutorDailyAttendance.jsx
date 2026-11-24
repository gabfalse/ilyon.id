import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getMyTutorDailyAttendance,
  getMyTutorLearningSubjects,
  updateMyTutorAttendance,
} from "../../Services/TutorService";

// ==========================================
// HELPERS
// ==========================================

function getTodayDate() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

const attendanceOptions = [
  { value: "present", label: "Hadir" },
  { value: "late", label: "Terlambat" },
  { value: "sick", label: "Sakit" },
  { value: "permission", label: "Izin" },
  { value: "absent", label: "Alfa" },
];

const reportRequiredStatuses = ["present", "late"];

function isReportRequired(status) {
  return reportRequiredStatuses.includes(status);
}

function getAttendanceLabel(status) {
  return (
    attendanceOptions.find((item) => item.value === status)?.label || status
  );
}

function getAttendanceStyle(status) {
  const styles = {
    present: "bg-green-100 text-green-700",
    late: "bg-amber-100 text-amber-700",
    sick: "bg-blue-100 text-blue-700",
    permission: "bg-purple-100 text-purple-700",
    absent: "bg-red-100 text-red-700",
  };

  return styles[status] || "bg-gray-100 text-gray-700";
}

function formatTime(value) {
  if (!value) return "-";

  return String(value).slice(0, 5);
}

function createEditForm(item) {
  return {
    attendanceStatus: item.attendanceStatus || "present",
    attendanceNote: item.attendanceNote || "",

    subjectId: item.subjectId || "",
    materialId: item.materialId || "",
    topic: item.topic || "",
    activityNotes: item.activityNotes || "",
    strengths: item.strengths || "",
    difficulties: item.difficulties || "",
    followUp: item.followUp || "",

    score: item.score ?? "",
    maxScore: item.maxScore ?? "",
  };
}

// ==========================================
// COMPONENT
// ==========================================

export default function TutorDailyAttendance() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const [attendance, setAttendance] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ========================================
  // LOAD DATA
  // ========================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [attendanceResponse, subjectResponse] = await Promise.all([
        getMyTutorDailyAttendance(selectedDate),
        getMyTutorLearningSubjects(),
      ]);

      setAttendance(attendanceResponse.data || []);
      setSubjects(subjectResponse.data || []);
    } catch (err) {
      setError(err.message || "Gagal mengambil data kehadiran.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========================================
  // FILTER
  // ========================================

  const filteredAttendance = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return attendance;

    return attendance.filter((item) => {
      return (
        String(item.studentName || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item.studentCode || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item.branchName || "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [attendance, search]);

  const summary = useMemo(() => {
    return {
      total: attendance.length,
      present: attendance.filter((item) => item.attendanceStatus === "present")
        .length,
      late: attendance.filter((item) => item.attendanceStatus === "late")
        .length,
      sick: attendance.filter((item) => item.attendanceStatus === "sick")
        .length,
      permission: attendance.filter(
        (item) => item.attendanceStatus === "permission",
      ).length,
      absent: attendance.filter((item) => item.attendanceStatus === "absent")
        .length,
    };
  }, [attendance]);

  // ========================================
  // EDIT
  // ========================================

  function openEdit(item) {
    setSelectedItem(item);
    setEditForm(createEditForm(item));
    setError("");
    setSuccess("");
  }

  function closeEdit() {
    if (saving) return;

    setSelectedItem(null);
    setEditForm(null);
  }

  function updateField(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // ========================================
  // SAVE
  // ========================================

  async function handleSave(event) {
    event.preventDefault();

    if (!selectedItem || !editForm) return;

    setError("");
    setSuccess("");

    const needsReport = isReportRequired(editForm.attendanceStatus);

    try {
      if (needsReport && !editForm.subjectId) {
        throw new Error("Mata pelajaran wajib dipilih.");
      }

      if (needsReport && !editForm.topic.trim()) {
        throw new Error("Materi pembelajaran wajib diisi.");
      }

      if (editForm.score !== "" && Number(editForm.score) < 0) {
        throw new Error("Nilai tidak boleh kurang dari 0.");
      }

      if (editForm.maxScore !== "" && Number(editForm.maxScore) <= 0) {
        throw new Error("Nilai maksimal harus lebih dari 0.");
      }

      if (editForm.score !== "" && editForm.maxScore === "") {
        throw new Error("Isi nilai maksimal jika nilai diberikan.");
      }

      if (
        editForm.score !== "" &&
        editForm.maxScore !== "" &&
        Number(editForm.score) > Number(editForm.maxScore)
      ) {
        throw new Error("Nilai tidak boleh melebihi nilai maksimal.");
      }

      const wasReportRequired = isReportRequired(selectedItem.attendanceStatus);

      const willDeleteReport = wasReportRequired && !needsReport;

      if (willDeleteReport) {
        const confirmed = window.confirm(
          "Status kehadiran akan diubah menjadi " +
            getAttendanceLabel(editForm.attendanceStatus) +
            ".\n\nLaporan belajar siswa untuk sesi ini akan dihapus secara permanen. " +
            "Apakah Anda yakin ingin melanjutkan?",
        );

        if (!confirmed) return;
      }

      const payload = {
        attendanceStatus: editForm.attendanceStatus,
        attendanceNote: editForm.attendanceNote.trim() || null,
        report: needsReport
          ? {
              subjectId: editForm.subjectId,
              materialId: editForm.materialId || null,
              topic: editForm.topic.trim(),
              activityNotes: editForm.activityNotes.trim() || null,
              strengths: editForm.strengths.trim() || null,
              difficulties: editForm.difficulties.trim() || null,
              followUp: editForm.followUp.trim() || null,
              score: editForm.score !== "" ? Number(editForm.score) : null,
              maxScore:
                editForm.maxScore !== "" ? Number(editForm.maxScore) : null,
            }
          : null,
      };

      setSaving(true);

      const response = await updateMyTutorAttendance(
        selectedItem.attendanceId,
        payload,
      );

      setSuccess(response.message || "Kehadiran berhasil diperbarui.");

      setSelectedItem(null);
      setEditForm(null);

      await loadData();
    } catch (err) {
      setError(err.message || "Gagal memperbarui kehadiran.");
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading && attendance.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-gray-500">Memuat kehadiran harian...</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Kehadiran Harian</h1>

        <p className="mt-1 text-sm text-gray-500">
          Lihat dan perbarui kehadiran serta laporan belajar siswa berdasarkan
          tanggal.
        </p>
      </div>

      {/* NOTIFICATIONS */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-700">Tidak dapat melanjutkan</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-700">{success}</p>
        </div>
      )}

      {/* DATE FILTER */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Pilih Tanggal
            </label>

            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setSelectedItem(null);
                setEditForm(null);
                setSuccess("");
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Memuat..." : "↻ Muat Ulang"}
          </button>
        </div>
      </section>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total", value: summary.total, color: "text-gray-900" },
          { label: "Hadir", value: summary.present, color: "text-green-700" },
          { label: "Terlambat", value: summary.late, color: "text-amber-700" },
          { label: "Sakit", value: summary.sick, color: "text-blue-700" },
          {
            label: "Izin",
            value: summary.permission,
            color: "text-purple-700",
          },
          { label: "Alfa", value: summary.absent, color: "text-red-700" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className={`mt-2 text-2xl font-bold ${item.color}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* ATTENDANCE LIST */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="space-y-3 border-b border-gray-100 p-5 sm:flex sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h2 className="font-semibold text-gray-900">
              Daftar Kehadiran Siswa
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredAttendance.length} data ditemukan
            </p>
          </div>

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, kode, cabang..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 sm:max-w-xs"
          />
        </div>

        {attendance.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-gray-700">
              Belum ada data kehadiran.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Tidak ditemukan sesi pembelajaran pada tanggal yang dipilih.
            </p>
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Tidak ada siswa yang cocok dengan pencarian.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAttendance.map((item) => (
              <div
                key={item.attendanceId}
                className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {item.studentName}
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getAttendanceStyle(
                        item.attendanceStatus,
                      )}`}
                    >
                      {getAttendanceLabel(item.attendanceStatus)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-gray-500">
                    {item.studentCode} · {item.branchName || "Cabang -"}
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2">
                    <p>
                      <span className="text-gray-400">Kegiatan:</span>{" "}
                      {item.sessionType || "-"}
                    </p>

                    <p>
                      <span className="text-gray-400">Waktu:</span>{" "}
                      {formatTime(item.startTime)} - {formatTime(item.endTime)}
                    </p>

                    <p>
                      <span className="text-gray-400">Mata Pelajaran:</span>{" "}
                      {item.subjectName || "-"}
                    </p>

                    <p>
                      <span className="text-gray-400">Materi:</span>{" "}
                      {item.topic || "-"}
                    </p>
                  </div>

                  {item.attendanceNote && (
                    <p className="mt-2 text-sm text-gray-500">
                      Catatan kehadiran: {item.attendanceNote}
                    </p>
                  )}

                  {!item.canEdit && (
                    <p className="mt-2 text-xs text-amber-600">
                      Data ini hanya dapat dilihat karena bukan dibuat oleh akun
                      tutor ini.
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    disabled={!item.canEdit}
                    className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Edit Data
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* EDIT MODAL */}
      {selectedItem && editForm && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
          <div className="my-6 w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Edit Kehadiran & Laporan
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {selectedItem.studentName} · {selectedItem.studentCode}
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-lg px-3 py-1 text-xl text-gray-400 hover:bg-gray-100"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="max-h-[65vh] space-y-6 overflow-y-auto p-5">
                {/* ATTENDANCE */}
                <section>
                  <h3 className="mb-4 font-semibold text-gray-900">
                    Data Kehadiran
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Status Kehadiran *
                      </label>

                      <select
                        required
                        value={editForm.attendanceStatus}
                        onChange={(event) =>
                          updateField("attendanceStatus", event.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
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
                        value={editForm.attendanceNote}
                        onChange={(event) =>
                          updateField("attendanceNote", event.target.value)
                        }
                        placeholder="Opsional"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </section>

                {/* REPORT */}
                {isReportRequired(editForm.attendanceStatus) ? (
                  <section className="border-t border-gray-100 pt-5">
                    <h3 className="mb-1 font-semibold text-gray-900">
                      Laporan Belajar
                    </h3>

                    <p className="mb-4 text-xs text-gray-500">
                      Mata pelajaran dan materi wajib diisi.
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* SUBJECT */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Mata Pelajaran *
                        </label>

                        <select
                          required
                          value={editForm.subjectId}
                          onChange={(event) =>
                            updateField("subjectId", event.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
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
                          value={editForm.topic}
                          onChange={(event) =>
                            updateField("topic", event.target.value)
                          }
                          placeholder="Materi pembelajaran"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* ACTIVITY */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Aktivitas Pembelajaran
                        </label>

                        <textarea
                          rows={3}
                          value={editForm.activityNotes}
                          onChange={(event) =>
                            updateField("activityNotes", event.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* STRENGTHS */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Kelebihan / Perkembangan
                        </label>

                        <textarea
                          rows={3}
                          value={editForm.strengths}
                          onChange={(event) =>
                            updateField("strengths", event.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* DIFFICULTIES */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Kesulitan
                        </label>

                        <textarea
                          rows={3}
                          value={editForm.difficulties}
                          onChange={(event) =>
                            updateField("difficulties", event.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* FOLLOW UP */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Tindak Lanjut
                        </label>

                        <textarea
                          rows={3}
                          value={editForm.followUp}
                          onChange={(event) =>
                            updateField("followUp", event.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
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
                            value={editForm.score}
                            onChange={(event) =>
                              updateField("score", event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
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
                            value={editForm.maxScore}
                            onChange={(event) =>
                              updateField("maxScore", event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-800">
                      Laporan belajar tidak diperlukan.
                    </p>

                    <p className="mt-1 text-sm text-amber-700">
                      Jika perubahan disimpan, laporan belajar untuk sesi ini
                      akan dihapus.
                    </p>
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="flex flex-col-reverse justify-end gap-2 border-t border-gray-100 p-5 sm:flex-row">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    (isReportRequired(editForm.attendanceStatus) &&
                      subjects.length === 0)
                  }
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
