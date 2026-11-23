import { useEffect, useState } from "react";

import {
  getStudents,
  createStudent,
  updateStudent,
  updateStudentStatus,
} from "../../../Services/StudentService";

import { getBranches } from "../../../Services/BranchService";

const initialForm = {
  primaryBranchId: "",
  fullName: "",
  nickname: "",
  gender: "unspecified",
  birthDate: "",
  schoolName: "",
  schoolGrade: "",
  schoolDismissalTime: "",
  address: "",
  city: "",
  province: "",
  studentPhone: "",
  notes: "",
  status: "active",
};

const statusOptions = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "graduated", label: "Lulus" },
  { value: "transferred", label: "Pindah" },
  { value: "withdrawn", label: "Mengundurkan diri" },
];

const statusStyle = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-red-50 text-red-600",
  graduated: "bg-blue-50 text-blue-700",
  transferred: "bg-yellow-50 text-yellow-700",
  withdrawn: "bg-gray-100 text-gray-600",
};

function formatStatus(status) {
  return statusOptions.find((item) => item.value === status)?.label || status;
}

export default function StudentPage() {
  const [students, setStudents] = useState([]);
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  async function loadStudents(page = 1) {
    try {
      setLoading(true);
      setError("");

      const result = await getStudents({
        search,
        status: statusFilter,
        primaryBranchId: branchFilter,
        page,
        limit: 10,
      });

      setStudents(result.data || []);
      setPagination(
        result.pagination || {
          page: 1,
          totalPages: 1,
          total: 0,
        },
      );
    } catch (err) {
      setError(err.message || "Gagal mengambil data siswa.");
    } finally {
      setLoading(false);
    }
  }

  async function loadBranches() {
    try {
      const result = await getBranches({
        limit: 100,
        page: 1,
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
    loadStudents(1);
  }, [search, statusFilter, branchFilter]);

  function openCreateModal() {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(student) {
    setEditingId(student.id);

    setForm({
      primaryBranchId: student.primaryBranchId || "",
      fullName: student.fullName || "",
      nickname: student.nickname || "",
      gender: student.gender || "unspecified",
      birthDate: student.birthDate
        ? String(student.birthDate).slice(0, 10)
        : "",
      schoolName: student.schoolName || "",
      schoolGrade: student.schoolGrade || "",
      schoolDismissalTime: student.schoolDismissalTime
        ? String(student.schoolDismissalTime).slice(0, 5)
        : "",
      address: student.address || "",
      city: student.city || "",
      province: student.province || "",
      studentPhone: student.studentPhone || "",
      notes: student.notes || "",
      status: student.status || "active",
    });

    setError("");
    setModalOpen(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        ...form,
        primaryBranchId: form.primaryBranchId || null,
        nickname: form.nickname.trim() || null,
        birthDate: form.birthDate || null,
        schoolName: form.schoolName.trim() || null,
        schoolGrade: form.schoolGrade.trim() || null,
        schoolDismissalTime: form.schoolDismissalTime || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        province: form.province.trim() || null,
        studentPhone: form.studentPhone.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (editingId) {
        await updateStudent(editingId, payload);
        setSuccess("Data siswa berhasil diperbarui.");
      } else {
        await createStudent(payload);
        setSuccess("Siswa berhasil ditambahkan.");
      }

      setModalOpen(false);
      setForm(initialForm);
      setEditingId(null);

      await loadStudents(editingId ? pagination.page : 1);
    } catch (err) {
      setError(err.message || "Gagal menyimpan data siswa.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(student, newStatus) {
    if (newStatus === student.status) return;

    if (
      !window.confirm(
        `Yakin ingin mengubah status ${student.fullName} menjadi ${formatStatus(newStatus)}?`,
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await updateStudentStatus(student.id, newStatus);

      setSuccess("Status siswa berhasil diperbarui.");
      await loadStudents(pagination.page);
    } catch (err) {
      setError(err.message || "Gagal mengubah status siswa.");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#70B8AE] focus:ring-2 focus:ring-[#70B8AE]/20";

  const activeCount = students.filter(
    (student) => student.status === "active",
  ).length;

  const inactiveCount = students.filter(
    (student) => student.status === "inactive",
  ).length;

  const otherCount = students.filter(
    (student) => !["active", "inactive"].includes(student.status),
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-[#70B8AE]">Ilyon Academy</p>

          <h1 className="mt-1 text-2xl font-bold text-[#35485E]">
            Manajemen Siswa
          </h1>

          <p className="mt-1 text-sm text-[#87919D]">
            Kelola data siswa seluruh cabang Ilyon Academy.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-xl bg-[#529F93] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#438C81]"
        >
          + Tambah Siswa
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
          <p className="text-sm text-[#87919D]">Total Siswa</p>
          <p className="mt-3 text-2xl font-bold text-[#35485E]">
            {pagination.total}
          </p>
          <p className="mt-3 text-xs text-[#87919D]">Seluruh siswa terdaftar</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Siswa Aktif</p>
          <p className="mt-3 text-2xl font-bold text-green-600">
            {activeCount}
          </p>
          <p className="mt-3 text-xs text-[#87919D]">Aktif pada halaman ini</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Siswa Nonaktif</p>
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
          <p className="mt-3 text-xs text-[#87919D]">Pada halaman ini</p>
        </div>
      </div>

      {/* Daftar Siswa */}
      <section className="overflow-hidden rounded-2xl border border-[#E9ECEF] bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <div>
            <h2 className="font-bold text-[#35485E]">Daftar Siswa</h2>

            <p className="mt-1 text-sm text-[#87919D]">
              Data seluruh siswa yang terdaftar di Ilyon Academy.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama atau kode siswa..."
              className={inputClass}
            />

            <select
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
              className={inputClass}
            >
              <option value="">Semua Cabang Asal</option>

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

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-4">Siswa</th>
                <th className="px-5 py-4">Kode Siswa</th>
                <th className="px-5 py-4">Cabang Asal</th>
                <th className="px-5 py-4">Sekolah</th>
                <th className="px-5 py-4">Status</th>
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
                    Memuat data siswa...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Tidak ada data siswa.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {student.fullName}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {student.nickname || "Tanpa nama panggilan"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {student.studentCode}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {student.primaryBranchName || "-"}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {student.schoolName || "-"}
                    </td>

                    <td className="px-5 py-4">
                      <select
                        value={student.status}
                        onChange={(event) =>
                          handleStatusChange(student, event.target.value)
                        }
                        className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ${statusStyle[student.status] || "bg-gray-100 text-gray-600"}`}
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
                          onClick={() => openEditModal(student)}
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

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Total {pagination.total} siswa
          </p>

          <div className="flex items-center gap-3">
            <button
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadStudents(pagination.page - 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:opacity-40"
            >
              Sebelumnya
            </button>

            <span className="text-xs text-gray-500">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadStudents(pagination.page + 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  {editingId ? "Edit Data Siswa" : "Tambah Siswa"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Lengkapi informasi siswa berikut.
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
              {/* Identitas */}
              <div>
                <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                  Identitas Siswa
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Nama Lengkap *</span>
                    <input
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      required
                      maxLength={180}
                      placeholder="Nama lengkap siswa"
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Nama Panggilan</span>
                    <input
                      name="nickname"
                      value={form.nickname}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Jenis Kelamin</span>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="unspecified">Belum ditentukan</option>
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Tanggal Lahir</span>
                    <input
                      type="date"
                      name="birthDate"
                      value={form.birthDate}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Cabang Asal</span>
                    <select
                      name="primaryBranchId"
                      value={form.primaryBranchId}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Belum ditentukan</option>

                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.branchName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Pendidikan */}
              <div className="border-t border-gray-100 pt-5">
                <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                  Informasi Pendidikan
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Nama Sekolah</span>
                    <input
                      name="schoolName"
                      value={form.schoolName}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Kelas Sekolah</span>
                    <input
                      name="schoolGrade"
                      value={form.schoolGrade}
                      onChange={handleChange}
                      placeholder="Contoh: Kelas 3 SD"
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Jam Pulang Sekolah</span>
                    <input
                      type="time"
                      name="schoolDismissalTime"
                      value={form.schoolDismissalTime}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>

              {/* Kontak dan alamat */}
              <div className="border-t border-gray-100 pt-5">
                <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                  Kontak dan Alamat
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Nomor Telepon Siswa</span>
                    <input
                      name="studentPhone"
                      value={form.studentPhone}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Kota</span>
                    <input
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="font-semibold">Alamat</span>
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      rows="3"
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Provinsi</span>
                    <input
                      name="province"
                      value={form.province}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>

              {/* Catatan dan status */}
              <div className="border-t border-gray-100 pt-5">
                <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                  Informasi Tambahan
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Status Siswa</span>
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

                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="font-semibold">Catatan</span>
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows="3"
                      className={inputClass}
                      placeholder="Catatan tambahan mengenai siswa..."
                    />
                  </label>
                </div>
              </div>

              {/* Tombol */}
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
                  disabled={saving}
                  className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#438C81] disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : editingId
                      ? "Simpan Perubahan"
                      : "Simpan Siswa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
