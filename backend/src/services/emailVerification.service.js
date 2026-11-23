import {
  randomInt,
  createHmac,
  createHash,
  timingSafeEqual,
} from "node:crypto";

import { pool } from "../config/database.js";
import { sendEmail } from "./email.service.js";

// ==========================================
// CONFIGURATION
// ==========================================

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

// ==========================================
// HELPERS
// ==========================================

function createVerificationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getOtpSecret() {
  const secret = process.env.EMAIL_OTP_SECRET;

  if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) {
    throw createVerificationError(
      "Konfigurasi EMAIL_OTP_SECRET belum valid.",
      500,
    );
  }

  return secret;
}

function hashOtp(otp) {
  return createHmac("sha256", getOtpSecret()).update(otp, "utf8").digest("hex");
}

function compareOtpHash(storedHash, submittedHash) {
  if (
    typeof storedHash !== "string" ||
    typeof submittedHash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(storedHash) ||
    !/^[a-f0-9]{64}$/i.test(submittedHash)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(storedHash, "hex"),
    Buffer.from(submittedHash, "hex"),
  );
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function hashDeviceToken(deviceToken) {
  if (
    typeof deviceToken !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(deviceToken)
  ) {
    throw createVerificationError("Identitas perangkat tidak valid.", 401);
  }

  return createHash("sha256").update(deviceToken, "utf8").digest("hex");
}

// ==========================================
// GENERATE AND SEND OTP
// ==========================================

export async function sendEmailVerification(userId) {
  const client = await pool.connect();

  let email;
  let fullName;
  let otp;
  let tokenHash;

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        SELECT
          id,
          email,
          full_name,
          email_verified_at,
          is_active
        FROM users
        WHERE id = $1
        FOR UPDATE
      `,
      [userId],
    );

    if (userResult.rowCount === 0) {
      throw createVerificationError("Akun tidak ditemukan.", 404);
    }

    const user = userResult.rows[0];

    if (!user.email) {
      throw createVerificationError("Akun belum memiliki email.");
    }

    if (user.email_verified_at || user.is_active) {
      throw createVerificationError(
        "Akun sudah aktif atau email sudah diverifikasi.",
      );
    }

    // ==========================================
    // CHECK RESEND COOLDOWN
    // ==========================================

    const cooldownResult = await client.query(
      `
        SELECT created_at
        FROM email_verification_tokens
        WHERE user_id = $1
          AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId],
    );

    if (cooldownResult.rowCount > 0) {
      const elapsed =
        (Date.now() - new Date(cooldownResult.rows[0].created_at).getTime()) /
        1000;

      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        throw createVerificationError(
          "Silakan tunggu sebelum meminta OTP baru.",
          429,
        );
      }
    }

    // ==========================================
    // INVALIDATE PREVIOUS OTP
    // ==========================================

    await client.query(
      `
        UPDATE email_verification_tokens
        SET used_at = NOW()
        WHERE user_id = $1
          AND used_at IS NULL
      `,
      [userId],
    );

    // ==========================================
    // GENERATE OTP
    // ==========================================

    otp = String(randomInt(0, 1000000)).padStart(6, "0");

    tokenHash = hashOtp(otp);

    await client.query(
      `
        INSERT INTO email_verification_tokens (
          user_id,
          token_hash,
          expires_at
        )
        VALUES (
          $1,
          $2,
          NOW() + ($3 * INTERVAL '1 minute')
        )
      `,
      [userId, tokenHash, OTP_EXPIRY_MINUTES],
    );

    email = user.email;
    fullName = user.full_name;

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  // ==========================================
  // SEND EMAIL
  // ==========================================

  try {
    const safeName = escapeHtml(fullName);
    const safeOtp = escapeHtml(otp);

    await sendEmail({
      to: email,
      subject: "Kode Verifikasi Email - Ilyon Academy",

      text: `
Halo ${fullName},

Kode verifikasi email Ilyon Academy Anda:

${otp}

Kode ini berlaku selama ${OTP_EXPIRY_MINUTES} menit.

Jangan bagikan kode ini kepada siapa pun.

Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.
      `.trim(),

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Verifikasi Email Ilyon Academy</h2>

          <p>Halo ${safeName},</p>

          <p>
            Gunakan kode berikut untuk memverifikasi email Anda:
          </p>

          <h1 style="letter-spacing: 8px;">
            ${safeOtp}
          </h1>

          <p>
            Kode berlaku selama ${OTP_EXPIRY_MINUTES} menit.
          </p>

          <p>
            Jangan bagikan kode ini kepada siapa pun.
          </p>
        </div>
      `,
    });
  } catch (error) {
    await pool
      .query(
        `
          DELETE FROM email_verification_tokens
          WHERE user_id = $1
            AND token_hash = $2
            AND used_at IS NULL
        `,
        [userId, tokenHash],
      )
      .catch(() => {});

    throw createVerificationError(
      "Email verifikasi gagal dikirim. Silakan coba kembali.",
      502,
    );
  }

  return {
    success: true,
    message: "Kode verifikasi berhasil dikirim.",
  };
}

// ==========================================
// VERIFY EMAIL OTP
// ==========================================

export async function verifyEmailOtp(userId, otp, deviceToken) {
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    throw createVerificationError("Kode OTP tidak valid.");
  }

  const deviceTokenHash = hashDeviceToken(deviceToken);
  const submittedHash = hashOtp(otp);

  const client = await pool.connect();

  let verificationError = null;

  try {
    await client.query("BEGIN");

    // ==========================================
    // GET USER AND ROLE
    // ==========================================

    const userResult = await client.query(
      `
        SELECT
          u.id,
          u.email_verified_at,
          u.is_active,

          EXISTS (
            SELECT 1
            FROM user_branch_roles ubr
            INNER JOIN roles r
              ON r.id = ubr.role_id
            WHERE ubr.user_id = u.id
              AND r.role_code IN ('user', 'parent')
              AND ubr.is_active = TRUE
          ) AS is_public_user,

          EXISTS (
            SELECT 1
            FROM user_branch_roles ubr
            INNER JOIN roles r
              ON r.id = ubr.role_id
            WHERE ubr.user_id = u.id
              AND r.role_code = 'parent'
              AND ubr.is_active = TRUE
          ) AS is_parent

        FROM users u
        WHERE u.id = $1
        FOR UPDATE
      `,
      [userId],
    );

    if (userResult.rowCount === 0) {
      throw createVerificationError("Akun tidak ditemukan.", 404);
    }

    const user = userResult.rows[0];

    if (!user.is_public_user) {
      throw createVerificationError(
        "Akun ini tidak menggunakan proses verifikasi email publik.",
        403,
      );
    }

    if (user.email_verified_at || user.is_active) {
      throw createVerificationError("Email sudah diverifikasi.");
    }

    // ==========================================
    // GET ACTIVE OTP
    // ==========================================

    const tokenResult = await client.query(
      `
        SELECT
          id,
          token_hash,
          attempts,
          expires_at
        FROM email_verification_tokens
        WHERE user_id = $1
          AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [userId],
    );

    if (tokenResult.rowCount === 0) {
      throw createVerificationError(
        "OTP tidak ditemukan atau sudah digunakan.",
      );
    }

    const token = tokenResult.rows[0];

    // ==========================================
    // CHECK OTP EXPIRY
    // ==========================================

    if (new Date(token.expires_at).getTime() <= Date.now()) {
      await client.query(
        `
          UPDATE email_verification_tokens
          SET used_at = NOW()
          WHERE id = $1
        `,
        [token.id],
      );

      verificationError = createVerificationError(
        "OTP sudah kedaluwarsa. Silakan minta kode baru.",
      );
    }

    // ==========================================
    // CHECK MAXIMUM ATTEMPTS
    // ==========================================
    else if (token.attempts >= MAX_ATTEMPTS) {
      await client.query(
        `
          UPDATE email_verification_tokens
          SET used_at = NOW()
          WHERE id = $1
        `,
        [token.id],
      );

      verificationError = createVerificationError(
        "Batas percobaan OTP telah tercapai. Silakan minta kode baru.",
      );
    }

    // ==========================================
    // VERIFY OTP HASH
    // ==========================================
    else if (!compareOtpHash(token.token_hash, submittedHash)) {
      await client.query(
        `
          UPDATE email_verification_tokens
          SET
            attempts = attempts + 1,
            used_at = CASE
              WHEN attempts + 1 >= $2 THEN NOW()
              ELSE used_at
            END
          WHERE id = $1
        `,
        [token.id, MAX_ATTEMPTS],
      );

      verificationError = createVerificationError("Kode OTP salah.");
    }

    // ==========================================
    // OTP VALID
    // ==========================================
    else {
      // ==========================================
      // DEVICE LIMIT FOR PARENT ACCOUNTS ONLY
      // ==========================================

      if (user.is_parent) {
        // Register device.
        await client.query(
          `
            INSERT INTO registration_devices (
              device_token_hash
            )
            VALUES ($1)
            ON CONFLICT (device_token_hash)
            DO NOTHING
          `,
          [deviceTokenHash],
        );

        // Lock device.
        const deviceResult = await client.query(
          `
            SELECT id
            FROM registration_devices
            WHERE device_token_hash = $1
            FOR UPDATE
          `,
          [deviceTokenHash],
        );

        if (deviceResult.rowCount === 0) {
          throw createVerificationError(
            "Identitas perangkat gagal diproses.",
            500,
          );
        }

        const deviceId = deviceResult.rows[0].id;

        // ==========================================
        // CHECK REGISTRATION LIMIT
        // ==========================================

        const countResult = await client.query(
          `
            SELECT COUNT(*)::INTEGER AS total
            FROM parent_registration_device_logs
            WHERE device_id = $1
              AND registered_at >= NOW() - INTERVAL '30 days'
          `,
          [deviceId],
        );

        const registrationCount = countResult.rows[0].total;

        if (registrationCount >= 3) {
          throw createVerificationError(
            "Perangkat ini sudah mencapai batas 3 registrasi akun orang tua dalam 30 hari terakhir.",
            429,
          );
        }

        // ==========================================
        // RECORD PARENT REGISTRATION
        // ==========================================

        await client.query(
          `
            INSERT INTO parent_registration_device_logs (
              device_id,
              user_id,
              registered_at
            )
            VALUES ($1, $2, NOW())
          `,
          [deviceId, userId],
        );

        await client.query(
          `
            UPDATE registration_devices
            SET last_seen_at = NOW()
            WHERE id = $1
          `,
          [deviceId],
        );
      }

      // ==========================================
      // ACTIVATE PUBLIC ACCOUNT
      // ==========================================

      await client.query(
        `
          UPDATE users
          SET
            email_verified_at = NOW(),
            is_active = TRUE,
            updated_at = NOW()
          WHERE id = $1
        `,
        [userId],
      );

      // ==========================================
      // MARK OTP AS USED
      // ==========================================

      await client.query(
        `
          UPDATE email_verification_tokens
          SET used_at = NOW()
          WHERE id = $1
        `,
        [token.id],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  if (verificationError) {
    throw verificationError;
  }

  return {
    success: true,
    message: "Email berhasil diverifikasi.",
  };
}
