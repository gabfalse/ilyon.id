const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL belum dikonfigurasi.");
}

// ==========================================
// ACTIVE BRANCH CONTEXT
// ==========================================

let activeBranchId = null;

export function setActiveBranchId(branchId) {
  activeBranchId =
    typeof branchId === "string" && branchId.trim() ? branchId.trim() : null;
}

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

export async function getCsrfToken() {
  const response = await fetch(`${API_URL}/api/auth/csrf`, {
    method: "GET",
    credentials: "include",
  });

  const result = await parseResponse(response);
  const token = result.data?.csrfToken;

  if (!token) {
    throw new Error("CSRF token tidak ditemukan.");
  }

  return token;
}

// ==========================================
// API REQUEST
// ==========================================

export async function apiRequest(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  const headers = {
    ...(options.headers || {}),
  };

  // Kirim konteks cabang aktif jika tersedia.
  if (activeBranchId) {
    headers["X-Active-Branch-Id"] = activeBranchId;
  } else {
    delete headers["X-Active-Branch-Id"];
  }

  const isFormData = options.body instanceof FormData;

  if (options.body && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const writeMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (writeMethods.includes(method)) {
    headers["X-CSRF-Token"] = await getCsrfToken();
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  return parseResponse(response);
}
