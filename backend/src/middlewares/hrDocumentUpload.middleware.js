import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

// ==========================================
// UPLOAD CONFIGURATION
// ==========================================

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png"]);

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },

  fileFilter(req, file, callback) {
    const originalName = file.originalname.trim().toLowerCase();
    const extension = originalName.split(".").pop();

    if (!allowedExtensions.has(extension)) {
      return callback(new Error("Format file harus PDF, JPG, JPEG, atau PNG."));
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("Tipe file tidak diizinkan."));
    }

    return callback(null, true);
  },
});

// ==========================================
// UPLOAD MIDDLEWARE + ERROR HANDLING
// ==========================================

export function uploadHrDocument(req, res, next) {
  upload.single("document")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      const statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;

      return res.status(statusCode).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Ukuran file maksimal 5 MB."
            : "Upload dokumen tidak valid.",
      });
    }

    if (
      error.message === "Format file harus PDF, JPG, JPEG, atau PNG." ||
      error.message === "Tipe file tidak diizinkan."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  });
}

// ==========================================
// FILE SIGNATURE VALIDATION
// ==========================================

export async function validateHrDocumentFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File dokumen wajib diunggah.",
      });
    }

    const detectedType = await fileTypeFromBuffer(req.file.buffer);

    if (!detectedType || !allowedMimeTypes.has(detectedType.mime)) {
      return res.status(400).json({
        success: false,
        message: "Isi file tidak sesuai dengan format dokumen yang diizinkan.",
      });
    }

    const detectedExtension = detectedType.ext.toLowerCase();

    if (!allowedExtensions.has(detectedExtension)) {
      return res.status(400).json({
        success: false,
        message: "Ekstensi file tidak diizinkan.",
      });
    }

    req.file.detectedMimeType = detectedType.mime;
    req.file.detectedExtension = detectedExtension;

    return next();
  } catch (error) {
    return next(error);
  }
}
