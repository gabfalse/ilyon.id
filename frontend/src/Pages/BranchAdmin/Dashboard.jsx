import { useAuth } from "../../Contexts/AuthContext";

export default function BranchAdminDashboard() {
  const { user } = useAuth();

  const branchRoles = (user?.roles ?? []).filter(
    (role) => role.roleCode === "branch_admin" && role.isActive !== false,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-[#529F93]">
          Dashboard Admin Cabang
        </p>

        <h1 className="mt-1 text-2xl font-bold text-[#35485E]">
          Selamat datang, {user?.fullName || "Admin Cabang"}!
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Selamat bekerja. Berikut ringkasan pengelolaan cabang Anda.
        </p>
      </div>

      {/* Informasi cabang */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#35485E]">
          Cabang yang Ditugaskan
        </h2>

        {branchRoles.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {branchRoles.map((role) => (
              <div
                key={role.branchId}
                className="rounded-xl border border-[#DCEEEB] bg-[#F5FAF9] p-4"
              >
                <p className="font-bold text-[#35485E]">
                  {role.branchName || "Cabang"}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {role.branchCode || "-"}
                </p>

                <span className="mt-3 inline-block rounded-full bg-[#DCEEEB] px-3 py-1 text-xs font-semibold text-[#397F75]">
                  Admin Cabang
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            Informasi penugasan cabang belum tersedia pada data akun.
          </p>
        )}
      </div>

      {/* Statistik sementara */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Total Siswa", "Total Tutor", "Kelas Aktif", "Jadwal Hari Ini"].map(
          (item) => (
            <div
              key={item}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{item}</p>
              <p className="mt-3 text-2xl font-bold text-[#35485E]">-</p>
              <p className="mt-1 text-xs text-gray-400">
                Data belum dihubungkan
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
