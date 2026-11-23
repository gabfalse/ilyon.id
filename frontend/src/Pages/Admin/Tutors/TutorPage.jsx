import { useEffect, useState } from "react";

import {
  getTutors,
  getTutorById,
  createTutor,
  updateTutor,
  updateTutorStatus,
} from "../../../Services/TutorService";

import { getBranches } from "../../../Services/BranchService";

import HrDocumentsSection from "../../../Components/Admin/HrDocumentsSection";

const statusOptions = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "on_leave", label: "Cuti" },
  { value: "resigned", label: "Mengundurkan diri" },
];

const statusStyle = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-red-50 text-red-600",
  on_leave: "bg-yellow-50 text-yellow-700",
  resigned: "bg-gray-100 text-gray-600",
};

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  tutorCode: "",
  educationLevel: "",
  educationMajor: "",
  experienceYears: "",
  expertise: "",
  employmentStatus: "active",
  joinDate: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  address: "",
  notes: "",
  branchAssignments: [
    {
      branchId: "",
      assignedFrom: "",
      assignedUntil: "",
      isPrimary: true,
    },
  ],
};

function formatStatus(status) {
  return statusOptions.find((item) => item.value === status)?.label || status;
}

export default function TutorPage() {
  const [tutors, setTutors] = useState([]);
  const [branches, setBranches] = useState([]);

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

  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTutorId, setEditingTutorId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  async function loadTutors(page = 1) {
    try {
      setLoading(true);
      setError("");

      const result = await getTutors({
        search,
        employmentStatus: statusFilter,
        branchId: branchFilter,
        page,
        limit: 10,
      });

      setTutors(result.data || []);

      setPagination(
        result.pagination || {
          page: 1,
          totalPages: 1,
          total: 0,
        },
      );
    } catch (err) {
      setError(err.message || "Gagal mengambil data tutor.");
    } finally {
      setLoading(false);
    }
  }

  async function loadBranches() {
    try {
      const result = await getBranches({
        limit: 100,
        page: 1,
        isActive: true,
      });

      setBranches(result.data || []);
    } catch (err) {
      setError(err.message || "Gagal mengambil data cabang.");
    }
  }

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadTutors(1);
  }, [search, statusFilter, branchFilter]);

  async function openTutorDetail(id) {
    try {
      setShowDetailModal(true);
      setDetailLoading(true);
      setDetailError("");
      setSelectedTutor(null);

      const result = await getTutorById(id);

      setSelectedTutor(result.data);
    } catch (err) {
      setDetailError(err.message || "Gagal mengambil detail tutor.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeTutorDetail() {
    setShowDetailModal(false);
    setSelectedTutor(null);
    setDetailError("");
  }

  async function handleTutorStatusChange(tutor) {
    const isCurrentlyActive = tutor.employmentStatus === "active";
    const nextIsActive = !isCurrentlyActive;

    const action = nextIsActive ? "mengaktifkan" : "menonaktifkan";

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin ${action} tutor ${tutor.fullName}?`,
    );

    if (!confirmed) return;

    try {
      setStatusUpdatingId(tutor.id);
      setError("");
      setSuccess("");

      const result = await updateTutorStatus(tutor.id, nextIsActive);

      setSuccess(
        result.message ||
          (nextIsActive
            ? "Tutor berhasil diaktifkan."
            : "Tutor berhasil dinonaktifkan."),
      );

      await loadTutors(pagination.page);

      if (selectedTutor?.id === tutor.id) {
        const detailResult = await getTutorById(tutor.id);
        setSelectedTutor(detailResult.data);
      }
    } catch (err) {
      setError(err.message || "Gagal mengubah status tutor.");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function openTutorEdit(id) {
    try {
      setError("");
      setSuccess("");
      setSaving(true);

      const result = await getTutorById(id);
      const tutor = result.data;

      if (!tutor) {
        throw new Error("Data tutor tidak ditemukan.");
      }

      setEditingTutorId(tutor.id);
      setIsEditMode(true);

      setForm({
        fullName: tutor.fullName || "",
        email: tutor.email || "",
        phone: tutor.phone || "",
        password: "",
        tutorCode: tutor.tutorCode || "",
        educationLevel: tutor.educationLevel || "",
        educationMajor: tutor.educationMajor || "",
        experienceYears: tutor.experienceYears ?? "",
        expertise: Array.isArray(tutor.expertise)
          ? tutor.expertise.join(", ")
          : "",
        employmentStatus: tutor.employmentStatus || "active",
        joinDate: tutor.joinDate ? String(tutor.joinDate).slice(0, 10) : "",
        emergencyContactName: tutor.emergencyContactName || "",
        emergencyContactPhone: tutor.emergencyContactPhone || "",
        address: tutor.address || "",
        notes: tutor.notes || "",
        branchAssignments: (tutor.branchAssignments || []).map(
          (assignment) => ({
            id: assignment.id,
            branchId: assignment.branchId,
            assignedFrom: assignment.assignedFrom
              ? String(assignment.assignedFrom).slice(0, 10)
              : "",
            assignedUntil: assignment.assignedUntil
              ? String(assignment.assignedUntil).slice(0, 10)
              : "",
            isPrimary: assignment.isPrimary,
          }),
        ),
      });

      setShowDetailModal(false);
      setSelectedTutor(null);
      setShowModal(true);
    } catch (err) {
      setError(err.message || "Gagal mengambil data tutor.");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateAssignment(index, field, value) {
    setForm((previous) => ({
      ...previous,
      branchAssignments: previous.branchAssignments.map((assignment, i) =>
        i === index ? { ...assignment, [field]: value } : assignment,
      ),
    }));
  }

  function addAssignment() {
    setForm((previous) => ({
      ...previous,
      branchAssignments: [
        ...previous.branchAssignments,
        {
          branchId: "",
          assignedFrom: "",
          assignedUntil: "",
          isPrimary: previous.branchAssignments.length === 0,
        },
      ],
    }));
  }

  function removeAssignment(index) {
    setForm((previous) => {
      const assignments = previous.branchAssignments.filter(
        (_, i) => i !== index,
      );

      if (
        previous.branchAssignments[index]?.isPrimary &&
        assignments.length > 0
      ) {
        assignments[0].isPrimary = true;
      }

      return {
        ...previous,
        branchAssignments: assignments,
      };
    });
  }

  function setPrimaryAssignment(index) {
    setForm((previous) => ({
      ...previous,
      branchAssignments: previous.branchAssignments.map((assignment, i) => ({
        ...assignment,
        isPrimary: i === index,
      })),
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setIsEditMode(false);
    setEditingTutorId(null);
    setShowModal(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.fullName.trim()) {
      setError("Nama tutor wajib diisi.");
      return;
    }

    if (!form.email.trim() && !form.phone.trim()) {
      setError("Email atau nomor telepon wajib diisi.");
      return;
    }

    if (!isEditMode && form.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    if (form.branchAssignments.length === 0) {
      setError("Tutor harus memiliki minimal satu penugasan cabang.");
      return;
    }

    if (form.branchAssignments.some((item) => !item.branchId)) {
      setError("Semua penugasan harus memiliki cabang.");
      return;
    }

    for (const assignment of form.branchAssignments) {
      if (
        assignment.assignedFrom &&
        assignment.assignedUntil &&
        assignment.assignedUntil < assignment.assignedFrom
      ) {
        setError("Tanggal akhir penugasan tidak boleh sebelum tanggal mulai.");
        return;
      }
    }

    const payload = {
      ...form,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      experienceYears:
        form.experienceYears === "" ? null : Number(form.experienceYears),
      expertise: form.expertise
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      branchAssignments: form.branchAssignments.map((item) => ({
        ...item,
        assignedFrom: item.assignedFrom || undefined,
        assignedUntil: item.assignedUntil || null,
      })),
    };

    if (isEditMode) {
      delete payload.password;
    }

    try {
      setSaving(true);

      if (isEditMode) {
        await updateTutor(editingTutorId, payload);
      } else {
        await createTutor(payload);
      }

      resetForm();

      setSuccess(
        isEditMode
          ? "Data tutor berhasil diperbarui."
          : "Tutor berhasil ditambahkan.",
      );

      await loadTutors(1);
    } catch (err) {
      setError(
        err.message ||
          (isEditMode
            ? "Gagal memperbarui data tutor."
            : "Gagal menambahkan tutor."),
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#70B8AE] focus:ring-2 focus:ring-[#70B8AE]/20";

  const activeCount = tutors.filter(
    (tutor) => tutor.employmentStatus === "active",
  ).length;

  const inactiveCount = tutors.filter(
    (tutor) => tutor.employmentStatus === "inactive",
  ).length;

  const otherCount = tutors.filter(
    (tutor) => !["active", "inactive"].includes(tutor.employmentStatus),
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-[#70B8AE]">Ilyon Academy</p>

          <h1 className="mt-1 text-2xl font-bold text-[#35485E]">
            Manajemen Tutor
          </h1>

          <p className="mt-1 text-sm text-[#87919D]">
            Kelola data tutor dan penugasan cabang Ilyon Academy.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setError("");
            setSuccess("");
            setShowModal(true);
          }}
          className="rounded-xl bg-[#529F93] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#438F83]"
        >
          + Tambah Tutor
        </button>
      </div>

      {/* Notifikasi */}
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

      {/* Statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Total Tutor</p>
          <p className="mt-3 text-2xl font-bold text-[#35485E]">
            {pagination.total}
          </p>
          <p className="mt-3 text-xs text-[#87919D]">Seluruh tutor terdaftar</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Tutor Aktif</p>
          <p className="mt-3 text-2xl font-bold text-green-600">
            {activeCount}
          </p>
          <p className="mt-3 text-xs text-[#87919D]">Aktif pada halaman ini</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Tutor Nonaktif</p>
          <p className="mt-3 text-2xl font-bold text-red-500">
            {inactiveCount}
          </p>
          <p className="mt-3 text-xs text-[#87919D]">
            Nonaktif pada halaman ini
          </p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Status Lainnya</p>
          <p className="mt-3 text-2xl font-bold text-blue-600">{otherCount}</p>
          <p className="mt-3 text-xs text-[#87919D]">
            Cuti atau mengundurkan diri pada halaman ini
          </p>
        </div>
      </div>

      {/* Daftar Tutor */}
      <section className="overflow-hidden rounded-2xl border border-[#E9ECEF] bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-bold text-[#35485E]">Daftar Tutor</h2>

          <p className="mt-1 text-sm text-[#87919D]">
            Data tutor seluruh cabang Ilyon Academy.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, kode, email, atau telepon..."
              className={inputClass}
            />

            <select
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
              className={inputClass}
            >
              <option value="">Semua Cabang Penugasan</option>

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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-4">Tutor</th>
                <th className="px-5 py-4">Kode Tutor</th>
                <th className="px-5 py-4">Kontak</th>
                <th className="px-5 py-4">Pendidikan</th>
                <th className="px-5 py-4">Cabang Aktif</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Memuat data tutor...
                  </td>
                </tr>
              ) : tutors.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Tidak ada data tutor.
                  </td>
                </tr>
              ) : (
                tutors.map((tutor) => (
                  <tr key={tutor.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {tutor.fullName}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {tutor.educationMajor || "Jurusan belum diisi"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {tutor.tutorCode || "-"}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-gray-600">{tutor.email || "-"}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {tutor.phone || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {tutor.educationLevel || "-"}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {tutor.activeBranchCount ?? 0} cabang
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                          statusStyle[tutor.employmentStatus] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {formatStatus(tutor.employmentStatus)}
                      </span>

                      {!tutor.accountIsActive && (
                        <p className="mt-1 text-xs text-red-500">
                          Akun login nonaktif
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openTutorDetail(tutor.id)}
                          className="rounded-lg border border-[#70B8AE] px-3 py-2 text-xs font-semibold text-[#529F93] transition hover:bg-[#70B8AE]/10"
                        >
                          Detail
                        </button>

                        <button
                          type="button"
                          onClick={() => openTutorEdit(tutor.id)}
                          disabled={saving}
                          className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
                        >
                          Edit
                        </button>

                        {["active", "inactive"].includes(
                          tutor.employmentStatus,
                        ) && (
                          <button
                            type="button"
                            onClick={() => handleTutorStatusChange(tutor)}
                            disabled={statusUpdatingId === tutor.id || saving}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              tutor.employmentStatus === "active"
                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                : "border-green-200 text-green-600 hover:bg-green-50"
                            }`}
                          >
                            {statusUpdatingId === tutor.id
                              ? "Memproses..."
                              : tutor.employmentStatus === "active"
                                ? "Nonaktifkan"
                                : "Aktifkan"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Total {pagination.total} tutor
          </p>

          <div className="flex items-center gap-3">
            <button
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadTutors(pagination.page - 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:opacity-40"
            >
              Sebelumnya
            </button>

            <span className="text-xs text-gray-500">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadTutors(pagination.page + 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      {/* Modal Tambah/Edit Tutor */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-4xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  {isEditMode ? "Edit Data Tutor" : "Tambah Tutor"}
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  {isEditMode
                    ? "Perbarui informasi dan penugasan tutor."
                    : "Buat akun login dan profil tutor baru."}
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-7 p-5">
                {/* Akun */}
                <section>
                  <h3 className="mb-4 font-semibold text-[#35485E]">
                    1. Informasi Akun
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Nama Lengkap *
                      </label>
                      <input
                        required
                        minLength={2}
                        maxLength={180}
                        value={form.fullName}
                        onChange={(e) =>
                          updateField("fullName", e.target.value)
                        }
                        className={inputClass}
                        placeholder="Nama lengkap tutor"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Kode Tutor
                      </label>
                      <input
                        maxLength={50}
                        value={form.tutorCode}
                        onChange={(e) =>
                          updateField("tutorCode", e.target.value)
                        }
                        className={inputClass}
                        placeholder="Contoh: TTR001"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Email
                      </label>
                      <input
                        type="email"
                        maxLength={180}
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        className={inputClass}
                        placeholder="nama@email.com"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Nomor Telepon
                      </label>
                      <input
                        type="tel"
                        maxLength={40}
                        value={form.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        className={inputClass}
                        placeholder="08xxxxxxxxxx"
                      />
                    </div>

                    {!isEditMode && (
                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium">
                          Password Awal *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={8}
                          maxLength={128}
                          value={form.password}
                          onChange={(e) =>
                            updateField("password", e.target.value)
                          }
                          className={inputClass}
                          placeholder="Minimal 8 karakter"
                          autoComplete="new-password"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          Berikan password awal ini kepada tutor secara aman.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Profil */}
                <section>
                  <h3 className="mb-4 font-semibold text-[#35485E]">
                    2. Profil dan Pendidikan
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Jenjang Pendidikan
                      </label>
                      <input
                        maxLength={100}
                        value={form.educationLevel}
                        onChange={(e) =>
                          updateField("educationLevel", e.target.value)
                        }
                        className={inputClass}
                        placeholder="Contoh: S1"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Jurusan
                      </label>
                      <input
                        maxLength={180}
                        value={form.educationMajor}
                        onChange={(e) =>
                          updateField("educationMajor", e.target.value)
                        }
                        className={inputClass}
                        placeholder="Contoh: Pendidikan Matematika"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Pengalaman (tahun)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.experienceYears}
                        onChange={(e) =>
                          updateField("experienceYears", e.target.value)
                        }
                        className={inputClass}
                        placeholder="Contoh: 2"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Keahlian
                      </label>
                      <input
                        value={form.expertise}
                        onChange={(e) =>
                          updateField("expertise", e.target.value)
                        }
                        className={inputClass}
                        placeholder="Matematika, Bahasa Inggris, IPA"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Pisahkan setiap keahlian dengan koma.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Status Pekerjaan
                      </label>
                      <select
                        value={form.employmentStatus}
                        onChange={(e) =>
                          updateField("employmentStatus", e.target.value)
                        }
                        className={inputClass}
                      >
                        {statusOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Tanggal Bergabung
                      </label>
                      <input
                        type="date"
                        value={form.joinDate}
                        onChange={(e) =>
                          updateField("joinDate", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                </section>

                {/* Cabang */}
                <section>
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-semibold text-[#35485E]">
                        3. Penugasan Cabang *
                      </h3>
                      <p className="mt-1 text-xs text-gray-400">
                        Pilih minimal satu cabang dan tentukan satu cabang
                        utama.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addAssignment}
                      className="rounded-lg border border-[#70B8AE] px-4 py-2 text-sm font-semibold text-[#529F93] hover:bg-[#70B8AE]/10"
                    >
                      + Tambah Cabang
                    </button>
                  </div>

                  <div className="space-y-4">
                    {form.branchAssignments.map((assignment, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-gray-200 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#35485E]">
                            Penugasan {index + 1}
                          </p>

                          {form.branchAssignments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAssignment(index)}
                              className="text-xs font-medium text-red-500"
                            >
                              Hapus
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium">
                              Cabang *
                            </label>

                            <select
                              required
                              value={assignment.branchId}
                              onChange={(e) =>
                                updateAssignment(
                                  index,
                                  "branchId",
                                  e.target.value,
                                )
                              }
                              className={inputClass}
                            >
                              <option value="">Pilih cabang</option>

                              {branches.map((branch) => (
                                <option
                                  key={branch.id}
                                  value={branch.id}
                                  disabled={form.branchAssignments.some(
                                    (item, i) =>
                                      i !== index &&
                                      item.branchId === branch.id,
                                  )}
                                >
                                  {branch.branchName}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-medium">
                              Mulai Penugasan
                            </label>
                            <input
                              type="date"
                              value={assignment.assignedFrom}
                              onChange={(e) =>
                                updateAssignment(
                                  index,
                                  "assignedFrom",
                                  e.target.value,
                                )
                              }
                              className={inputClass}
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-medium">
                              Akhir Penugasan
                            </label>
                            <input
                              type="date"
                              min={assignment.assignedFrom || undefined}
                              value={assignment.assignedUntil}
                              onChange={(e) =>
                                updateAssignment(
                                  index,
                                  "assignedUntil",
                                  e.target.value,
                                )
                              }
                              className={inputClass}
                            />
                          </div>
                        </div>

                        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="primaryBranch"
                            checked={assignment.isPrimary}
                            onChange={() => setPrimaryAssignment(index)}
                            className="accent-[#529F93]"
                          />
                          <span className="font-medium text-[#35485E]">
                            Jadikan cabang utama
                          </span>
                        </label>
                      </div>
                    ))}

                    {branches.length === 0 && (
                      <p className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-700">
                        Belum ada cabang aktif. Tambahkan atau aktifkan cabang
                        terlebih dahulu.
                      </p>
                    )}
                  </div>
                </section>

                {/* Kontak Darurat */}
                <section>
                  <h3 className="mb-4 font-semibold text-[#35485E]">
                    4. Kontak Darurat dan Informasi Tambahan
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Nama Kontak Darurat
                      </label>
                      <input
                        maxLength={180}
                        value={form.emergencyContactName}
                        onChange={(e) =>
                          updateField("emergencyContactName", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Telepon Kontak Darurat
                      </label>
                      <input
                        maxLength={40}
                        value={form.emergencyContactPhone}
                        onChange={(e) =>
                          updateField("emergencyContactPhone", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium">
                        Alamat
                      </label>
                      <textarea
                        rows={3}
                        maxLength={5000}
                        value={form.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium">
                        Catatan
                      </label>
                      <textarea
                        rows={3}
                        maxLength={5000}
                        value={form.notes}
                        onChange={(e) => updateField("notes", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="flex flex-col-reverse justify-end gap-3 border-t border-gray-100 p-5 sm:flex-row">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving || branches.length === 0}
                  className="rounded-xl bg-[#529F93] px-6 py-3 text-sm font-semibold text-white hover:bg-[#438F83] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : isEditMode
                      ? "Simpan Perubahan"
                      : "Simpan Tutor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Tutor */}
      {showDetailModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-4xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  Detail Tutor
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Informasi lengkap profil dan penugasan tutor.
                </p>
              </div>

              <button
                type="button"
                onClick={closeTutorDetail}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="p-10 text-center text-gray-400">
                Memuat detail tutor...
              </div>
            ) : detailError ? (
              <div className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {detailError}
              </div>
            ) : selectedTutor ? (
              <div className="space-y-6 p-5">
                {/* Identitas */}
                <section>
                  <h3 className="mb-3 font-semibold text-[#35485E]">
                    1. Informasi Akun
                  </h3>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <h4 className="text-lg font-bold text-[#35485E]">
                      {selectedTutor.fullName}
                    </h4>

                    <p className="mt-1 text-sm text-gray-500">
                      Kode Tutor: {selectedTutor.tutorCode || "-"}
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-gray-400">Email</p>
                        <p className="mt-1 text-sm text-gray-700">
                          {selectedTutor.email || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">Nomor Telepon</p>
                        <p className="mt-1 text-sm text-gray-700">
                          {selectedTutor.phone || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">
                          Status Pekerjaan
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-700">
                          {formatStatus(selectedTutor.employmentStatus)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">
                          Status Akun Login
                        </p>
                        <p
                          className={`mt-1 text-sm font-semibold ${
                            selectedTutor.accountIsActive
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        >
                          {selectedTutor.accountIsActive ? "Aktif" : "Nonaktif"}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Pendidikan */}
                <section>
                  <h3 className="mb-3 font-semibold text-[#35485E]">
                    2. Pendidikan dan Pengalaman
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-400">
                        Jenjang Pendidikan
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {selectedTutor.educationLevel || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Jurusan</p>
                      <p className="mt-1 text-sm text-gray-700">
                        {selectedTutor.educationMajor || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Pengalaman</p>
                      <p className="mt-1 text-sm text-gray-700">
                        {selectedTutor.experienceYears != null
                          ? `${selectedTutor.experienceYears} tahun`
                          : "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Tanggal Bergabung</p>
                      <p className="mt-1 text-sm text-gray-700">
                        {selectedTutor.joinDate
                          ? new Date(selectedTutor.joinDate).toLocaleDateString(
                              "id-ID",
                            )
                          : "-"}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-400">Keahlian</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedTutor.expertise?.length > 0 ? (
                          selectedTutor.expertise.map((item, index) => (
                            <span
                              key={index}
                              className="rounded-full bg-[#70B8AE]/10 px-3 py-1 text-xs font-medium text-[#438F83]"
                            >
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Cabang */}
                <section>
                  <h3 className="mb-3 font-semibold text-[#35485E]">
                    3. Penugasan Cabang
                  </h3>

                  <div className="space-y-3">
                    {selectedTutor.branchAssignments?.length > 0 ? (
                      selectedTutor.branchAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="rounded-xl border border-gray-200 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-[#35485E]">
                                {assignment.branchName}
                              </p>
                              <p className="mt-1 text-xs text-gray-400">
                                {assignment.branchCode}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {assignment.isPrimary && (
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                                  Cabang Utama
                                </span>
                              )}

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  assignment.isActive
                                    ? "bg-green-50 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {assignment.isActive ? "Aktif" : "Tidak Aktif"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-gray-400">
                                Mulai Penugasan
                              </p>
                              <p className="mt-1 text-sm text-gray-700">
                                {assignment.assignedFrom
                                  ? new Date(
                                      assignment.assignedFrom,
                                    ).toLocaleDateString("id-ID")
                                  : "-"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-400">
                                Akhir Penugasan
                              </p>
                              <p className="mt-1 text-sm text-gray-700">
                                {assignment.assignedUntil
                                  ? new Date(
                                      assignment.assignedUntil,
                                    ).toLocaleDateString("id-ID")
                                  : "Tidak ditentukan"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        Belum ada penugasan cabang.
                      </p>
                    )}
                  </div>
                </section>

                {/* Kontak Darurat */}
                <section>
                  <h3 className="mb-3 font-semibold text-[#35485E]">
                    4. Kontak Darurat
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-400">Nama</p>
                      <p className="mt-1 text-sm text-gray-700">
                        {selectedTutor.emergencyContactName || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Nomor Telepon</p>
                      <p className="mt-1 text-sm text-gray-700">
                        {selectedTutor.emergencyContactPhone || "-"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Informasi Tambahan */}
                <section>
                  <h3 className="mb-3 font-semibold text-[#35485E]">
                    5. Informasi Tambahan
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-400">Alamat</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
                        {selectedTutor.address || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Catatan</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
                        {selectedTutor.notes || "-"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Dokumen HR */}
                <HrDocumentsSection
                  hrPersonProfileId={selectedTutor.hrPersonProfileId}
                  personLabel="Tutor"
                />
              </div>
            ) : null}

            <div className="flex justify-end border-t border-gray-100 p-5">
              <button
                type="button"
                onClick={closeTutorDetail}
                className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#438F83]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
