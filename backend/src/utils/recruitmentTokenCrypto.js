import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  const encodedKey = process.env.RECRUITMENT_TOKEN_ENCRYPTION_KEY;

  if (!encodedKey) {
    throw new Error("RECRUITMENT_TOKEN_ENCRYPTION_KEY belum dikonfigurasi.");
  }

  const key = Buffer.from(encodedKey, "base64");

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      "RECRUITMENT_TOKEN_ENCRYPTION_KEY harus berukuran 32 byte.",
    );
  }

  return key;
}

export function encryptTrackingToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Token pelacakan tidak valid.");
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptTrackingToken(encryptedToken) {
  if (!encryptedToken || typeof encryptedToken !== "string") {
    throw new Error("Token terenkripsi tidak tersedia.");
  }

  const parts = encryptedToken.split(":");

  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Format token terenkripsi tidak valid.");
  }

  const [, ivEncoded, authTagEncoded, encryptedEncoded] = parts;

  const iv = Buffer.from(ivEncoded, "base64url");
  const authTag = Buffer.from(authTagEncoded, "base64url");
  const encrypted = Buffer.from(encryptedEncoded, "base64url");

  if (iv.length !== IV_LENGTH || authTag.length !== 16) {
    throw new Error("Data enkripsi token tidak valid.");
  }

  const key = getEncryptionKey();

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
