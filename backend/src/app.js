
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Keamanan HTTP
app.use(helmet());

// Mengizinkan komunikasi dari frontend React
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Membaca JSON dan cookie
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Pemeriksaan server
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Ilyon Academy API berjalan!",
    timestamp: new Date().toISOString(),
  });
});

export default app;
