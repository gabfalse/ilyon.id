import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/AuthContext";

const USER_MENU = [
  {
    label: "Dashboard",
    path: "/user/dashboard",
    icon: "⌂",
  },
  {
    label: "Tentang Ilyon",
    path: "/about",
    icon: "◇",
  },
  {
    label: "Program Belajar",
    path: "/programs",
    icon: "▤",
  },
  {
    label: "Pendaftaran Siswa",
    path: "/user/student-registration",
    icon: "♙",
  },
  {
    label: "Rekrutmen",
    path: "/recruitment",
    icon: "♧",
  },
  // {
  //   label: "Status Pengajuan",
  //   path: "/recruitment/tracking",
  //   icon: "▥",
  // },
  // {
  //   label: "Profil Saya",
  //   path: "/user/profile",
  //   icon: "◎",
  // },
];

export default function UserDashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const userName = user?.fullName || "Pengguna Ilyon";
  const userEmail = user?.email || user?.phone || "-";
  const initial = userName.charAt(0).toUpperCase();

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

  return (
    <div className="min-h-screen bg-[#FCFAF5] text-[#35485E]">
      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[260px]
          flex-col border-r border-gray-100 bg-white
          transition-transform duration-300
          lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* LOGO */}
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

              <p className="text-xs text-gray-400">Academy Member Portal</p>
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

        {/* WELCOME */}
        <div className="mx-4 mt-5 rounded-xl bg-[#EAF5F3] p-3">
          <p className="text-xs text-[#529F93]">Selamat datang di</p>

          <p className="mt-1 font-bold text-[#35485E]">Ilyon Academy</p>

          <p className="mt-1 text-xs text-gray-500">Portal Pengguna</p>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            Menu Portal
          </p>

          {USER_MENU.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/user/dashboard"}
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
          ))}
        </nav>

        {/* USER PROFILE & LOGOUT */}
        <div className="border-t border-gray-100 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F8E8C3] font-bold text-[#9A7DB0]">
              {initial}
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

      {/* MAIN CONTENT */}
      <div className="min-h-screen lg:pl-[260px]">
        {/* HEADER */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-xl hover:bg-gray-100 lg:hidden"
              aria-label="Buka sidebar"
            >
              ☰
            </button>

            <div className="flex items-center gap-2">
              <img
                src="/ilyon.png"
                alt="Ilyon Academy"
                className="h-9 w-9 object-contain"
              />

              <div>
                <p className="text-sm font-bold">Ilyon Academy</p>

                <p className="text-xs text-gray-400">
                  Portal Layanan dan Pendaftaran
                </p>
              </div>
            </div>
          </div>

          {/* USER INFO */}
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{userName}</p>

              <p className="text-xs text-gray-400">Pengguna Ilyon</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF5F3] font-bold text-[#529F93]">
              {initial}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
