
import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log("--------------------------------");
  console.log("ILYON ACADEMY BACKEND");
  console.log("--------------------------------");
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log("--------------------------------");
});

// Menangani server ketika dihentikan
process.on("SIGINT", () => {
  console.log("\nServer dihentikan.");
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
