import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/AuthContext";
import { getDashboardPath } from "../Utils/Auth";

const ROLE_CONFIG = {
  super_admin: "Admin Pusat",
  branch_admin: "Admin Cabang",
  tutor: "Tutor",
  staff: "Staff",
  parent: "Orang Tua",
  user: "Pengguna Ilyon",
};

const ROLE_PRIORITY = [
  "super_admin",
  "branch_admin",
  "tutor",
  "staff",
  "parent",
  "user",
];

function getRoleLabel(user) {
  const roles = user?.roles || [];

  const role = ROLE_PRIORITY.find((code) =>
    roles.some((item) => item.roleCode === code),
  );

  return ROLE_CONFIG[role] || "Pengguna";
}

const navLinks = [
  { label: "Beranda", path: "/" },
  { label: "Tentang", path: "/about" },
  { label: "Program", path: "/programs" },
  // { label: "Cabang", path: "/branches" },
  // { label: "Artikel", path: "/articles" },
  { label: "Karier", path: "/recruitment" },
  { label: "Kontak", path: "/contact" },
  { label: "FAQ", path: "/faq" },
];

export default function Navbar() {
  const {
    user,
    loading,
    isAuthenticated,
    logout,
    activeBranchId,
    assignedBranches = [],
    changeActiveBranch,
  } = useAuth();

  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [branchError, setBranchError] = useState("");

  const dashboardPath = getDashboardPath(user);

  const isSuperAdmin = user?.roles?.some(
    (role) => role.roleCode === "super_admin",
  );

  const isBranchAdmin = user?.roles?.some(
    (role) => role.roleCode === "branch_admin",
  );

  const showBranchSelector =
    isBranchAdmin && !isSuperAdmin && assignedBranches.length > 1;

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const handleBranchChange = (event) => {
    const branchId = event.target.value;

    setBranchError("");

    try {
      changeActiveBranch(branchId);
    } catch (error) {
      console.error("Gagal mengganti cabang:", error);
      setBranchError(
        error.message || "Gagal mengganti cabang. Silakan coba lagi.",
      );
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      setLogoutError("");

      await logout();

      closeMobileMenu();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout gagal:", error);
      setLogoutError(error.message || "Gagal keluar. Silakan coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  };

  const linkClass = ({ isActive }) =>
    `text-sm font-bold transition-colors ${
      isActive ? "text-primary" : "text-foreground hover:text-primary"
    }`;

  const branchSelector = (
    <div className="min-w-0">
      <label
        htmlFor="active-branch-selector"
        className="mb-1 block text-xs font-bold text-muted-foreground"
      >
        Cabang aktif
      </label>

      <select
        id="active-branch-selector"
        value={activeBranchId || ""}
        onChange={handleBranchChange}
        className="w-full min-w-40 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <option value="" disabled>
          Pilih cabang
        </option>

        {assignedBranches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name || branch.code || "Cabang"}
          </option>
        ))}
      </select>

      {branchError && (
        <p className="mt-1 text-xs text-red-600">{branchError}</p>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* LOGO */}
        <Link
          to="/"
          onClick={closeMobileMenu}
          className="flex shrink-0 items-center gap-1"
        >
          <img
            src="/ilyon.png"
            alt="Ilyon Academy"
            className="h-15 w-15 mt-4 object-contain"
          />

          <div className="leading-tight">
            <h1 className="text-lg font-extrabold tracking-tight text-foreground">
              Ilyon
              <span className="text-primary"> Academy</span>
            </h1>

            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">
              LEARN • GROW • ACHIEVE
            </p>
          </div>
        </Link>

        {/* DESKTOP NAVIGATION */}
        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/"}
              className={linkClass}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* DESKTOP AUTH */}
        <div className="hidden items-center gap-3 lg:flex">
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-xl bg-muted" />
          ) : isAuthenticated ? (
            <>
              {showBranchSelector && (
                <div className="w-44">{branchSelector}</div>
              )}

              <div className="text-right">
                <p className="max-w-36 truncate text-sm font-extrabold text-foreground">
                  {user?.fullName || "Pengguna"}
                </p>

                <p className="text-xs font-semibold text-primary">
                  {getRoleLabel(user)}
                </p>
              </div>

              <Link
                to={dashboardPath}
                className="app-button-primary !px-4 !py-2 text-sm"
              >
                Dashboard
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="app-button-secondary !px-4 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? "Keluar..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="rounded-xl px-4 py-2 text-sm font-bold text-foreground transition hover:bg-muted"
              >
                Masuk
              </Link>

              <Link to="/auth/register" className="app-button-primary text-sm">
                Daftar Sekarang
              </Link>
            </>
          )}
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground transition hover:bg-muted lg:hidden"
        >
          {mobileOpen ? (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {/* MOBILE NAVIGATION */}
      {mobileOpen && (
        <div className="border-t border-border bg-white px-4 py-4 shadow-lg lg:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === "/"}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-sm font-bold transition ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 border-t border-border pt-4">
            {loading ? (
              <div className="h-10 animate-pulse rounded-xl bg-muted" />
            ) : isAuthenticated ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-muted p-3">
                  <p className="font-extrabold text-foreground">
                    {user?.fullName || "Pengguna"}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-primary">
                    {getRoleLabel(user)}
                  </p>

                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {user?.email || user?.phone}
                  </p>
                </div>

                {showBranchSelector && branchSelector}

                <Link
                  to={dashboardPath}
                  onClick={closeMobileMenu}
                  className="app-button-primary w-full"
                >
                  Buka Dashboard
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="app-button-secondary w-full disabled:opacity-60"
                >
                  {loggingOut ? "Sedang keluar..." : "Logout"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/auth/login"
                  onClick={closeMobileMenu}
                  className="app-button-secondary w-full"
                >
                  Masuk
                </Link>

                <Link
                  to="/auth/register"
                  onClick={closeMobileMenu}
                  className="app-button-primary w-full"
                >
                  Daftar Sekarang
                </Link>
              </div>
            )}

            {logoutError && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {logoutError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* DESKTOP LOGOUT ERROR */}
      {logoutError && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-sm text-red-600">
          {logoutError}
        </div>
      )}
    </header>
  );
}
