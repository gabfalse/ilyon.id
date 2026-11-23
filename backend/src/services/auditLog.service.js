import { pool } from "../config/database.js";

// ==========================================
// CREATE AUDIT LOG
// ==========================================

export async function createAuditLog(data, db = pool) {
  const {
    userId,
    branchId = null,
    action,
    entityTable = null,
    entityId = null,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
  } = data;

  const query = `
    INSERT INTO audit_logs (
      user_id,
      branch_id,
      action,
      entity_table,
      entity_id,
      old_values,
      new_values,
      ip_address,
      user_agent
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6::jsonb, $7::jsonb, $8, $9
    )
    RETURNING id, created_at
  `;

  const values = [
    userId,
    branchId,
    action,
    entityTable,
    entityId,
    oldValues === null ? null : JSON.stringify(oldValues),
    newValues === null ? null : JSON.stringify(newValues),
    ipAddress,
    userAgent,
  ];

  const result = await db.query(query, values);

  return result.rows[0];
}
