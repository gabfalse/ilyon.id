import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import { closeDatabaseConnection } from "./src/config/database.js";
import {
  startHrDocumentCleanupWorker,
  stopHrDocumentCleanupWorker,
} from "./src/workers/hrDocumentCleanup.worker.js";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log("--------------------------------");
  console.log("ILYON ACADEMY BACKEND");
  console.log("--------------------------------");
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log("--------------------------------");

  startHrDocumentCleanupWorker();
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.log(`\n${signal} diterima. Memulai graceful shutdown...`);

  server.close(async (serverError) => {
    if (serverError) {
      console.error("HTTP server shutdown error:", serverError);
    }

    try {
      await stopHrDocumentCleanupWorker();
      await closeDatabaseConnection();

      console.log("Backend berhasil dihentikan.");
      process.exit(0);
    } catch (error) {
      console.error("Backend shutdown failed:", error);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
