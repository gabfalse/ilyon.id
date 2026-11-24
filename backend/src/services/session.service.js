import { pool } from "../config/database.js";
import { hashSessionToken } from "../utils/session.js";
import { AUTH_CONFIG } from "../config/auth.js";

// ==========================================
// MEMBUAT SESSION BARU
// ==========================================

export async function createSession(userId, token, metadata = {}, db = pool) {
  const tokenHash = hashSessionToken(token);

  const expiresAt = new Date(Date.now() + AUTH_CONFIG.sessionDuration);

  const query = `
    INSERT INTO user_sessions (
      user_id,
      session_token_hash,
      ip_address,
      user_agent,
      expires_at
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, expires_at
  `;

  const values = [
    userId,
    tokenHash,
    metadata.ipAddress || null,
    metadata.userAgent || null,
    expiresAt,
  ];

  const result = await db.query(query, values);

  return result.rows[0];
}

// ==========================================
// MEMERIKSA SESSION DAN MENGAMBIL DATA USER
// TERMASUK ROLE, CABANG, DAN MODE AKTIF
// ==========================================

export async function getSessionByToken(token) {
  const tokenHash = hashSessionToken(token);

  const query = `
    SELECT
      s.id AS session_id,
      s.expires_at,

      u.id AS user_id,
      u.email,
      u.phone,
      u.full_name,
      u.is_active,
      u.active_mode,

      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'roleCode', r.role_code,
            'roleName', r.role_name,
            'branchId', b.id,
            'branchCode', b.branch_code,
            'branchName', b.branch_name
          )
          ORDER BY r.role_code, b.branch_name
        ) FILTER (WHERE r.id IS NOT NULL),
        '[]'::jsonb
      ) AS roles

    FROM user_sessions s

    INNER JOIN users u
      ON u.id = s.user_id

    LEFT JOIN user_branch_roles ubr
      ON ubr.user_id = u.id
      AND ubr.is_active = TRUE
      AND (
        ubr.branch_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM branches active_branch
          WHERE active_branch.id = ubr.branch_id
            AND active_branch.is_active = TRUE
        )
      )

    LEFT JOIN roles r
      ON r.id = ubr.role_id

    LEFT JOIN branches b
      ON b.id = ubr.branch_id

    WHERE s.session_token_hash = $1
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
      AND u.is_active = TRUE

    GROUP BY
      s.id,
      u.id

    LIMIT 1
  `;

  const result = await pool.query(query, [tokenHash]);

  return result.rows[0] || null;
}

// ==========================================
// MENGHAPUS AKSES SESSION (REVOKE)
// ==========================================

export async function revokeSession(token) {
  const tokenHash = hashSessionToken(token);

  const query = `
    UPDATE user_sessions
    SET revoked_at = NOW()
    WHERE session_token_hash = $1
      AND revoked_at IS NULL
    RETURNING id
  `;

  const result = await pool.query(query, [tokenHash]);

  return result.rowCount > 0;
}
