import { processPendingHrDocumentStorageCleanup } from "../services/hrDocument.service.js";

// ==========================================
// CONFIGURATION
// ==========================================

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 20;

let cleanupInterval = null;
let activeCleanup = null;

// ==========================================
// RUN CLEANUP
// ==========================================

async function runCleanup() {
  if (activeCleanup) {
    return activeCleanup;
  }

  activeCleanup = (async () => {
    try {
      const result =
        await processPendingHrDocumentStorageCleanup(CLEANUP_BATCH_SIZE);

      console.log("HR DOCUMENT CLEANUP RESULT:", {
        total: result.total,
        completed: result.completed,
        pending: result.pending,
      });

      return result;
    } catch (error) {
      console.error("HR DOCUMENT CLEANUP WORKER FAILED:", error.message);

      return null;
    } finally {
      activeCleanup = null;
    }
  })();

  return activeCleanup;
}

// ==========================================
// START WORKER
// ==========================================

export function startHrDocumentCleanupWorker() {
  if (cleanupInterval) {
    return;
  }

  console.log("HR Document Cleanup Worker started.");
  console.log("Cleanup interval: 5 minutes.");

  // Jalankan satu kali saat worker dimulai.
  void runCleanup();

  // Selanjutnya jalankan setiap 5 menit.
  cleanupInterval = setInterval(() => {
    void runCleanup();
  }, CLEANUP_INTERVAL_MS);

  cleanupInterval.unref();
}

// ==========================================
// STOP WORKER
// ==========================================

export async function stopHrDocumentCleanupWorker() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }

  if (activeCleanup) {
    await activeCleanup;
  }

  console.log("HR Document Cleanup Worker stopped.");
}
