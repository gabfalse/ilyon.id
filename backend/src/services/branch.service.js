import { pool } from "../config/database.js";

const branchFields = {
  branchCode: "branch_code",
  branchName: "branch_name",
  phone: "phone",
  whatsapp: "whatsapp",
  email: "email",
  address: "address",
  city: "city",
  province: "province",
  postalCode: "postal_code",
  isHeadOffice: "is_head_office",
  openedAt: "opened_at",
};

// Mengambil seluruh cabang
export async function getAllBranches({
  search = "",
  isActive,
  page = 1,
  limit = 10,
} = {}) {
  const conditions = [];
  const values = [];
  let index = 1;

  if (search) {
    conditions.push(`
      (
        branch_name ILIKE $${index}
        OR branch_code ILIKE $${index}
        OR city ILIKE $${index}
      )
    `);
    values.push(`%${search}%`);
    index++;
  }

  if (typeof isActive === "boolean") {
    conditions.push(`is_active = $${index}`);
    values.push(isActive);
    index++;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM branches ${whereClause}`,
    values,
  );

  const dataResult = await pool.query(
    `
      SELECT
        id,
        branch_code AS "branchCode",
        branch_name AS "branchName",
        phone,
        whatsapp,
        email,
        address,
        city,
        province,
        postal_code AS "postalCode",
        is_head_office AS "isHeadOffice",
        is_active AS "isActive",
        opened_at AS "openedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM branches
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${index}
      OFFSET $${index + 1}
    `,
    [...values, limit, offset],
  );

  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total: Number(countResult.rows[0].count),
      totalPages: Math.max(
        1,
        Math.ceil(Number(countResult.rows[0].count) / limit),
      ),
    },
  };
}

// Mengambil detail cabang berdasarkan ID
export async function getBranchById(id) {
  const result = await pool.query(
    `
      SELECT
        id,
        branch_code AS "branchCode",
        branch_name AS "branchName",
        phone,
        whatsapp,
        email,
        address,
        city,
        province,
        postal_code AS "postalCode",
        is_head_office AS "isHeadOffice",
        is_active AS "isActive",
        opened_at AS "openedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM branches
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
}

// Membuat cabang baru
export async function createBranch(data) {
  const fields = Object.keys(branchFields).filter(
    (key) => data[key] !== undefined,
  );

  const columns = fields.map((key) => branchFields[key]);
  const values = fields.map((key) => data[key]);

  const placeholders = fields.map((_, index) => `$${index + 1}`);

  const result = await pool.query(
    `
      INSERT INTO branches (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING id
    `,
    values,
  );

  return getBranchById(result.rows[0].id);
}

// Memperbarui data cabang
export async function updateBranch(id, data) {
  const fields = Object.keys(branchFields).filter(
    (key) => data[key] !== undefined,
  );

  if (fields.length === 0) {
    return getBranchById(id);
  }

  const assignments = fields.map(
    (key, index) => `${branchFields[key]} = $${index + 1}`,
  );

  const values = fields.map((key) => data[key]);

  values.push(id);

  const result = await pool.query(
    `
      UPDATE branches
      SET
        ${assignments.join(", ")},
        updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id
    `,
    values,
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getBranchById(id);
}

// Mengubah status aktif/nonaktif cabang
export async function updateBranchStatus(id, isActive) {
  const result = await pool.query(
    `
      UPDATE branches
      SET
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `,
    [isActive, id],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getBranchById(id);
}

// Mengambil daftar unit aktif untuk katalog pendaftaran Parent
export async function getActiveBranchesForParent() {
  const result = await pool.query(
    `
      SELECT
        id,
        branch_code AS "branchCode",
        branch_name AS "branchName",
        city,
        province,
        address
      FROM branches
      WHERE is_active = true
      ORDER BY branch_name ASC
    `,
  );

  return result.rows;
}
