import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getUsers,
  getUserById,
  getAvailableBranches,
  updateBranchAdminAssignments,
} from "../../../Services/UserManagementService";

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#70B8AE] focus:ring-2 focus:ring-[#70B8AE]/20";

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function RoleBadge({ role }) {
  const styles = {
    super_admin: "bg-purple-50 text-purple-700",
    branch_admin: "bg-blue-50 text-blue-700",
    staff: "bg-green-50 text-green-700",
    tutor: "bg-yellow-50 text-yellow-700",
    parent: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[role.roleCode] || "bg-gray-100 text-gray-600"
      }`}
    >
      {role.roleName}
      {!role.isActive && <span className="ml-1 opacity-70">(Nonaktif)</span>}
    </span>
  );
}

function UserDetailModal({ user, branches, loading, saving, onClose, onSave }) {
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);

  useEffect(() => {
    if (!user) return;

    setSelectedBranchIds(
      (user.roles || [])
        .filter(
          (role) =>
            role.roleCode === "branch_admin" && role.isActive && role.branchId,
        )
        .map((role) => role.branchId),
    );
  }, [user]);

  const isSelf = user?.isCurrentUser === true;
  const canAssign = user?.isActive && !isSelf;

  function toggleBranch(branchId) {
    setSelectedBranchIds((current) =>
      current.includes(branchId)
        ? current.filter((id) => id !== branchId)
        : [...current, branchId],
    );
  }

  const activeRoles = (user?.roles || []).filter((role) => role.isActive);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white p-5">
          <div>
            <h2 className="text-lg font-bold text-[#35485E]">
              Detail Pengguna
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Informasi akun dan penugasan role.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {loading || !user ? (
          <div className="p-10 text-center text-sm text-gray-400">
            Memuat detail pengguna...
          </div>
        ) : (
          <div className="space-y-6 p-5">
            {/* Informasi pengguna */}
            <section className="rounded-xl border border-gray-100 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <h3 className="font-bold text-[#35485E]">{user.fullName}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {user.email || "-"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {user.phone || "-"}
                  </p>
                </div>

                <span
                  className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    user.isActive
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {user.isActive ? "Akun Aktif" : "Akun Nonaktif"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-400">Terdaftar</p>
                  <p className="mt-1 text-sm font-medium text-gray-700">
                    {formatDate(user.createdAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Login terakhir</p>
                  <p className="mt-1 text-sm font-medium text-gray-700">
                    {formatDate(user.lastLoginAt)}
                  </p>
                </div>
              </div>
            </section>

            {/* Role saat ini */}
            <section>
              <h3 className="mb-3 text-sm font-bold text-[#35485E]">
                Role Pengguna
              </h3>

              {user.roles?.length ? (
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role, index) => (
                    <div
                      key={`${role.roleCode}-${role.branchId || "global"}-${index}`}
                      className="rounded-xl border border-gray-100 p-3"
                    >
                      <RoleBadge role={role} />

                      <p className="mt-2 text-xs text-gray-500">
                        {role.branchName || "Global"}
                      </p>

                      <p className="mt-1 text-[11px] text-gray-400">
                        {role.branchCode || "Tanpa cabang"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Belum memiliki role.</p>
              )}
            </section>

            {/* Assignment Admin Cabang */}
            <section className="rounded-xl border border-[#DCEFEB] bg-[#F8FCFB] p-4">
              <div>
                <h3 className="font-bold text-[#35485E]">
                  Penugasan Admin Cabang
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Pilih cabang tempat pengguna mendapatkan role Admin Cabang.
                  Role lain yang sudah dimiliki tidak akan diubah.
                </p>
              </div>

              {!user.isActive && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-600">
                  Akun nonaktif tidak dapat diberikan penugasan Admin Cabang.
                </div>
              )}

              {isSelf && (
                <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-700">
                  Super Admin tidak dapat mengubah penugasan akunnya sendiri.
                </div>
              )}

              <div className="mt-4 space-y-2">
                {branches.map((branch) => {
                  const checked = selectedBranchIds.includes(branch.id);

                  return (
                    <label
                      key={branch.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                        checked
                          ? "border-[#70B8AE] bg-white"
                          : "border-gray-200 bg-white hover:border-[#70B8AE]"
                      } ${!canAssign ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canAssign || saving}
                        onChange={() => toggleBranch(branch.id)}
                        className="h-4 w-4 accent-[#529F93]"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#35485E]">
                          {branch.branchName}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {branch.branchCode}
                          {branch.city ? ` • ${branch.city}` : ""}
                        </p>
                      </div>

                      {checked && (
                        <span className="text-xs font-semibold text-[#529F93]">
                          Dipilih
                        </span>
                      )}
                    </label>
                  );
                })}

                {branches.length === 0 && (
                  <p className="rounded-lg bg-white p-4 text-center text-sm text-gray-400">
                    Tidak ada cabang aktif.
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#DCEFEB] pt-4">
                <p className="text-xs text-gray-500">
                  {selectedBranchIds.length} cabang dipilih
                </p>

                <button
                  type="button"
                  disabled={!canAssign || saving}
                  onClick={() => onSave(selectedBranchIds)}
                  className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#438F83] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Penugasan"}
                </button>
              </div>
            </section>

            {/* Keterangan role lain */}
            <p className="text-xs leading-relaxed text-gray-400">
              Perubahan di halaman ini hanya mengatur role Admin Cabang. Status
              akun dan role Staff, Tutor, Orang Tua, serta Admin Pusat tidak
              diubah.
            </p>
          </div>
        )}

        <div className="flex justify-end border-t border-gray-100 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError("");

        const result = await getUsers({
          search,
          page,
          limit: 10,
        });

        setUsers(result.data || []);
        setPagination(
          result.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 1,
          },
        );
      } catch (err) {
        setError(err.message || "Gagal mengambil daftar pengguna.");
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  async function loadBranches() {
    try {
      const result = await getAvailableBranches();
      setBranches(result.data || []);
    } catch (err) {
      setError(err.message || "Gagal mengambil daftar cabang.");
    }
  }

  async function openUserDetail(userId) {
    try {
      setSelectedUser(null);
      setDetailLoading(true);
      setError("");

      const result = await getUserById(userId);
      setSelectedUser(result.data);
    } catch (err) {
      setError(err.message || "Gagal mengambil detail pengguna.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSaveAssignments(branchIds) {
    if (!selectedUser) return;

    const confirmed = window.confirm(
      "Simpan perubahan penugasan Admin Cabang untuk pengguna ini?",
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const result = await updateBranchAdminAssignments(
        selectedUser.id,
        branchIds,
      );

      setSelectedUser(result.data);
      setSuccess("Penugasan Admin Cabang berhasil diperbarui.");

      await loadUsers(pagination.page);
    } catch (err) {
      setError(err.message || "Gagal memperbarui penugasan Admin Cabang.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  const activeUsers = useMemo(
    () => users.filter((user) => user.isActive).length,
    [users],
  );

  const inactiveUsers = users.length - activeUsers;

  const branchAdminCount = useMemo(
    () =>
      users.filter((user) =>
        user.roles?.some(
          (role) => role.roleCode === "branch_admin" && role.isActive,
        ),
      ).length,
    [users],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-[#70B8AE]">Ilyon Academy</p>

        <h1 className="mt-1 text-2xl font-bold text-[#35485E]">
          Manajemen Pengguna
        </h1>

        <p className="mt-1 text-sm text-[#87919D]">
          Kelola akun pengguna dan penugasan Admin Cabang.
        </p>
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
          <p className="text-sm text-gray-500">Total Pengguna</p>
          <p className="mt-3 text-2xl font-bold text-[#35485E]">
            {pagination.total}
          </p>
          <p className="mt-2 text-xs text-gray-400">Seluruh akun terdaftar</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Akun Aktif</p>
          <p className="mt-3 text-2xl font-bold text-green-600">
            {activeUsers}
          </p>
          <p className="mt-2 text-xs text-gray-400">Pada halaman ini</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Akun Nonaktif</p>
          <p className="mt-3 text-2xl font-bold text-red-500">
            {inactiveUsers}
          </p>
          <p className="mt-2 text-xs text-gray-400">Pada halaman ini</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Admin Cabang</p>
          <p className="mt-3 text-2xl font-bold text-blue-600">
            {branchAdminCount}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Pengguna dengan assignment aktif
          </p>
        </div>
      </div>

      {/* Tabel pengguna */}
      <section className="overflow-hidden rounded-2xl border border-[#E9ECEF] bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-bold text-[#35485E]">Daftar Pengguna</h2>

          <p className="mt-1 text-sm text-gray-400">
            Pilih pengguna untuk melihat detail dan mengatur role Admin Cabang.
          </p>

          <div className="mt-5">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, email, atau nomor telepon..."
              className={inputClass}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-4">Pengguna</th>
                <th className="px-5 py-4">Kontak</th>
                <th className="px-5 py-4">Role Aktif</th>
                <th className="px-5 py-4">Status Akun</th>
                <th className="px-5 py-4">Terdaftar</th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Tidak ada pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const roles = (user.roles || []).filter(
                    (role) => role.isActive,
                  );

                  return (
                    <tr key={user.id} className="transition hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#35485E]">
                          {user.fullName}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          ID: {user.id.slice(0, 8)}...
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-gray-600">{user.email || "-"}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {user.phone || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex max-w-xs flex-wrap gap-1.5">
                          {roles.length ? (
                            roles.map((role, index) => (
                              <RoleBadge
                                key={`${role.roleCode}-${role.branchId || "global"}-${index}`}
                                role={role}
                              />
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">
                              Belum ada role aktif
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            user.isActive
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {user.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => openUserDetail(user.id)}
                          className="rounded-lg border border-[#70B8AE] px-3 py-2 text-xs font-semibold text-[#529F93] transition hover:bg-[#70B8AE]/10"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Total {pagination.total} pengguna
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadUsers(pagination.page - 1)}
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
              onClick={() => loadUsers(pagination.page + 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      {/* Detail dan assignment */}
      {(selectedUser || detailLoading) && (
        <UserDetailModal
          user={selectedUser}
          branches={branches}
          loading={detailLoading}
          saving={saving}
          onClose={() => {
            if (!saving) setSelectedUser(null);
          }}
          onSave={handleSaveAssignments}
        />
      )}
    </div>
  );
}
