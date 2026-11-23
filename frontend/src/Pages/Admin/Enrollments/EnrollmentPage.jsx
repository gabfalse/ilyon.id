import { useEffect, useState } from "react";

import {
  getEnrollments,
  createEnrollment,
  updateEnrollment,
  updateEnrollmentStatus,
} from "../../../Services/EnrollmentService";

import { getStudents } from "../../../Services/StudentService";
import { getBranches } from "../../../Services/BranchService";

import {
  getPrograms,
  getActiveProgramOfferings,
} from "../../../Services/ProgramService";

// ==========================================
// INITIAL FORM
// ==========================================

const initialForm = {
  studentId: "",
  programId: "",
  offeringId: "",
  startDate: "",
  endDate: "",
  status: "active",
  agreedPrice: "",
  billingPeriod: "",
  notes: "",
};

// ==========================================
// STATUS OPTIONS
// ==========================================

const statusOptions = [
  { value: "pending", label: "Menunggu" },
  { value: "active", label: "Aktif" },
  { value: "paused", label: "Ditangguhkan" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

const statusStyle = {
  pending: "bg-yellow-50 text-yellow-700",
  active: "bg-green-50 text-green-700",
  paused: "bg-orange-50 text-orange-700",
  completed: "bg-blue-50 text-blue-700",
  cancelled: "bg-red-50 text-red-600",
};

const billingOptions = [
  { value: "per_session", label: "Per Sesi" },
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Bulanan" },
  { value: "package", label: "Paket" },
  { value: "custom", label: "Kustom" },
];

// ==========================================
// HELPER
// ==========================================

function formatStatus(status) {
  return statusOptions.find((item) => item.value === status)?.label || status;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

// ==========================================
// COMPONENT
// ==========================================

export default function EnrollmentPage() {
  // ----------------------------------------
  // ENROLLMENT STATE
  // ----------------------------------------

  const [enrollments, setEnrollments] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ----------------------------------------
  // FORM STATE
  // ----------------------------------------

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");

  // ----------------------------------------
  // FORM OPTIONS
  // ----------------------------------------

  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [offerings, setOfferings] = useState([]);

  const [optionsLoading, setOptionsLoading] = useState(true);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState("");

  // ==========================================
  // LOAD ENROLLMENTS
  // ==========================================

  async function loadEnrollments(page = 1) {
    try {
      setLoading(true);
      setError("");

      const result = await getEnrollments({
        search,
        status: statusFilter,
        branchId: branchFilter,
        page,
        limit: 10,
      });

      setEnrollments(result.data || []);

      setPagination(
        result.pagination || {
          page: 1,
          totalPages: 1,
          total: 0,
        },
      );
    } catch (err) {
      setError(err.message || "Gagal mengambil data Enrollment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEnrollments(1);
  }, [search, statusFilter, branchFilter]);

  // ==========================================
  // LOAD FORM OPTIONS
  // ==========================================

  async function loadFormOptions() {
    try {
      setOptionsLoading(true);
      setOptionsError("");

      const [studentResult, branchResult, programResult] = await Promise.all([
        getStudents({
          page: 1,
          limit: 100,
        }),

        getBranches({
          page: 1,
          limit: 100,
        }),

        getPrograms({
          isActive: true,
          page: 1,
          limit: 100,
        }),
      ]);

      setStudents(studentResult.data || []);
      setBranches(branchResult.data || []);
      setPrograms(programResult.data || []);
    } catch (err) {
      setOptionsError(
        err.message || "Gagal mengambil pilihan data Enrollment.",
      );
    } finally {
      setOptionsLoading(false);
    }
  }

  useEffect(() => {
    loadFormOptions();
  }, []);

  // ==========================================
  // LOAD OFFERINGS BY PROGRAM
  // ==========================================

  useEffect(() => {
    if (!modalOpen || editingId || !form.programId) {
      setOfferings([]);
      return;
    }

    let cancelled = false;

    async function loadOfferings() {
      try {
        setOfferingsLoading(true);
        setFormError("");

        const result = await getActiveProgramOfferings(form.programId);

        if (!cancelled) {
          setOfferings(result.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setOfferings([]);
          setFormError(err.message || "Gagal mengambil Offering Program.");
        }
      } finally {
        if (!cancelled) {
          setOfferingsLoading(false);
        }
      }
    }

    loadOfferings();

    return () => {
      cancelled = true;
    };
  }, [modalOpen, editingId, form.programId]);

  // ==========================================
  // CREATE FORM
  // ==========================================

  function openCreateModal() {
    setEditingId(null);
    setSelectedEnrollment(null);

    setForm(initialForm);

    setFormError("");
    setOptionsError("");

    setModalOpen(true);
  }

  // ==========================================
  // EDIT FORM
  // ==========================================

  function openEditModal(enrollment) {
    setEditingId(enrollment.id);
    setSelectedEnrollment(enrollment);

    setForm({
      studentId: enrollment.studentId || "",
      programId: enrollment.programId || "",
      offeringId: enrollment.offeringId || "",

      startDate: enrollment.startDate || "",
      endDate: enrollment.endDate || "",

      status: enrollment.status || "active",

      agreedPrice: String(enrollment.agreedPrice ?? 0),

      billingPeriod: enrollment.billingPeriod || "",

      notes: enrollment.notes || "",
    });

    setFormError("");
    setOptionsError("");

    setModalOpen(true);
  }

  // ==========================================
  // HANDLE FORM CHANGE
  // ==========================================

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => {
      if (name === "programId") {
        return {
          ...previous,
          programId: value,
          offeringId: "",
          agreedPrice: "",
          billingPeriod: "",
        };
      }

      if (name === "offeringId") {
        return {
          ...previous,
          offeringId: value,
          agreedPrice: "",
          billingPeriod: "",
        };
      }

      return {
        ...previous,
        [name]: value,
      };
    });

    setFormError("");
  }

  // ==========================================
  // SELECTED FORM DATA
  // ==========================================

  const selectedStudent = students.find(
    (student) => student.id === form.studentId,
  );

  const selectedOffering = offerings.find(
    (offering) => offering.id === form.offeringId,
  );

  // ==========================================
  // VALIDATE FORM
  // ==========================================

  function validateForm(payload) {
    if (
      payload.endDate &&
      payload.startDate &&
      payload.endDate < payload.startDate
    ) {
      throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
    }

    if (
      payload.agreedPrice !== undefined &&
      (!Number.isFinite(payload.agreedPrice) || payload.agreedPrice < 0)
    ) {
      throw new Error("Harga kesepakatan tidak valid.");
    }

    if (
      payload.billingPeriod &&
      !billingOptions.some((item) => item.value === payload.billingPeriod)
    ) {
      throw new Error("Periode tagihan tidak valid.");
    }
  }

  // ==========================================
  // SAVE ENROLLMENT
  // ==========================================

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError("");
      setError("");
      setSuccess("");

      const commonPayload = {
        ...(form.startDate ? { startDate: form.startDate } : {}),

        endDate: form.endDate || null,

        ...(form.agreedPrice !== ""
          ? { agreedPrice: Number(form.agreedPrice) }
          : {}),

        billingPeriod: form.billingPeriod || null,

        notes: form.notes.trim() || null,
      };

      if (editingId) {
        validateForm(commonPayload);

        await updateEnrollment(editingId, commonPayload);

        setSuccess("Enrollment berhasil diperbarui.");
      } else {
        const payload = {
          studentId: form.studentId,
          programId: form.programId,
          offeringId: form.offeringId,

          ...commonPayload,

          status: form.status,
        };

        if (!payload.studentId) {
          throw new Error("Pilih siswa terlebih dahulu.");
        }

        if (!payload.programId) {
          throw new Error("Pilih program terlebih dahulu.");
        }

        if (!payload.offeringId) {
          throw new Error("Pilih Offering terlebih dahulu.");
        }

        validateForm(payload);

        await createEnrollment(payload);

        setSuccess("Enrollment berhasil dibuat.");
      }

      setModalOpen(false);
      setEditingId(null);
      setSelectedEnrollment(null);
      setForm(initialForm);

      await loadEnrollments(editingId ? pagination.page : 1);
    } catch (err) {
      setFormError(err.message || "Gagal menyimpan Enrollment.");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // UPDATE STATUS
  // ==========================================

  async function handleStatusChange(enrollment, newStatus) {
    if (newStatus === enrollment.status) return;

    const confirmed = window.confirm(
      `Yakin ingin mengubah status Enrollment ${enrollment.studentName} menjadi ${formatStatus(newStatus)}?`,
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await updateEnrollmentStatus(enrollment.id, newStatus);

      setSuccess("Status Enrollment berhasil diperbarui.");

      await loadEnrollments(pagination.page);
    } catch (err) {
      setError(err.message || "Gagal mengubah status Enrollment.");
    }
  }

  // ==========================================
  // CLOSE FORM
  // ==========================================

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setSelectedEnrollment(null);
    setForm(initialForm);
    setFormError("");
  }

  // ==========================================
  // STYLE
  // ==========================================

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#70B8AE] focus:ring-2 focus:ring-[#70B8AE]/20";

  const activeCount = enrollments.filter(
    (item) => item.status === "active",
  ).length;

  const pendingCount = enrollments.filter(
    (item) => item.status === "pending",
  ).length;

  const otherCount = enrollments.filter(
    (item) => !["active", "pending"].includes(item.status),
  ).length;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-[#70B8AE]">Ilyon Academy</p>

          <h1 className="mt-1 text-2xl font-bold text-[#35485E]">
            Manajemen Enrollment
          </h1>

          <p className="mt-1 text-sm text-[#87919D]">
            Kelola pendaftaran siswa ke program pembelajaran.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-xl bg-[#529F93] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#438C81]"
        >
          + Tambah Enrollment
        </button>
      </div>

      {/* NOTIFIKASI */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* STATISTIK */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Total Enrollment</p>

          <p className="mt-3 text-2xl font-bold text-[#35485E]">
            {pagination.total}
          </p>

          <p className="mt-3 text-xs text-[#87919D]">
            Seluruh data pendaftaran
          </p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Enrollment Aktif</p>

          <p className="mt-3 text-2xl font-bold text-green-600">
            {activeCount}
          </p>

          <p className="mt-3 text-xs text-[#87919D]">Pada halaman ini</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Menunggu</p>

          <p className="mt-3 text-2xl font-bold text-yellow-600">
            {pendingCount}
          </p>

          <p className="mt-3 text-xs text-[#87919D]">Pada halaman ini</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Status Lainnya</p>

          <p className="mt-3 text-2xl font-bold text-blue-600">{otherCount}</p>

          <p className="mt-3 text-xs text-[#87919D]">Pada halaman ini</p>
        </div>
      </div>

      {/* DAFTAR ENROLLMENT */}

      <section className="overflow-hidden rounded-2xl border border-[#E9ECEF] bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <div>
            <h2 className="font-bold text-[#35485E]">Daftar Enrollment</h2>

            <p className="mt-1 text-sm text-[#87919D]">
              Semua pendaftaran siswa berdasarkan Program dan Offering.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari siswa, Program, Offering..."
              className={inputClass}
            />

            <select
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
              className={inputClass}
            >
              <option value="">Semua Cabang</option>

              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branchName}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
            >
              <option value="">Semua Status</option>

              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TABEL */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-4">Siswa</th>
                <th className="px-5 py-4">Cabang</th>
                <th className="px-5 py-4">Program</th>
                <th className="px-5 py-4">Offering</th>
                <th className="px-5 py-4">Mulai</th>
                <th className="px-5 py-4">Harga</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Memuat data Enrollment...
                  </td>
                </tr>
              ) : enrollments.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Belum ada data Enrollment.
                  </td>
                </tr>
              ) : (
                enrollments.map((enrollment) => (
                  <tr
                    key={enrollment.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {enrollment.studentName}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {enrollment.studentCode}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {enrollment.branchName || "-"}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {enrollment.programName}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {enrollment.programCode}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {enrollment.offeringName}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {enrollment.offeringCode}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatDate(enrollment.startDate)}
                    </td>

                    <td className="px-5 py-4 font-semibold text-[#35485E]">
                      {formatCurrency(enrollment.agreedPrice)}
                    </td>

                    <td className="px-5 py-4">
                      <select
                        value={enrollment.status}
                        onChange={(event) =>
                          handleStatusChange(enrollment, event.target.value)
                        }
                        className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ${
                          statusStyle[enrollment.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {statusOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => openEditModal(enrollment)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#35485E] transition hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Total {pagination.total} Enrollment
          </p>

          <div className="flex items-center gap-3">
            <button
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadEnrollments(pagination.page - 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:opacity-40"
            >
              Sebelumnya
            </button>

            <span className="text-xs text-gray-500">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadEnrollments(pagination.page + 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      {/* ==========================================
          MODAL FORM ENROLLMENT
      ========================================== */}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6">
            {/* HEADER */}

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  {editingId ? "Edit Enrollment" : "Tambah Enrollment"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editingId
                    ? "Perbarui informasi pendaftaran siswa."
                    : "Daftarkan siswa ke Program dan Offering."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* ERROR */}

            {(formError || optionsError) && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {formError || optionsError}
              </div>
            )}

            {optionsLoading ? (
              <div className="py-12 text-center text-sm text-gray-400">
                Memuat pilihan Student, Branch, dan Program...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* DATA PENDAFTARAN */}

                <div>
                  <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                    Data Pendaftaran
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* STUDENT */}

                    <label className="space-y-1 text-sm sm:col-span-2">
                      <span className="font-semibold">Siswa *</span>

                      {editingId ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                          <p className="font-semibold text-[#35485E]">
                            {selectedEnrollment?.studentName}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {selectedEnrollment?.studentCode}
                          </p>
                        </div>
                      ) : (
                        <select
                          name="studentId"
                          value={form.studentId}
                          onChange={handleChange}
                          required
                          className={inputClass}
                        >
                          <option value="">Pilih siswa</option>

                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.studentCode} - {student.fullName}
                              {student.primaryBranchName
                                ? ` (${student.primaryBranchName})`
                                : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>

                    {/* BRANCH OTOMATIS */}

                    <div className="space-y-1 text-sm sm:col-span-2">
                      <span className="font-semibold">Cabang Asal</span>

                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                        {editingId
                          ? selectedEnrollment?.branchName || "-"
                          : selectedStudent?.primaryBranchName ||
                            "Cabang mengikuti data utama siswa."}
                      </div>

                      <p className="text-xs text-gray-400">
                        Cabang ditentukan otomatis dari data siswa dan tidak
                        dapat diubah dari formulir Enrollment.
                      </p>
                    </div>

                    {/* PROGRAM */}

                    <label className="space-y-1 text-sm">
                      <span className="font-semibold">Program *</span>

                      {editingId ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                          {selectedEnrollment?.programName}
                        </div>
                      ) : (
                        <select
                          name="programId"
                          value={form.programId}
                          onChange={handleChange}
                          required
                          className={inputClass}
                        >
                          <option value="">Pilih Program</option>

                          {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                              {program.programCode} - {program.programName}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>

                    {/* OFFERING */}

                    <label className="space-y-1 text-sm">
                      <span className="font-semibold">Offering *</span>

                      {editingId ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                          {selectedEnrollment?.offeringName}
                        </div>
                      ) : (
                        <select
                          name="offeringId"
                          value={form.offeringId}
                          onChange={handleChange}
                          required
                          disabled={!form.programId || offeringsLoading}
                          className={inputClass}
                        >
                          <option value="">
                            {!form.programId
                              ? "Pilih Program terlebih dahulu"
                              : offeringsLoading
                                ? "Memuat Offering..."
                                : offerings.length === 0
                                  ? "Tidak ada Offering aktif"
                                  : "Pilih Offering"}
                          </option>

                          {offerings.map((offering) => (
                            <option key={offering.id} value={offering.id}>
                              {offering.offeringCode} - {offering.offeringName}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>

                    {!editingId && selectedOffering && (
                      <div className="rounded-xl border border-[#D9ECE8] bg-[#F3FAF8] p-3 text-sm sm:col-span-2">
                        <p className="font-semibold text-[#35485E]">
                          Informasi Offering
                        </p>

                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <p className="text-gray-600">
                            Harga dasar:{" "}
                            <strong>
                              {formatCurrency(selectedOffering.price)}
                            </strong>
                          </p>

                          <p className="text-gray-600">
                            Periode:{" "}
                            <strong>
                              {billingOptions.find(
                                (item) =>
                                  item.value === selectedOffering.billingPeriod,
                              )?.label || selectedOffering.billingPeriod}
                            </strong>
                          </p>
                        </div>

                        <p className="mt-2 text-xs text-gray-500">
                          Harga dan periode di bawah dapat disesuaikan sesuai
                          kesepakatan Enrollment.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* INFORMASI KONTRAK PENDAFTARAN */}

                <div className="border-t border-gray-100 pt-5">
                  <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                    Informasi Enrollment
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="font-semibold">Tanggal Mulai</span>

                      <input
                        type="date"
                        name="startDate"
                        value={form.startDate}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="font-semibold">Tanggal Selesai</span>

                      <input
                        type="date"
                        name="endDate"
                        value={form.endDate}
                        onChange={handleChange}
                        min={form.startDate || undefined}
                        className={inputClass}
                      />
                    </label>

                    {!editingId && (
                      <label className="space-y-1 text-sm">
                        <span className="font-semibold">Status Awal</span>

                        <select
                          name="status"
                          value={form.status}
                          onChange={handleChange}
                          className={inputClass}
                        >
                          {statusOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <label className="space-y-1 text-sm">
                      <span className="font-semibold">
                        Harga Kesepakatan (Rp)
                      </span>

                      <input
                        type="number"
                        name="agreedPrice"
                        value={form.agreedPrice}
                        onChange={handleChange}
                        min="0"
                        step="1"
                        placeholder="Kosongkan untuk mengikuti harga Offering"
                        className={inputClass}
                      />

                      {!editingId && (
                        <p className="text-xs text-gray-400">
                          Kosongkan untuk menggunakan harga dasar Offering.
                        </p>
                      )}
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="font-semibold">Periode Tagihan</span>

                      <select
                        name="billingPeriod"
                        value={form.billingPeriod}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="">Ikuti periode Offering</option>

                        {billingOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-sm sm:col-span-2">
                      <span className="font-semibold">Catatan</span>

                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        rows="3"
                        className={inputClass}
                        placeholder="Catatan tambahan Enrollment..."
                      />
                    </label>
                  </div>
                </div>

                {/* BUTTONS */}

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      (!editingId &&
                        (!form.studentId ||
                          !form.programId ||
                          !form.offeringId))
                    }
                    className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#438C81] disabled:opacity-50"
                  >
                    {saving
                      ? "Menyimpan..."
                      : editingId
                        ? "Simpan Perubahan"
                        : "Simpan Enrollment"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
