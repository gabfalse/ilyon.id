import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/AuthContext";

const ROLE_CONFIG = {
  super_admin: {
    label: "Admin Pusat",
    initial: "AP",
    menu: [
      { label: "Dashboard", path: "/admin/dashboard", icon: "⌂" },
      { label: "Manajemen Cabang", path: "/admin/branches", icon: "▦" },
      { label: "Data Siswa", path: "/admin/students", icon: "♙" },
      { label: "Manajemen Enrollment", path: "/admin/enrollments", icon: "▤" },
      {
        label: "Manajemen Kontrak",
        path: "/admin/enrollment-contracts",
        icon: "▤",
      },
      // { label: "Data Orang Tua", path: "/admin/parents", icon: "♧" },
      {
        label: "Konfirmasi Pengajuan Anak",
        path: "/admin/parent-student-claims",
        icon: "✓",
      },
      { label: "Data Tutor", path: "/admin/tutors", icon: "♧" },
      { label: "Manajemen Staff", path: "/admin/staff", icon: "♙" },
      { label: "Rekrutmen", path: "/admin/recruitment", icon: "♧" },
      { label: "Manajemen Pengguna", path: "/admin/users", icon: "♙" },
      { label: "Program Belajar", path: "/admin/programs", icon: "▤" },
      { label: "Mata Pelajaran", path: "/admin/subjects", icon: "▦" },
      { label: "Keuangan", disabled: true, icon: "◎" },
      { label: "Laporan", disabled: true, icon: "▥" },
      { label: "Pengaturan", disabled: true, icon: "⚙" },
    ],
  },

  branch_admin: {
    label: "Admin Cabang",
    initial: "AC",
    menu: [
      { label: "Dashboard", path: "/branch/dashboard", icon: "⌂" },
      {
        label: "Konfirmasi Pengajuan Anak",
        path: "/branch/parent-student-claims",
        icon: "✓",
      },
      { label: "Data Siswa", disabled: true, icon: "♙" },
      { label: "Data Tutor", disabled: true, icon: "♧" },
      { label: "Program Belajar", path: "/branch/programs", icon: "▤" },
      { label: "Mata Pelajaran", path: "/branch/subjects", icon: "▦" },
      { label: "Kelas & Jadwal", disabled: true, icon: "▦" },
      { label: "Absensi", disabled: true, icon: "✓" },
      { label: "Keuangan", disabled: true, icon: "◎" },
      { label: "Laporan", disabled: true, icon: "▥" },
    ],
  },

  tutor: {
    label: "Tutor",
    initial: "T",
    menu: [
      { label: "Dashboard", path: "/tutor/dashboard", icon: "⌂" },
      { label: "Jadwal Mengajar", disabled: true, icon: "▦" },
      { label: "Kelas Saya", disabled: true, icon: "♙" },
      { label: "Absensi", disabled: true, icon: "✓" },
      { label: "Catatan Belajar", disabled: true, icon: "▤" },
    ],
  },

  user: {
    label: "Pengguna",
    initial: "U",
    menu: [
      { label: "Dashboard", path: "/user/dashboard", icon: "⌂" },
      {
        label: "Pengaturan Akun",
        path: "/user/pengaturan-akun",
        icon: "⚙",
      },
    ],
  },

  parent: {
    label: "Orang Tua",
    initial: "OT",
    menu: [
      { label: "Dashboard", path: "/parent/dashboard", icon: "⌂" },
      { label: "Data Anak", path: "/parent/data-anak", icon: "♙" },
      // { label: "Jadwal Belajar", disabled: true, icon: "▦" },
      // { label: "Perkembangan Anak", disabled: true, icon: "▥" },
      // { label: "Tagihan", disabled: true, icon: "◎" },
      // { label: "Riwayat Pembayaran", disabled: true, icon: "▤" },
      { label: "Recruitment", path: "/recruitment", icon: "♧" },
      {
        label: "Pengaturan Akun",
        path: "/parent/pengaturan-akun",
        icon: "⚙",
      },
    ],
  },
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const userRoles = user?.roles ?? [];

  const hasRole = (role) => userRoles.some((item) => item.roleCode === role);

  // Role khusus tetap diprioritaskan.
  const privilegedRole = ["super_admin", "branch_admin", "tutor"].find(hasRole);

  // Role user dan parent mengikuti mode akun aktif.
  const publicRole =
    hasRole("user") || hasRole("parent")
      ? user?.activeMode === "parent"
        ? "parent"
        : "user"
      : null;

  const roleCode = privilegedRole || publicRole;

  const config = ROLE_CONFIG[roleCode];

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCFAF5] p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#35485E]">
            Akses Tidak Tersedia
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Role akun belum memiliki konfigurasi dashboard.
          </p>
          <button
            onClick={() => navigate("/unauthorized", { replace: true })}
            className="mt-4 rounded-xl bg-[#70B8AE] px-5 py-2 text-white"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      setLogoutError("");

      await logout();

      navigate("/auth/login", { replace: true });
    } catch (error) {
      setLogoutError(error.message || "Gagal logout.");
    } finally {
      setLoggingOut(false);
    }
  };

  const userName = user?.fullName || "Pengguna Ilyon";
  const userEmail = user?.email || user?.phone || "-";

  return (
    <div className="min-h-screen bg-[#FCFAF5] text-[#35485E]">
      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[260px]
          flex-col border-r border-gray-100 bg-white
          transition-transform duration-300
          lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between border-b border-gray-100 px-6">
          <div className="flex items-center gap-3">
            <img
              src="/ilyon.png"
              alt="Ilyon Academy"
              className="h-11 w-11 object-contain"
            />

            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-[#529F93]">
                Ilyon<span className="text-[#F2BD4B]"> Academy</span>
              </h1>

              <p className="text-xs text-gray-400">Academy Management System</p>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Tutup sidebar"
          >
            ✕
          </button>
        </div>

        {/* Role */}
        <div className="mx-4 mt-5 rounded-xl bg-[#EAF5F3] p-3">
          <p className="text-xs text-[#529F93]">Anda masuk sebagai</p>
          <p className="mt-1 font-bold text-[#35485E]">{config.label}</p>
        </div>

        {/* Menu */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            Menu Utama
          </p>

          {config.menu.map((item) => (
            <div key={item.label}>
              {item.disabled ? (
                <div
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-400"
                  title="Menu belum tersedia"
                >
                  <span className="w-5 text-center text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="ml-auto text-[10px]">Segera</span>
                </div>
              ) : (
                <NavLink
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "bg-[#70B8AE] text-white shadow-sm"
                        : "text-gray-500 hover:bg-[#F1F8F7] hover:text-[#529F93]"
                    }`
                  }
                >
                  <span className="w-5 text-center text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        {/* Profil Sidebar */}
        <div className="border-t border-gray-100 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F8E8C3] font-bold text-[#9A7DB0]">
              {config.initial}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{userName}</p>
              <p className="truncate text-xs text-gray-400">{userEmail}</p>
            </div>
          </div>

          {logoutError && (
            <p className="mb-2 text-xs text-red-500">{logoutError}</p>
          )}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 px-3 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
          >
            {loggingOut ? "Sedang keluar..." : "↪ Keluar"}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="min-h-screen lg:pl-[260px]">
        {/* Navbar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-xl hover:bg-gray-100 lg:hidden"
              aria-label="Buka sidebar"
            >
              ☰
            </button>

            <div>
              <p className="text-sm font-bold text-[#35485E]">Ilyon Academy</p>
              <p className="text-xs text-gray-400">
                Sistem Manajemen Pembelajaran
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{userName}</p>
              <p className="text-xs text-gray-400">{config.label}</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF5F3] font-bold text-[#529F93]">
              {config.initial}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
