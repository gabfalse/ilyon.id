
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("error", (error) => {
  console.error("Unexpected database error:", error);
});

export async function testDatabaseConnection() {
  try {
    const result = await pool.query("SELECT NOW() AS server_time");

    console.log("Neon PostgreSQL berhasil terhubung!");
    console.log("Waktu server:", result.rows[0].server_time);

    return true;
  } catch (error) {
    console.error("Koneksi database gagal:", error.message);
    return false;
  }
}
