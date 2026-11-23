import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { pool } from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";
import userManagementRoutes from "./routes/userManagement.routes.js";
import branchRoutes from "./routes/branch.routes.js";

import studentRoutes from "./routes/student.routes.js";
import parentRoutes from "./routes/parent.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import enrollmentContractRoutes from "./routes/enrollmentContract.routes.js";

import tutorRoutes from "./routes/tutor.routes.js";
import staffRoutes from "./routes/staff.routes.js";

import hrDocumentRoutes from "./routes/hrDocument.routes.js";
import recruitmentPublicRoutes from "./routes/recruitmentPublic.routes.js";
import recruitmentRoutes from "./routes/recruitment.routes.js";

import subjectRoutes from "./routes/subject.routes.js";
import programRoutes from "./routes/program.routes.js";

import dashboardPublicRoutes from "./routes/dashboardPublic.routes.js";

// ==========================================
// 1. VALIDASI ENVIRONMENT
// ==========================================

const requiredEnv = ["FRONTEND_URL", "CSRF_SECRET", "DATABASE_URL"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Environment variable ${key} belum diatur`);
  }
}

if (process.env.CSRF_SECRET.length < 32) {
  throw new Error("CSRF_SECRET minimal 32 karakter");
}

// ==========================================
// 2. INISIALISASI EXPRESS
// ==========================================

const app = express();

app.disable("x-powered-by");

// ==========================================
// 3. HTTP SECURITY
// ==========================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

// ==========================================
// 4. KONFIGURASI CORS
// ==========================================

const allowedOrigins = [
  process.env.FRONTEND_URL,

  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:5173"] : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Mengizinkan request tanpa Origin.
      // Proteksi Origin tetap diterapkan pada
      // endpoint autentikasi melalui middleware CSRF.

      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin tidak diizinkan oleh CORS");

      error.status = 403;

      return callback(error);
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "X-Active-Branch-Id",
    ],

    optionsSuccessStatus: 204,
  }),
);

// ==========================================
// 5. GLOBAL MIDDLEWARE
// ==========================================

app.use(
  express.json({
    limit: "1mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
);

// Harus dipasang sebelum authRoutes
// karena autentikasi membaca req.cookies.

app.use(cookieParser());

// ==========================================
// 6. ROOT ENDPOINT
// ==========================================

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    application: "Ilyon Academy",
    message: "Selamat datang di Ilyon Academy API",
    version: "1.0.0",

    endpoints: {
      health: "/api/health",
      database: "/api/health/database",
      // userManagement: "/api/user-management",

      auth: {
        csrf: "/api/auth/csrf",
        register: "/api/auth/register",
        login: "/api/auth/login",
        logout: "/api/auth/logout",
        me: "/api/auth/me",
      },
    },

    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 7. API HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Ilyon Academy API berjalan!",
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 8. DATABASE HEALTH CHECK
// ==========================================

app.get("/api/health/database", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS server_time");

    return res.status(200).json({
      success: true,
      message: "Database berhasil terhubung!",
      database: "connected",
      serverTime: result.rows[0].server_time,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    return res.status(503).json({
      success: false,
      message: "Koneksi ke database gagal",
      database: "disconnected",
    });
  }
});

// ==========================================
// 9. API ROUTES
// ==========================================
// Auth
app.use("/api/auth", authRoutes);
app.use("/api/user-management", userManagementRoutes);
app.use("/api/branches", branchRoutes);

// Student Related
app.use("/api/students", studentRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/enrollment-contracts", enrollmentContractRoutes);

// Staff related
app.use("/api/tutors", tutorRoutes);
app.use("/api/staff", staffRoutes);

// recruitment related
app.use("/api/hr-documents", hrDocumentRoutes);
app.use("/api/recruitment/public", recruitmentPublicRoutes);
app.use("/api/recruitment", recruitmentRoutes);

// progam related
app.use("/api/subjects", subjectRoutes);
app.use("/api/programs", programRoutes);

// user related
app.use("/api/public", dashboardPublicRoutes);

// ==========================================
// 10. ROUTE NOT FOUND
// ==========================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan",
    path: req.originalUrl,
  });
});

// ==========================================
// 11. GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const requestedStatus = Number(err.statusCode || err.status);

  const statusCode =
    Number.isInteger(requestedStatus) &&
    requestedStatus >= 400 &&
    requestedStatus <= 599
      ? requestedStatus
      : 500;

  const isProduction = process.env.NODE_ENV === "production";

  // Catat detail error hanya di server.
  console.error("API Error:", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });

  const safeClientMessages = {
    400: "Data atau permintaan tidak valid.",
    401: "Autentikasi diperlukan.",
    403: "Akses tidak diizinkan.",
    404: "Data atau endpoint tidak ditemukan.",
    409: "Permintaan mengalami konflik dengan data yang ada.",
    413: "Ukuran data yang dikirim terlalu besar.",
    429: "Terlalu banyak permintaan. Silakan coba kembali nanti.",
    503: "Layanan sementara tidak tersedia. Silakan coba kembali nanti.",
  };

  const message =
    statusCode >= 500
      ? "Terjadi kesalahan pada server."
      : typeof err.publicMessage === "string"
        ? err.publicMessage
        : safeClientMessages[statusCode] || "Permintaan tidak dapat diproses.";

  return res.status(statusCode).json({
    success: false,
    message,
  });
});

// ==========================================
// 12. EXPORT APP
// ==========================================

export default app;
