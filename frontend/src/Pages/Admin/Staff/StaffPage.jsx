import { useEffect, useState } from "react";

import { getStaff } from "../../../Services/StaffService";
import { getBranches } from "../../../Services/BranchService";
import StaffFormModal from "./StaffFormModal";
import StaffDetailModal from "./StaffDetailModal";

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

function formatStatus(status) {
  return (
    statusOptions.find((item) => item.value === status)?.label || status || "-"
  );
}

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [showDetail, setShowDetail] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#70B8AE] focus:ring-2 focus:ring-[#70B8AE]/20";

  async function loadStaff(page = 1) {
    try {
      setLoading(true);
      setError("");

      const result = await getStaff({
        search,
        employmentStatus: statusFilter,
        branchId: branchFilter,
        page,
        limit: 10,
      });

      setStaff(result.data || []);

      setPagination(
        result.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        },
      );
    } catch (err) {
      setError(err.message || "Gagal mengambil data Staff.");
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

  function handleStaffCreated() {
    setShowForm(false);
    setSuccess("Staff dan akun login berhasil dibuat.");
    setError("");
    loadStaff(1);
  }

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadStaff(1);
  }, [search, statusFilter, branchFilter]);

  const activeCount = staff.filter(
    (item) => item.employmentStatus === "active",
  ).length;

  const inactiveCount = staff.filter(
    (item) => item.employmentStatus === "inactive",
  ).length;

  const otherCount = staff.filter(
    (item) => !["active", "inactive"].includes(item.employmentStatus),
  ).length;

  function handleStaffUpdated() {
    setShowForm(false);
    setEditingStaff(null);
    setSuccess("Data Staff berhasil diperbarui.");
    setError("");

    loadStaff(pagination.page);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-[#70B8AE]">Ilyon Academy</p>

          <h1 className="mt-1 text-2xl font-bold text-[#35485E]">
            Manajemen Staff
          </h1>

          <p className="mt-1 text-sm text-[#87919D]">
            Kelola data Staff, akun login, dan penugasan cabang Ilyon Academy.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingStaff(null);
            setError("");
            setSuccess("");
            setShowForm(true);
          }}
          className="rounded-xl bg-[#529F93] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#438F83]"
        >
          + Tambah Staff
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
          <p className="text-sm text-[#87919D]">Total Staff</p>
          <p className="mt-3 text-2xl font-bold text-[#35485E]">
            {pagination.total}
          </p>
          <p className="mt-3 text-xs text-[#87919D]">Seluruh Staff terdaftar</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Staff Aktif</p>
          <p className="mt-3 text-2xl font-bold text-green-600">
            {activeCount}
          </p>
          <p className="mt-3 text-xs text-[#87919D]">Aktif pada halaman ini</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Staff Nonaktif</p>
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

      {/* Daftar Staff */}
      <section className="overflow-hidden rounded-2xl border border-[#E9ECEF] bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-bold text-[#35485E]">Daftar Staff</h2>

          <p className="mt-1 text-sm text-[#87919D]">
            Data Staff dan cabang penugasan aktif.
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-4">Staff</th>
                <th className="px-5 py-4">Kode Staff</th>
                <th className="px-5 py-4">Kontak</th>
                <th className="px-5 py-4">Jabatan</th>
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
                    Memuat data Staff...
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Tidak ada data Staff.
                  </td>
                </tr>
              ) : (
                staff.map((item) => (
                  <tr key={item.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {item.fullName}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        Bergabung:{" "}
                        {item.joinDate
                          ? new Date(item.joinDate).toLocaleDateString("id-ID")
                          : "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {item.staffCode || "-"}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-gray-600">{item.email || "-"}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {item.phone || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {item.jobTitle || "-"}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {item.currentBranchName || "-"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                          statusStyle[item.employmentStatus] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {formatStatus(item.employmentStatus)}
                      </span>

                      {!item.accountIsActive && (
                        <p className="mt-1 text-xs text-red-500">
                          Akun login nonaktif
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStaffId(item.id);
                          setShowDetail(true);
                          setError("");
                          setSuccess("");
                        }}
                        className="rounded-lg border border-[#70B8AE] px-3 py-2 text-xs font-semibold text-[#529F93] transition hover:bg-[#70B8AE]/10"
                      >
                        Detail
                      </button>
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
            Total {pagination.total} Staff
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadStaff(pagination.page - 1)}
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
              onClick={() => loadStaff(pagination.page + 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      {/* Modal Tambah / Edit Staff */}
      {showForm && (
        <StaffFormModal
          branches={branches}
          staff={editingStaff}
          onClose={() => {
            setShowForm(false);
            setEditingStaff(null);
          }}
          onCreated={handleStaffCreated}
          onUpdated={handleStaffUpdated}
        />
      )}

      {/* Modal Detail Staff */}
      {showDetail && selectedStaffId && (
        <StaffDetailModal
          staffId={selectedStaffId}
          branches={branches}
          onClose={() => {
            setShowDetail(false);
            setSelectedStaffId(null);
          }}
          onEdit={(staffData) => {
            setShowDetail(false);
            setEditingStaff(staffData);
            setShowForm(true);
          }}
          onTransferred={(staffData) => {
            setSuccess("Staff berhasil dipindahkan ke cabang baru.");
            setError("");
            loadStaff(pagination.page);
          }}
        />
      )}
    </div>
  );
}
