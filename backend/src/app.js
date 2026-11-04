
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ==========================================
// 1. KONFIGURASI DASAR
// ==========================================

app.disable("x-powered-by");

// ==========================================
// 2. KEAMANAN HTTP
// ==========================================

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ==========================================
// 3. KONFIGURASI CORS
// ==========================================

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Mengizinkan request tanpa origin, seperti server-to-server
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin tidak diizinkan oleh CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ==========================================
// 4. MIDDLEWARE
// ==========================================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// ==========================================
// 5. ROOT ENDPOINT
// ==========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    application: "Ilyon Academy",
    message: "Selamat datang di Ilyon Academy API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
    },
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 6. HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Ilyon Academy API berjalan!",
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 7. ROUTE TIDAK DITEMUKAN
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan",
    path: req.originalUrl,
  });
});

// ==========================================
// 8. ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  console.error("API Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Terjadi kesalahan pada server"
        : err.message,
  });
});

export default app;
