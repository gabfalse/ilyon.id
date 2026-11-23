import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import { setActiveBranchId } from "../Services/Api";

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL;

// ==========================================
// PARSE API RESPONSE
// ==========================================

async function parseResponse(response) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Terjadi kesalahan pada server.");
  }

  return result;
}

// ==========================================
// GET CSRF TOKEN
// ==========================================

async function getCsrfToken() {
  const response = await fetch(`${API_URL}/api/auth/csrf`, {
    method: "GET",
    credentials: "include",
  });

  const result = await parseResponse(response);
  const csrfToken = result.data?.csrfToken;

  if (!csrfToken) {
    throw new Error("CSRF token tidak ditemukan.");
  }

  return csrfToken;
}

// ==========================================
// NORMALIZE USER
// ==========================================

function normalizeUser(user) {
  if (!user) return null;

  return {
    ...user,
    roles: Array.isArray(user.roles) ? user.roles : [],
  };
}

// ==========================================
// GET ASSIGNED BRANCHES
// ==========================================

function getAssignedBranches(user) {
  if (!user) return [];

  const branchMap = new Map();

  user.roles
    ?.filter((role) => role.roleCode === "branch_admin")
    .forEach((role) => {
      if (role.branchId) {
        branchMap.set(role.branchId, {
          id: role.branchId,
          code: role.branchCode,
          name: role.branchName,
        });
      }
    });

  return [...branchMap.values()];
}

// ==========================================
// AUTH PROVIDER
// ==========================================

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeBranchId, setActiveBranchIdState] = useState(null);

  // Menyimpan cabang aktif tanpa memicu render tambahan.
  const activeBranchIdRef = useRef(null);

  // ==========================================
  // CHANGE ACTIVE BRANCH
  // ==========================================

  const changeActiveBranch = useCallback(
    (branchId) => {
      const branches = getAssignedBranches(user);

      const isSuperAdmin = user?.roles?.some(
        (role) => role.roleCode === "super_admin",
      );

      if (isSuperAdmin) {
        throw new Error(
          "Pemilihan cabang operasional Super Admin belum diaktifkan.",
        );
      }

      if (!branches.length) {
        throw new Error("Pengguna tidak memiliki akses admin cabang.");
      }

      const selectedBranch = branches.find((branch) => branch.id === branchId);

      if (!selectedBranch) {
        throw new Error("Cabang tidak termasuk penugasan Anda.");
      }

      activeBranchIdRef.current = selectedBranch.id;

      setActiveBranchIdState(selectedBranch.id);
      setActiveBranchId(selectedBranch.id);

      return selectedBranch;
    },
    [user],
  );

  // ==========================================
  // CLEAR ACTIVE BRANCH
  // ==========================================

  const clearActiveBranch = useCallback(() => {
    activeBranchIdRef.current = null;

    setActiveBranchIdState(null);
    setActiveBranchId(null);
  }, []);

  // ==========================================
  // REFRESH USER SESSION
  // ==========================================

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: "GET",
        credentials: "include",
      });

      if (response.status === 401) {
        setUser(null);
        clearActiveBranch();

        return null;
      }

      const result = await parseResponse(response);

      const currentUser = normalizeUser(
        result.data?.user ?? result.data ?? result.user ?? null,
      );

      setUser(currentUser);

      const branches = getAssignedBranches(currentUser);

      const previousBranchIsValid = branches.some(
        (branch) => branch.id === activeBranchIdRef.current,
      );

      // Admin dengan satu cabang:
      // Cabang aktif ditentukan otomatis.
      if (branches.length === 1) {
        const branchId = branches[0].id;

        activeBranchIdRef.current = branchId;

        setActiveBranchIdState(branchId);
        setActiveBranchId(branchId);
      }

      // Admin dengan beberapa cabang:
      // Pertahankan pilihan sebelumnya jika masih valid.
      else if (branches.length > 1) {
        if (previousBranchIsValid) {
          setActiveBranchId(activeBranchIdRef.current);
        } else {
          clearActiveBranch();
        }
      }

      // Pengguna tanpa role branch_admin.
      else {
        clearActiveBranch();
      }

      return currentUser;
    } catch (error) {
      setUser(null);
      clearActiveBranch();

      throw error;
    }
  }, [clearActiveBranch]);

  // ==========================================
  // LOGIN
  // ==========================================

  const login = useCallback(
    async (credentials) => {
      const csrfToken = await getCsrfToken();

      const identifier =
        credentials.identifier ?? credentials.email ?? credentials.phone;

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          identifier,
          password: credentials.password,
        }),
      });

      const result = await parseResponse(response);

      clearActiveBranch();

      const loggedInUser = await refreshUser();

      return loggedInUser ?? normalizeUser(result.data?.user);
    },
    [refreshUser, clearActiveBranch],
  );

  // ==========================================
  // REGISTER PUBLIC USER
  // ==========================================

  const register = useCallback(async (formData) => {
    const csrfToken = await getCsrfToken();

    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
      }),
    });

    const result = await parseResponse(response);

    // Akun belum aktif sebelum OTP diverifikasi.
    return result.data ?? result;
  }, []);

  // ==========================================
  // VERIFY EMAIL OTP
  // ==========================================

  const verifyEmailOtp = useCallback(async (otp) => {
    const csrfToken = await getCsrfToken();

    const response = await fetch(`${API_URL}/api/auth/verify-email`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ otp }),
    });

    return await parseResponse(response);
  }, []);

  // ==========================================
  // RESEND EMAIL OTP
  // ==========================================

  const resendEmailOtp = useCallback(async () => {
    const csrfToken = await getCsrfToken();

    const response = await fetch(`${API_URL}/api/auth/resend-email-otp`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({}),
    });

    return await parseResponse(response);
  }, []);

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = useCallback(async () => {
    const csrfToken = await getCsrfToken();

    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
    });

    await parseResponse(response);

    setUser(null);
    clearActiveBranch();
  }, [clearActiveBranch]);

  // ==========================================
  // CHECK AUTH ON APP START
  // ==========================================

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        await refreshUser();
      } catch (error) {
        console.error("Gagal memeriksa session:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [refreshUser]);

  // ==========================================
  // ROLE CHECK
  // ==========================================

  const hasRole = useCallback(
    (roleCode) => {
      return user?.roles?.some((role) => role.roleCode === roleCode) ?? false;
    },
    [user],
  );

  const hasAnyRole = useCallback(
    (roleCodes = []) => {
      return (
        user?.roles?.some((role) => roleCodes.includes(role.roleCode)) ?? false
      );
    },
    [user],
  );

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),

    activeBranchId,
    assignedBranches: getAssignedBranches(user),
    changeActiveBranch,

    login,
    register,
    verifyEmailOtp,
    resendEmailOtp,
    logout,
    refreshUser,

    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ==========================================
// AUTH HOOK
// ==========================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider.");
  }

  return context;
}
