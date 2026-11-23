import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

// ==========================================
// MULTER CONFIGURATION
// ==========================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },

  fileFilter: (req, file, callback) => {
    const originalName =
      typeof file.originalname === "string" ? file.originalname.trim() : "";

    const extension = originalName.split(".").pop().toLowerCase();

    if (file.mimetype !== "application/pdf" || extension !== "pdf") {
      const error = new Error("CV harus menggunakan format PDF.");

      error.statusCode = 400;

      return callback(error);
    }

    callback(null, true);
  },
});

// ==========================================
// UPLOAD CV
// ==========================================

export function uploadRecruitmentCv(req, res, next) {
  upload.single("document")(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Ukuran CV maksimal 5 MB.",
          });
        }

        if (
          error.code === "LIMIT_FILE_COUNT" ||
          error.code === "LIMIT_UNEXPECTED_FILE"
        ) {
          return res.status(400).json({
            success: false,
            message: "Hanya satu file CV yang diperbolehkan.",
          });
        }
      }

      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || "Upload CV gagal.",
      });
    }

    return next();
  });
}

// ==========================================
// VALIDATE CV FILE SIGNATURE
// ==========================================

export async function validateRecruitmentCvFile(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Dokumen CV wajib diunggah.",
      });
    }

    const detectedType = await fileTypeFromBuffer(req.file.buffer);

    if (
      !detectedType ||
      detectedType.mime !== "application/pdf" ||
      detectedType.ext !== "pdf"
    ) {
      return res.status(400).json({
        success: false,
        message: "Isi file tidak terdeteksi sebagai PDF yang valid.",
      });
    }

    req.file.detectedMimeType = detectedType.mime;
    req.file.detectedExtension = detectedType.ext;

    return next();
  } catch (error) {
    return next(error);
  }
}
