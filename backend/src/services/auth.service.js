import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";

import { pool } from "../config/database.js";
import { generateSessionToken } from "../utils/session.js";
import { createSession } from "./session.service.js";

// ==========================================
// AUTH ERROR
// ==========================================

function createAuthError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// ==========================================
// SESSION METADATA
// ==========================================

function getSessionMetadata(metadata = {}) {
  return {
    ipAddress: metadata.ipAddress || null,
    userAgent: metadata.userAgent || null,
  };
}

// ==========================================
// REGISTER USER
// ==========================================

export async function registerUser(data, metadata = {}) {
  if (
    !data ||
    typeof data.email !== "string" ||
    !data.email.trim() ||
    typeof data.phone !== "string" ||
    !data.phone.trim() ||
    typeof data.password !== "string" ||
    data.password.length < 8 ||
    data.password.length > 128
  ) {
    throw createAuthError(
      "Email, nomor telepon, dan password wajib diisi. Password harus 8-128 karakter.",
    );
  }

  const email = data.email.trim().toLowerCase();
  const phone = data.phone.trim();

  const fullName =
    typeof data.fullName === "string" && data.fullName.trim()
      ? data.fullName.trim()
      : "Pengguna";

  // ==========================================
  // VALIDATE EMAIL, PHONE AND NAME
  // ==========================================

  if (email.length > 180) {
    throw createAuthError("Email maksimal 180 karakter.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createAuthError("Format email tidak valid.");
  }

  if (!/^[0-9]{10,15}$/.test(phone)) {
    throw createAuthError("Nomor telepon harus 10-15 digit.");
  }

  if (fullName.length > 150) {
    throw createAuthError("Nama maksimal 150 karakter.");
  }

  // ==========================================
  // HASH PASSWORD
  // ==========================================

  const passwordHash = await argon2.hash(data.password);

  // ==========================================
  // GENERATE EMAIL VERIFICATION CHALLENGE
  // ==========================================

  const challengeToken = randomBytes(32).toString("hex");

  const challengeHash = createHash("sha256")
    .update(challengeToken, "utf8")
    .digest("hex");

  const challengeExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ==========================================
    // CREATE INACTIVE USER
    // ==========================================

    const userResult = await client.query(
      `
        INSERT INTO users (
          email,
          phone,
          password_hash,
          full_name,
          is_active,
          email_verified_at
        )
        VALUES ($1, $2, $3, $4, FALSE, NULL)
        RETURNING id, email, phone, full_name
      `,
      [email, phone, passwordHash, fullName],
    );

    const user = userResult.rows[0];

    // ==========================================
    // GET GENERAL USER ROLE
    // ==========================================

    const roleResult = await client.query(
      `
        SELECT id
        FROM roles
        WHERE role_code = 'user'
        LIMIT 1
      `,
    );

    if (roleResult.rowCount === 0) {
      throw createAuthError("Role user belum tersedia di database.", 500);
    }

    // ==========================================
    // ASSIGN GENERAL USER ROLE
    // ==========================================

    await client.query(
      `
        INSERT INTO user_branch_roles (
          user_id,
          role_id,
          branch_id,
          assigned_by
        )
        VALUES ($1, $2, NULL, NULL)
      `,
      [user.id, roleResult.rows[0].id],
    );

    // ==========================================
    // SAVE EMAIL VERIFICATION CHALLENGE
    // ==========================================

    await client.query(
      `
        INSERT INTO email_verification_challenges (
          user_id,
          challenge_hash,
          expires_at
        )
        VALUES ($1, $2, $3)
      `,
      [user.id, challengeHash, challengeExpiresAt],
    );

    await client.query("COMMIT");

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.full_name,
      },
      challengeToken,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    if (error.code === "23505") {
      throw createAuthError("Email atau nomor telepon sudah terdaftar.", 409);
    }

    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// GET EMAIL VERIFICATION CHALLENGE USER
// ==========================================

export async function getEmailVerificationChallengeUserId(challengeToken) {
  if (
    typeof challengeToken !== "string" ||
    !/^[a-f0-9]{64}$/i.test(challengeToken)
  ) {
    throw createAuthError(
      "Sesi verifikasi tidak valid atau sudah kedaluwarsa.",
      401,
    );
  }

  const challengeHash = createHash("sha256")
    .update(challengeToken, "utf8")
    .digest("hex");

  const result = await pool.query(
    `
      SELECT
        evc.user_id
      FROM email_verification_challenges evc
      INNER JOIN users u
        ON u.id = evc.user_id
      WHERE evc.challenge_hash = $1
        AND evc.expires_at > NOW()
        AND u.is_active = FALSE
        AND u.email_verified_at IS NULL
      LIMIT 1
    `,
    [challengeHash],
  );

  if (result.rowCount === 0) {
    throw createAuthError(
      "Sesi verifikasi tidak valid atau sudah kedaluwarsa.",
      401,
    );
  }

  return result.rows[0].user_id;
}

// ==========================================
// DELETE EMAIL VERIFICATION CHALLENGE
// ==========================================

export async function deleteEmailVerificationChallenge(userId, challengeToken) {
  if (
    typeof challengeToken !== "string" ||
    !/^[a-f0-9]{64}$/i.test(challengeToken)
  ) {
    throw createAuthError("Sesi verifikasi tidak valid.", 401);
  }

  const challengeHash = createHash("sha256")
    .update(challengeToken, "utf8")
    .digest("hex");

  const result = await pool.query(
    `
      DELETE FROM email_verification_challenges
      WHERE user_id = $1
        AND challenge_hash = $2
      RETURNING id
    `,
    [userId, challengeHash],
  );

  if (result.rowCount === 0) {
    throw createAuthError("Sesi verifikasi tidak valid.", 401);
  }
}

// ==========================================
// LOGIN USER
// ==========================================

export async function loginUser(identifier, password, metadata = {}) {
  if (
    typeof identifier !== "string" ||
    !identifier.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    throw createAuthError("Email/nomor telepon dan password wajib diisi.");
  }

  const client = await pool.connect();

  try {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    // ==========================================
    // FIND USER
    // ==========================================

    const userResult = await client.query(
      `
        SELECT
          u.id,
          u.email,
          u.phone,
          u.full_name,
u.password_hash,
u.email_verified_at,
u.is_active,
u.active_mode,
          EXISTS (
            SELECT 1
            FROM user_branch_roles ubr
            INNER JOIN roles r
              ON r.id = ubr.role_id
            WHERE ubr.user_id = u.id
              AND r.role_code IN ('user', 'parent')
              AND ubr.is_active = TRUE
          ) AS is_public_user

        FROM users u
        WHERE (
          LOWER(u.email) = $1
          OR u.phone = $2
        )
        LIMIT 1
      `,
      [normalizedIdentifier, identifier.trim()],
    );

    if (userResult.rowCount === 0) {
      throw createAuthError("Email atau password salah.", 401);
    }

    const user = userResult.rows[0];

    // ==========================================
    // CHECK ACCOUNT STATUS
    // ==========================================

    if (!user.is_active) {
      throw createAuthError("Akun belum aktif atau sedang dinonaktifkan.", 403);
    }

    // ==========================================
    // CHECK EMAIL VERIFICATION
    // PUBLIC USER AND PARENT
    // ==========================================

    if (user.is_public_user && !user.email_verified_at) {
      throw createAuthError("Email harus diverifikasi sebelum login.", 403);
    }

    // ==========================================
    // VERIFY PASSWORD
    // ==========================================

    const passwordValid = await argon2.verify(user.password_hash, password);

    if (!passwordValid) {
      throw createAuthError("Email atau password salah.", 401);
    }

    // ==========================================
    // CREATE SESSION
    // ==========================================

    await client.query("BEGIN");

    await client.query(
      `
        UPDATE users
        SET last_login_at = NOW()
        WHERE id = $1
      `,
      [user.id],
    );

    const sessionToken = generateSessionToken();

    const session = await createSession(
      user.id,
      sessionToken,
      getSessionMetadata(metadata),
      client,
    );

    await client.query("COMMIT");

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.full_name,
        activeMode: user.active_mode || "normal",
      },
      sessionToken,
      session,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// ACTIVATE RECRUITMENT ACCOUNT
// ==========================================

export async function activateUserAccount(token, password) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    throw createAuthError(
      "Tautan aktivasi tidak valid atau sudah kedaluwarsa.",
      400,
    );
  }

  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    throw createAuthError("Password harus terdiri dari 8 sampai 128 karakter.");
  }

  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");

  // Hash password sebelum transaksi.
  const passwordHash = await argon2.hash(password);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenResult = await client.query(
      `
        SELECT
          prt.id AS token_id,
          prt.user_id,
          prt.expires_at,
          prt.used_at,
          u.is_active
        FROM password_reset_tokens prt
        INNER JOIN users u
          ON u.id = prt.user_id
        WHERE prt.token_hash = $1
          AND prt.token_type = 'password_activation'
        FOR UPDATE OF prt, u
      `,
      [tokenHash],
    );

    if (tokenResult.rowCount === 0) {
      throw createAuthError(
        "Tautan aktivasi tidak valid atau sudah kedaluwarsa.",
        400,
      );
    }

    const activation = tokenResult.rows[0];

    if (
      activation.used_at ||
      new Date(activation.expires_at).getTime() <= Date.now() ||
      activation.is_active
    ) {
      throw createAuthError(
        "Tautan aktivasi tidak valid atau sudah kedaluwarsa.",
        400,
      );
    }

    // ==========================================
    // UPDATE USER PASSWORD AND STATUS
    // ==========================================

    await client.query(
      `
        UPDATE users
        SET
          password_hash = $1,
          is_active = TRUE,
          updated_at = NOW()
        WHERE id = $2
      `,
      [passwordHash, activation.user_id],
    );

    // ==========================================
    // ACTIVATE STAFF / TUTOR BRANCH ROLES
    // ==========================================

    await client.query(
      `
        UPDATE user_branch_roles ubr
        SET is_active = EXISTS (
          SELECT 1
          FROM roles r
          WHERE r.id = ubr.role_id
            AND (
              (
                r.role_code = 'tutor'
                AND EXISTS (
                  SELECT 1
                  FROM tutor_profiles tp
                  INNER JOIN tutor_branch_assignments tba
                    ON tba.tutor_id = tp.id
                  WHERE tp.user_id = ubr.user_id
                    AND tp.employment_status = 'active'
                    AND tba.branch_id = ubr.branch_id
                    AND tba.assigned_from <= CURRENT_DATE
                    AND (
                      tba.assigned_until IS NULL
                      OR tba.assigned_until >= CURRENT_DATE
                    )
                )
              )
              OR
              (
                r.role_code = 'staff'
                AND EXISTS (
                  SELECT 1
                  FROM staff_profiles sp
                  INNER JOIN staff_branch_assignments sba
                    ON sba.staff_id = sp.id
                  WHERE sp.user_id = ubr.user_id
                    AND sp.employment_status = 'active'
                    AND sba.branch_id = ubr.branch_id
                    AND sba.assigned_from <= CURRENT_DATE
                    AND (
                      sba.assigned_until IS NULL
                      OR sba.assigned_until >= CURRENT_DATE
                    )
                )
              )
            )
        )
        WHERE ubr.user_id = $1
          AND ubr.branch_id IS NOT NULL
          AND ubr.role_id IN (
            SELECT id
            FROM roles
            WHERE role_code IN ('staff', 'tutor')
          )
      `,
      [activation.user_id],
    );

    // ==========================================
    // MARK ACTIVATION TOKEN AS USED
    // ==========================================

    await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE id = $1
          AND used_at IS NULL
      `,
      [activation.token_id],
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: "Aktivasi akun berhasil. Silakan login.",
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
