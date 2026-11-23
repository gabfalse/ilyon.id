import { useEffect, useState } from "react";

import {
  getBranches,
  createBranch,
  updateBranch,
  updateBranchStatus,
} from "../../../Services/BranchService";

const initialForm = {
  branchCode: "",
  branchName: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  isHeadOffice: false,
  openedAt: "",
};

export default function BranchPage() {
  const [branches, setBranches] = useState([]);
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
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  async function loadBranches(page = 1) {
    try {
      setLoading(true);
      setError("");

      const result = await getBranches({
        search,
        page,
        limit: 10,
      });

      setBranches(result.data || []);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message || "Gagal mengambil data cabang.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBranches(1);
  }, [search]);

  function openCreateModal() {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(branch) {
    setEditingId(branch.id);

    setForm({
      branchCode: branch.branchCode || "",
      branchName: branch.branchName || "",
      phone: branch.phone || "",
      whatsapp: branch.whatsapp || "",
      email: branch.email || "",
      address: branch.address || "",
      city: branch.city || "",
      province: branch.province || "",
      postalCode: branch.postalCode || "",
      isHeadOffice: branch.isHeadOffice || false,
      openedAt: branch.openedAt ? String(branch.openedAt).slice(0, 10) : "",
    });

    setError("");
    setModalOpen(true);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
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
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        province: form.province.trim() || null,
        postalCode: form.postalCode.trim() || null,
        openedAt: form.openedAt || null,
      };

      if (editingId) {
        await updateBranch(editingId, payload);
        setSuccess("Data cabang berhasil diperbarui.");
      } else {
        await createBranch(payload);
        setSuccess("Cabang berhasil ditambahkan.");
      }

      setModalOpen(false);
      setForm(initialForm);
      setEditingId(null);

      await loadBranches(editingId ? pagination.page : 1);
    } catch (err) {
      setError(err.message || "Gagal menyimpan data cabang.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(branch) {
    const action = branch.isActive ? "menonaktifkan" : "mengaktifkan";

    if (!window.confirm(`Yakin ingin ${action} cabang ini?`)) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await updateBranchStatus(branch.id, !branch.isActive);

      setSuccess("Status cabang berhasil diperbarui.");
      await loadBranches(pagination.page);
    } catch (err) {
      setError(err.message || "Gagal mengubah status cabang.");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#70B8AE] focus:ring-2 focus:ring-[#70B8AE]/20";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#35485E]">
            Manajemen Cabang
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola seluruh cabang Ilyon Academy.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-xl bg-[#529F93] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#438C81]"
        >
          + Tambah Cabang
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-sm text-gray-500">Total Cabang</p>
          <p className="mt-2 text-2xl font-bold">{pagination.total}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-sm text-gray-500">Cabang Aktif</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {branches.filter((branch) => branch.isActive).length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-sm text-gray-500">Cabang Nonaktif</p>
          <p className="mt-2 text-2xl font-bold text-red-500">
            {branches.filter((branch) => !branch.isActive).length}
          </p>
        </div>
      </div>

      {/* Tabel Cabang */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 p-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, kode, atau kota cabang..."
            className={`${inputClass} max-w-md`}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-4">Cabang</th>
                <th className="px-5 py-4">Kode</th>
                <th className="px-5 py-4">Kota</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Memuat data cabang...
                  </td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Tidak ada data cabang.
                  </td>
                </tr>
              ) : (
                branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {branch.branchName}
                      </p>
                      {branch.isHeadOffice && (
                        <span className="text-xs text-[#529F93]">
                          Kantor Pusat
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">{branch.branchCode}</td>

                    <td className="px-5 py-4">{branch.city || "-"}</td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          branch.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {branch.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(branch)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleStatusChange(branch)}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                            branch.isActive
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                        >
                          {branch.isActive ? "Nonaktifkan" : "Aktifkan"}
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
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
          <p className="text-xs text-gray-500">
            Total {pagination.total} cabang
          </p>

          <div className="flex items-center gap-3">
            <button
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadBranches(pagination.page - 1)}
              className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"
            >
              Sebelumnya
            </button>

            <span className="text-xs text-gray-500">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadBranches(pagination.page + 1)}
              className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ? "Edit Cabang" : "Tambah Cabang"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Lengkapi informasi cabang berikut.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Kode Cabang *</span>
                  <input
                    name="branchCode"
                    value={form.branchCode}
                    onChange={handleChange}
                    required
                    maxLength={30}
                    disabled={Boolean(editingId)}
                    placeholder="Contoh: CBG001"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Nama Cabang *</span>
                  <input
                    name="branchName"
                    value={form.branchName}
                    onChange={handleChange}
                    required
                    minLength={3}
                    maxLength={150}
                    placeholder="Nama cabang"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Telepon</span>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">WhatsApp</span>
                  <input
                    name="whatsapp"
                    value={form.whatsapp}
                    onChange={handleChange}
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
                  <span className="font-semibold">Kota</span>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
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

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Kode Pos</span>
                  <input
                    name="postalCode"
                    value={form.postalCode}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Tanggal Dibuka</span>
                  <input
                    type="date"
                    name="openedAt"
                    value={form.openedAt}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isHeadOffice"
                  checked={form.isHeadOffice}
                  onChange={handleChange}
                  className="h-4 w-4 accent-[#529F93]"
                />
                Jadikan sebagai kantor pusat
              </label>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Cabang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
