import { useEffect, useState } from "react";

import {
  getParents,
  getParentById,
  getEligibleParentAccounts,
  createParent,
  updateParent,
  linkParentStudent,
  unlinkParentStudent,
  restoreParentToUser,
} from "../../../Services/ParentService";

import { useAuth } from "../../../Contexts/AuthContext";
import { getStudents } from "../../../Services/StudentService";

const initialForm = {
  fullName: "",
  relationshipLabel: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  notes: "",
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#35485E] outline-none transition focus:border-[#529F93] focus:ring-2 focus:ring-[#529F93]/10 disabled:cursor-not-allowed disabled:bg-gray-50";

function formatAccountStatus(isActive) {
  if (isActive === true) return "Aktif";
  if (isActive === false) return "Nonaktif";
  return "Belum terhubung";
}

function accountStatusStyle(isActive) {
  if (isActive === true) return "bg-green-50 text-green-700";
  if (isActive === false) return "bg-red-50 text-red-600";
  return "bg-gray-100 text-gray-600";
}

export default function ParentPage() {
  const { activeBranchId, assignedBranches = [] } = useAuth();

  const requiresBranchSelection = assignedBranches.length > 1;
  const canManageParents = !requiresBranchSelection || Boolean(activeBranchId);

  const [parents, setParents] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [selectedParent, setSelectedParent] = useState(null);

  const [form, setForm] = useState(initialForm);

  const [eligibleAccounts, setEligibleAccounts] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loadingEligibleAccounts, setLoadingEligibleAccounts] = useState(false);

  const [restoringParentId, setRestoringParentId] = useState(null);

  // ==========================================
  // HUBUNGKAN ORANG TUA DENGAN SISWA
  // ==========================================

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);
  const [unlinkingStudentId, setUnlinkingStudentId] = useState(null);

  const [linkForm, setLinkForm] = useState({
    studentId: "",
    relationshipLabel: "",
    isPrimaryContact: false,
    canViewProgress: false,
    canReceiveNotifications: false,
  });

  // ==========================================
  // GET: DAFTAR ORANG TUA
  // ==========================================

  async function loadParents(page = 1) {
    try {
      setLoading(true);
      setError("");

      const result = await getParents({
        search,
        page,
        limit: 10,
      });

      setParents(result.data || []);

      setPagination(
        result.pagination || {
          page: 1,
          totalPages: 1,
          total: 0,
        },
      );
    } catch (err) {
      setError(err.message || "Gagal mengambil data orang tua.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canManageParents) {
      setParents([]);
      setPagination({
        page: 1,
        totalPages: 1,
        total: 0,
      });
      setLoading(false);
      return;
    }

    loadParents(1);
  }, [search, activeBranchId, canManageParents]);

  useEffect(() => {
    setModalOpen(false);
    setDetailOpen(false);
    setLinkModalOpen(false);

    setEditingId(null);
    setSelectedParent(null);

    setAvailableStudents([]);
    setStudentSearch("");

    setError("");
    setSuccess("");
  }, [activeBranchId]);

  // ==========================================
  // LOAD AKUN YANG BISA DIJADIKAN PARENT
  // ==========================================

  async function loadEligibleParentAccounts() {
    try {
      setLoadingEligibleAccounts(true);
      setError("");

      const result = await getEligibleParentAccounts();

      setEligibleAccounts(result.data || []);
    } catch (err) {
      setEligibleAccounts([]);
      setError(
        err.message || "Gagal mengambil daftar akun yang memenuhi syarat.",
      );
    } finally {
      setLoadingEligibleAccounts(false);
    }
  }

  // ==========================================
  // TAMBAH ORANG TUA
  // ==========================================

  async function openCreateModal() {
    setEditingId(null);
    setForm(initialForm);
    setSelectedUserId("");
    setEligibleAccounts([]);
    setError("");
    setSuccess("");
    setModalOpen(true);

    await loadEligibleParentAccounts();
  }

  // ==========================================
  // PILIH AKUN CALON PARENT
  // ==========================================

  function handleEligibleAccountChange(event) {
    const userId = event.target.value;

    setSelectedUserId(userId);

    const account = eligibleAccounts.find((item) => item.id === userId);

    if (!account) {
      setForm(initialForm);
      return;
    }

    setForm((previous) => ({
      ...previous,
      fullName: account.fullName || "",
      email: account.email || "",
      phone: account.phone || "",
    }));
  }

  // ==========================================
  // EDIT ORANG TUA
  // ==========================================

  function openEditModal(parent) {
    setEditingId(parent.id);
    setSelectedUserId("");

    setForm({
      fullName: parent.fullName || "",
      relationshipLabel: parent.relationshipLabel || "",
      phone: parent.phone || "",
      whatsapp: parent.whatsapp || "",
      email: parent.email || "",
      address: parent.address || "",
      notes: parent.notes || "",
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  // ==========================================
  // DETAIL ORANG TUA
  // ==========================================

  async function openDetailModal(parentId) {
    try {
      setError("");
      setSelectedParent(null);
      setDetailOpen(true);

      const result = await getParentById(parentId);

      setSelectedParent(result.data || null);
    } catch (err) {
      setDetailOpen(false);
      setError(err.message || "Gagal mengambil detail orang tua.");
    }
  }

  // ==========================================
  // LOAD SISWA YANG BISA DIHUBUNGKAN
  // ==========================================

  async function loadAvailableStudents(searchTerm = "") {
    try {
      setLoadingStudents(true);
      setError("");

      const result = await getStudents({
        search: searchTerm,
        page: 1,
        limit: 10,
      });

      const linkedStudentIds = (selectedParent?.students || []).map(
        (student) => student.studentId,
      );

      const available = (result.data || []).filter(
        (student) => !linkedStudentIds.includes(student.id),
      );

      setAvailableStudents(available);
    } catch (err) {
      setError(err.message || "Gagal mengambil daftar siswa.");
    } finally {
      setLoadingStudents(false);
    }
  }

  // ==========================================
  // BUKA MODAL HUBUNGKAN SISWA
  // ==========================================

  async function openLinkModal() {
    setStudentSearch("");

    setLinkForm({
      studentId: "",
      relationshipLabel: selectedParent?.relationshipLabel || "",
      isPrimaryContact: false,
      canViewProgress: false,
      canReceiveNotifications: false,
    });

    setLinkModalOpen(true);

    await loadAvailableStudents("");
  }

  // ==========================================
  // HANDLE FORM HUBUNGKAN SISWA
  // ==========================================

  function handleLinkChange(event) {
    const { name, value, type, checked } = event.target;

    setLinkForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  // ==========================================
  // SIMPAN HUBUNGAN ORANG TUA DAN SISWA
  // ==========================================

  async function handleLinkSubmit(event) {
    event.preventDefault();

    if (!selectedParent || !linkForm.studentId) return;

    try {
      setLinkSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        studentId: linkForm.studentId,
        relationshipLabel: linkForm.relationshipLabel.trim() || null,
        isPrimaryContact: linkForm.isPrimaryContact,
        canViewProgress: linkForm.canViewProgress,
        canReceiveNotifications: linkForm.canReceiveNotifications,
      };

      const result = await linkParentStudent(selectedParent.id, payload);

      setSelectedParent(result.data || null);
      setLinkModalOpen(false);

      setSuccess("Orang tua berhasil dihubungkan dengan siswa.");

      await loadParents(pagination.page);
    } catch (err) {
      setError(err.message || "Gagal menghubungkan orang tua dengan siswa.");
    } finally {
      setLinkSaving(false);
    }
  }

  // ==========================================
  // LEPASKAN HUBUNGAN ORANG TUA DAN SISWA
  // ==========================================

  async function handleUnlinkStudent(studentId) {
    const confirmed = window.confirm(
      "Yakin ingin melepaskan hubungan orang tua dengan siswa ini?",
    );

    if (!confirmed) return;

    try {
      setUnlinkingStudentId(studentId);
      setError("");
      setSuccess("");

      const result = await unlinkParentStudent(selectedParent.id, studentId);

      setSelectedParent(result.data || null);

      setSuccess("Hubungan orang tua dengan siswa berhasil dilepaskan.");

      await loadParents(pagination.page);
    } catch (err) {
      setError(err.message || "Gagal melepaskan hubungan.");
    } finally {
      setUnlinkingStudentId(null);
    }
  }

  async function handleRestoreParent(parent) {
    const confirmed = window.confirm(
      `Kembalikan akun ${parent.fullName} menjadi User?\n\n` +
        "Profil Parent akan dihapus.\n" +
        "Role Parent akan dinonaktifkan.\n" +
        "Role User akan diaktifkan kembali.\n" +
        "Seluruh hubungan dengan siswa akan dilepaskan.\n\n" +
        "Akun login tetap dipertahankan.",
    );

    if (!confirmed) return;

    try {
      setRestoringParentId(parent.id);
      setError("");
      setSuccess("");

      await restoreParentToUser(parent.id);

      setDetailOpen(false);
      setSelectedParent(null);

      setSuccess(`Akun ${parent.fullName} berhasil dikembalikan menjadi User.`);

      await loadParents(pagination.page);
    } catch (err) {
      setError(err.message || "Gagal mengembalikan akun Parent menjadi User.");
    } finally {
      setRestoringParentId(null);
    }
  }

  // ==========================================
  // HANDLE FORM
  // ==========================================

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // ==========================================
  // SIMPAN DATA
  // ==========================================

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        fullName: form.fullName.trim(),
        relationshipLabel: form.relationshipLabel.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (editingId) {
        await updateParent(editingId, payload);
        setSuccess("Data orang tua berhasil diperbarui.");
      } else {
        if (!selectedUserId) {
          setError("Silakan pilih akun pengguna terlebih dahulu.");
          return;
        }

        await createParent({
          ...payload,
          userId: selectedUserId,
        });

        setSuccess(
          "Orang tua berhasil ditambahkan dan role akun telah diperbarui.",
        );
      }

      setModalOpen(false);
      setForm(initialForm);
      setEditingId(null);
      setSelectedUserId("");

      await loadParents(editingId ? pagination.page : 1);
    } catch (err) {
      setError(err.message || "Gagal menyimpan data orang tua.");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // PERHITUNGAN STATISTIK
  // ==========================================

  const activeAccountCount = parents.filter(
    (parent) => parent.accountIsActive === true,
  ).length;

  const linkedCount = parents.filter(
    (parent) => Number(parent.studentCount || 0) > 0,
  ).length;

  const unlinkedCount = parents.filter(
    (parent) => Number(parent.studentCount || 0) === 0,
  ).length;

  // ==========================================
  // RENDER HALAMAN
  // ==========================================

  return (
    <>
      <div className="space-y-6">
        {/* HEADER HALAMAN */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#35485E]">
              Manajemen Orang Tua
            </h1>

            <p className="mt-1 text-sm text-[#87919D]">
              Kelola profil, akun, dan hubungan orang tua dengan siswa.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={!canManageParents}
            className="rounded-xl bg-[#529F93] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#438C81] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Tambah Orang Tua
          </button>
        </div>

        {!canManageParents && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            Silakan pilih cabang aktif terlebih dahulu untuk mengelola data
            orang tua.
          </div>
        )}

        {/* PESAN ERROR */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* PESAN SUKSES */}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* STATISTIK */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#87919D]">Total Orang Tua</p>
            <p className="mt-3 text-2xl font-bold text-[#35485E]">
              {pagination.total}
            </p>
            <p className="mt-3 text-xs text-[#87919D]">
              Seluruh orang tua terdaftar
            </p>
          </div>

          <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#87919D]">Akun Aktif</p>
            <p className="mt-3 text-2xl font-bold text-green-600">
              {activeAccountCount}
            </p>
            <p className="mt-3 text-xs text-[#87919D]">Pada halaman ini</p>
          </div>

          <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#87919D]">Terhubung dengan Siswa</p>
            <p className="mt-3 text-2xl font-bold text-[#529F93]">
              {linkedCount}
            </p>
            <p className="mt-3 text-xs text-[#87919D]">
              Orang tua pada halaman ini
            </p>
          </div>

          <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#87919D]">Belum Terhubung</p>
            <p className="mt-3 text-2xl font-bold text-orange-500">
              {unlinkedCount}
            </p>
            <p className="mt-3 text-xs text-[#87919D]">
              Orang tua tanpa siswa terhubung
            </p>
          </div>
        </div>

        {/* DAFTAR ORANG TUA */}

        <section className="overflow-hidden rounded-2xl border border-[#E9ECEF] bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="font-bold text-[#35485E]">Daftar Orang Tua</h2>

            <p className="mt-1 text-sm text-[#87919D]">
              Data seluruh orang tua yang terdaftar di Ilyon Academy.
            </p>

            <div className="mt-5">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, telepon, WhatsApp, atau email..."
                className={inputClass}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-5 py-4">Orang Tua</th>
                  <th className="px-5 py-4">Kontak</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Jumlah Siswa</th>
                  <th className="px-5 py-4">Status Akun</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-10 text-center text-gray-400"
                    >
                      Memuat data orang tua...
                    </td>
                  </tr>
                ) : parents.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-10 text-center text-gray-400"
                    >
                      Tidak ada data orang tua.
                    </td>
                  </tr>
                ) : (
                  parents.map((parent) => (
                    <tr key={parent.id} className="transition hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#35485E]">
                          {parent.fullName}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {parent.relationshipLabel ||
                            "Hubungan belum ditentukan"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        <p>{parent.phone || "-"}</p>
                        {parent.whatsapp && (
                          <p className="mt-1 text-xs text-gray-400">
                            WA: {parent.whatsapp}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {parent.email || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-[#70B8AE]/10 px-3 py-1.5 text-xs font-semibold text-[#438C81]">
                          {Number(parent.studentCount || 0)} siswa
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${accountStatusStyle(parent.accountIsActive)}`}
                        >
                          {formatAccountStatus(parent.accountIsActive)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openDetailModal(parent.id)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#529F93] transition hover:bg-gray-50"
                          >
                            Detail
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(parent)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#35485E] transition hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={restoringParentId === parent.id}
                            onClick={() => handleRestoreParent(parent)}
                            className="rounded-lg border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {restoringParentId === parent.id
                              ? "Memproses..."
                              : "Kembalikan ke User"}
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
              Total {pagination.total} orang tua
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => loadParents(pagination.page - 1)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:opacity-40"
              >
                Sebelumnya
              </button>

              <span className="text-xs text-gray-500">
                {pagination.page} / {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => loadParents(pagination.page + 1)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ====================================== */}
      {/* MODAL TAMBAH / EDIT */}
      {/* ====================================== */}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  {editingId ? "Edit Data Orang Tua" : "Tambah Orang Tua"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Lengkapi informasi orang tua berikut.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!editingId && (
                <div className="rounded-xl border border-[#70B8AE]/30 bg-[#70B8AE]/5 p-4">
                  <h3 className="mb-2 text-sm font-bold text-[#438C81]">
                    Akun Login Orang Tua
                  </h3>

                  <p className="mb-3 text-xs leading-relaxed text-gray-500">
                    Pilih akun pengguna yang sudah terdaftar. Setelah disimpan,
                    akun tersebut akan menggunakan role Parent.
                  </p>

                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Pilih Akun Pengguna *</span>

                    <select
                      value={selectedUserId}
                      onChange={handleEligibleAccountChange}
                      required
                      disabled={loadingEligibleAccounts}
                      className={inputClass}
                    >
                      <option value="">
                        {loadingEligibleAccounts
                          ? "Memuat akun pengguna..."
                          : "-- Pilih Akun Pengguna --"}
                      </option>

                      {eligibleAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.fullName}
                          {account.email ? ` - ${account.email}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  {!loadingEligibleAccounts &&
                    eligibleAccounts.length === 0 && (
                      <p className="mt-2 text-xs text-orange-600">
                        Tidak ada akun yang memenuhi syarat menjadi Parent.
                      </p>
                    )}

                  {selectedUserId && (
                    <p className="mt-2 text-xs text-green-700">
                      Akun berhasil dipilih. Lengkapi data profil di bawah.
                    </p>
                  )}
                </div>
              )}

              {/* IDENTITAS */}

              <div>
                <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                  Identitas Orang Tua
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="font-semibold">Nama Lengkap *</span>
                    <input
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      required
                      maxLength={180}
                      placeholder="Nama lengkap orang tua"
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="font-semibold">Hubungan dengan Siswa</span>
                    <input
                      name="relationshipLabel"
                      value={form.relationshipLabel}
                      onChange={handleChange}
                      maxLength={80}
                      placeholder="Contoh: Ayah, Ibu, Wali"
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>

              {/* KONTAK */}

              <div className="border-t border-gray-100 pt-5">
                <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                  Informasi Kontak
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Nomor Telepon</span>
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      maxLength={30}
                      placeholder="Nomor telepon"
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">WhatsApp</span>
                    <input
                      name="whatsapp"
                      value={form.whatsapp}
                      onChange={handleChange}
                      maxLength={30}
                      placeholder="Nomor WhatsApp"
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="font-semibold">Email</span>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      maxLength={180}
                      placeholder="Alamat email"
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>

              {/* ALAMAT */}

              <div className="border-t border-gray-100 pt-5">
                <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                  Alamat
                </h3>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Alamat Lengkap</span>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Alamat tempat tinggal"
                    className={inputClass}
                  />
                </label>
              </div>

              {/* CATATAN */}

              <div className="border-t border-gray-100 pt-5">
                <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                  Informasi Tambahan
                </h3>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Catatan</span>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Catatan tambahan mengenai orang tua..."
                    className={inputClass}
                  />
                </label>
              </div>

              {!editingId && (
                <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                  Profil Parent akan dihubungkan dengan akun yang dipilih. Role
                  user akan dinonaktifkan dan role parent akan diaktifkan secara
                  otomatis setelah penyimpanan berhasil.
                </div>
              )}

              {/* TOMBOL */}

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    (!editingId && (!selectedUserId || loadingEligibleAccounts))
                  }
                  className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#438C81] disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : editingId
                      ? "Simpan Perubahan"
                      : "Simpan Orang Tua"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================== */}
      {/* MODAL HUBUNGKAN SISWA */}
      {/* ====================================== */}

      {linkModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  Hubungkan Siswa
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Hubungkan siswa dengan {selectedParent?.fullName}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLinkSubmit} className="space-y-5">
              {/* PILIH SISWA */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#35485E]">
                  Cari Siswa
                </label>

                <div className="flex gap-2">
                  <input
                    type="search"
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder="Cari nama atau kode siswa..."
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => loadAvailableStudents(studentSearch)}
                    disabled={loadingStudents}
                    className="rounded-xl bg-[#529F93] px-4 py-2 text-sm font-semibold text-white hover:bg-[#438C81] disabled:opacity-50"
                  >
                    Cari
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#35485E]">
                  Pilih Siswa *
                </label>

                <select
                  name="studentId"
                  value={linkForm.studentId}
                  onChange={handleLinkChange}
                  required
                  className={inputClass}
                >
                  <option value="">-- Pilih Siswa --</option>

                  {availableStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} - {student.studentCode || "Tanpa kode"}
                    </option>
                  ))}
                </select>

                {loadingStudents && (
                  <p className="mt-2 text-xs text-gray-400">
                    Memuat daftar siswa...
                  </p>
                )}

                {!loadingStudents && availableStudents.length === 0 && (
                  <p className="mt-2 text-xs text-orange-500">
                    Tidak ada siswa tersedia atau semua siswa sudah terhubung.
                  </p>
                )}
              </div>

              {/* HUBUNGAN */}

              <div className="border-t border-gray-100 pt-5">
                <label className="mb-2 block text-sm font-semibold text-[#35485E]">
                  Hubungan dengan Siswa
                </label>

                <input
                  type="text"
                  name="relationshipLabel"
                  value={linkForm.relationshipLabel}
                  onChange={handleLinkChange}
                  maxLength={80}
                  placeholder="Contoh: Ayah, Ibu, Wali"
                  className={inputClass}
                />
              </div>

              {/* HAK AKSES */}

              <div className="border-t border-gray-100 pt-5">
                <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                  Pengaturan Hubungan dan Hak Akses
                </h3>

                <div className="space-y-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      name="isPrimaryContact"
                      checked={linkForm.isPrimaryContact}
                      onChange={handleLinkChange}
                      className="mt-1 h-4 w-4 accent-[#529F93]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[#35485E]">
                        Kontak Utama
                      </span>
                      <span className="block text-xs text-gray-500">
                        Menjadikan orang tua ini sebagai kontak utama siswa.
                      </span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      name="canViewProgress"
                      checked={linkForm.canViewProgress}
                      onChange={handleLinkChange}
                      className="mt-1 h-4 w-4 accent-[#529F93]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[#35485E]">
                        Boleh Melihat Progres Belajar
                      </span>
                      <span className="block text-xs text-gray-500">
                        Memberikan akses melihat perkembangan belajar siswa.
                      </span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      name="canReceiveNotifications"
                      checked={linkForm.canReceiveNotifications}
                      onChange={handleLinkChange}
                      className="mt-1 h-4 w-4 accent-[#529F93]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[#35485E]">
                        Boleh Menerima Notifikasi
                      </span>
                      <span className="block text-xs text-gray-500">
                        Mengizinkan orang tua menerima pemberitahuan terkait
                        siswa.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 p-4 text-xs text-blue-700">
                Pengaturan ini berlaku untuk hubungan orang tua dengan siswa
                yang dipilih. Jika dijadikan kontak utama, kontak utama siswa
                sebelumnya akan diganti.
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={
                    linkSaving || loadingStudents || !linkForm.studentId
                  }
                  className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#438C81] disabled:opacity-50"
                >
                  {linkSaving ? "Menyimpan..." : "Hubungkan Siswa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================== */}
      {/* MODAL DETAIL */}
      {/* ====================================== */}

      {detailOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  Detail Orang Tua
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Informasi profil dan siswa yang terhubung.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {!selectedParent ? (
              <div className="py-10 text-center text-sm text-gray-400">
                Memuat detail orang tua...
              </div>
            ) : (
              <div className="space-y-6">
                {/* PROFIL */}

                <div>
                  <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                    Informasi Profil
                  </h3>

                  <div className="grid gap-4 rounded-xl border border-gray-100 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-400">Nama Lengkap</p>
                      <p className="mt-1 text-sm font-semibold text-[#35485E]">
                        {selectedParent.fullName}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Hubungan</p>
                      <p className="mt-1 text-sm font-semibold text-[#35485E]">
                        {selectedParent.relationshipLabel || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Telepon</p>
                      <p className="mt-1 text-sm text-gray-700">
                        {selectedParent.phone || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">WhatsApp</p>
                      <p className="mt-1 text-sm text-gray-700">
                        {selectedParent.whatsapp || "-"}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="mt-1 text-sm text-gray-700">
                        {selectedParent.email || "-"}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-400">Alamat</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
                        {selectedParent.address || "-"}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-400">Catatan</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
                        {selectedParent.notes || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Status Akun</p>
                      <span
                        className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${accountStatusStyle(selectedParent.accountIsActive)}`}
                      >
                        {formatAccountStatus(selectedParent.accountIsActive)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SISWA TERHUBUNG */}

                <div className="border-t border-gray-100 pt-5">
                  <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-sm font-bold text-[#529F93]">
                        Siswa Terhubung
                      </h3>
                      <p className="mt-1 text-xs text-gray-400">
                        Kelola hubungan orang tua dengan siswa.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#70B8AE]/10 px-3 py-1 text-xs font-semibold text-[#438C81]">
                        {selectedParent.students?.length || 0} siswa
                      </span>

                      <button
                        type="button"
                        onClick={openLinkModal}
                        className="rounded-lg bg-[#529F93] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#438C81]"
                      >
                        + Hubungkan Siswa
                      </button>
                    </div>
                  </div>

                  {!selectedParent.students ||
                  selectedParent.students.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
                      <p className="text-sm text-gray-500">
                        Belum ada siswa yang terhubung.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedParent.students.map((student) => (
                        <div
                          key={student.studentId}
                          className="rounded-xl border border-gray-100 p-4"
                        >
                          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <div>
                              <p className="font-semibold text-[#35485E]">
                                {student.studentName}
                              </p>
                              <p className="mt-1 text-xs text-gray-400">
                                {student.studentCode}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {student.isPrimaryContact && (
                                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                  Kontak Utama
                                </span>
                              )}

                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                                {student.studentStatus}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3">
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              <span>
                                Hubungan: {student.relationshipLabel || "-"}
                              </span>

                              <span>
                                Progres:{" "}
                                {student.canViewProgress
                                  ? "Diizinkan"
                                  : "Tidak diizinkan"}
                              </span>

                              <span>
                                Notifikasi:{" "}
                                {student.canReceiveNotifications
                                  ? "Diizinkan"
                                  : "Tidak diizinkan"}
                              </span>
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="button"
                                disabled={
                                  unlinkingStudentId === student.studentId
                                }
                                onClick={() =>
                                  handleUnlinkStudent(student.studentId)
                                }
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                {unlinkingStudentId === student.studentId
                                  ? "Memproses..."
                                  : "Lepaskan Hubungan"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setDetailOpen(false)}
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
