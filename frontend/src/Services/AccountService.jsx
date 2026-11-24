import { apiRequest } from "./Api";

// ==========================================
// SWITCH ACCOUNT MODE
// ==========================================

export async function switchAccountMode(activeMode) {
  if (!["normal", "parent"].includes(activeMode)) {
    throw new Error("Mode akun tidak valid.");
  }

  const response = await apiRequest("/api/auth/switch-mode", {
    method: "PATCH",
    body: JSON.stringify({
      activeMode,
    }),
  });

  return response.data;
}
