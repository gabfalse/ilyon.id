import { randomBytes, createHash } from "node:crypto";

// Membuat token session acak
export function generateSessionToken() {
  return randomBytes(32).toString("hex");
}

// Mengubah token menjadi SHA-256 hash
export function hashSessionToken(token) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}