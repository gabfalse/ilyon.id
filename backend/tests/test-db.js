import {
  testDatabaseConnection,
  pool
} from "../src/config/database.js";

try {
  await testDatabaseConnection();
} finally {
  await pool.end();
}