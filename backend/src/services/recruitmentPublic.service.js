import {
  randomBytes,
  randomUUID,
  createHash,
  timingSafeEqual,
} from "node:crypto";

import { pool } from "../config/database.js";
import { s3, storageBucket } from "../config/storage.js";

import { encryptTrackingToken } from "../utils/recruitmentTokenCrypto.js";

import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// ==========================================
// CONFIGURATION
// ==========================================

const MAX_CV_SIZE = 5 * 1024 * 1024;

// ==========================================
// HELPERS
// ==========================================

function createApplicationNumber() {
  const date = new Date();
  const year = date.getFullYear();

  const randomCode = randomBytes(4).toString("hex").toUpperCase();

  return `ILA-${year}-${randomCode}`;
}

function generateTrackingToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function safeFileName(originalName) {
  if (typeof originalName !== "string") {
    return "";
  }

  const normalizedName = originalName
    .replace(/[\\/]/g, "/")
    .split("/")
    .pop()
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 200);

  if (!normalizedName || normalizedName === "." || normalizedName === "..") {
    return "";
  }

  return normalizedName;
}

function calculateChecksum(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = message;

  return error;
}

// ==========================================
// PUBLIC VACANCIES
// ==========================================

export async function getPublicVacancies() {
  const result = await pool.query(
    `
      SELECT
        rv.id,
        rv.vacancy_code AS "vacancyCode",
        rv.title,
        rv.employment_type AS "employmentType",
        rv.location,
        rv.description,
        rv.responsibilities,
        rv.requirements,
        rv.openings,
        rv.published_at AS "publishedAt",
        rv.closes_at AS "closesAt",
        b.branch_name AS "branchName"

      FROM recruitment_vacancies rv

      LEFT JOIN branches b
        ON b.id = rv.branch_id

      WHERE rv.status = 'published'
        AND (
          rv.closes_at IS NULL
          OR rv.closes_at > NOW()
        )

      ORDER BY rv.published_at DESC
    `,
  );

  return result.rows;
}

// ==========================================
// REGISTER ORPHAN FILE
// ==========================================

async function registerOrphanFile({
  fileId,
  storageKey,
  originalFileName,
  storedFileName,
  fileSize,
  checksum,
}) {
  let client = null;
  let commitAttempted = false;

  try {
    client = await pool.connect();

    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO files (
          id,
          uploaded_by,
          storage_provider,
          storage_key,
          file_url,
          original_file_name,
          stored_file_name,
          mime_type,
          file_size_bytes,
          checksum_sha256,
          is_private
        )
        VALUES (
          $1,
          NULL,
          'neon',
          $2,
          NULL,
          $3,
          $4,
          'application/pdf',
          $5,
          $6,
          TRUE
        )
        ON CONFLICT (id) DO NOTHING
      `,
      [
        fileId,
        storageKey,
        originalFileName,
        storedFileName,
        fileSize,
        checksum,
      ],
    );

    await client.query(
      `
        INSERT INTO recruitment_document_storage_cleanup_jobs (
          file_id,
          storage_key
        )
        VALUES ($1, $2)
        ON CONFLICT (file_id, storage_key)
        DO NOTHING
      `,
      [fileId, storageKey],
    );

    commitAttempted = true;

    await client.query("COMMIT");
  } catch (error) {
    if (client && !commitAttempted) {
      await client.query("ROLLBACK").catch(() => {});
    }

    throw error;
  } finally {
    client?.release();
  }
}

// ==========================================
// SUBMIT APPLICATION
// APPLICATION + CV + INITIAL HISTORY
// ==========================================

export async function submitApplication(data, file) {
  // ----------------------------------------
  // 1. VALIDASI FILE
  // ----------------------------------------

  if (!file || !file.buffer) {
    throw createError("Dokumen CV wajib diunggah.");
  }

  if (file.size > MAX_CV_SIZE) {
    throw createError("Ukuran CV maksimal 5 MB.");
  }

  if (
    file.detectedMimeType !== "application/pdf" ||
    file.detectedExtension !== "pdf"
  ) {
    throw createError("Format CV harus PDF.");
  }

  const originalFileName = safeFileName(file.originalname);

  if (!originalFileName || !originalFileName.toLowerCase().endsWith(".pdf")) {
    throw createError("Nama file CV tidak valid.");
  }

  // ----------------------------------------
  // 2. SIAPKAN IDENTITAS FILE DAN LAMARAN
  // ----------------------------------------

  const fileId = randomUUID();

  const storedFileName = `${fileId}.pdf`;

  const storageKey = `recruitment-documents/${data.vacancyId}/${storedFileName}`;

  const checksum = calculateChecksum(file.buffer);

  const applicationNumber = createApplicationNumber();

  const trackingToken = generateTrackingToken();

  const trackingTokenHash = hashToken(trackingToken);

  const trackingTokenEncrypted = encryptTrackingToken(trackingToken);

  // ----------------------------------------
  // 3. UPLOAD CV KE PRIVATE STORAGE
  // ----------------------------------------

  await s3.send(
    new PutObjectCommand({
      Bucket: storageBucket,
      Key: storageKey,
      Body: file.buffer,
      ContentType: "application/pdf",
      ContentLength: file.size,
      Metadata: {
        checksumsha256: checksum,
      },
    }),
  );

  // ----------------------------------------
  // 4. TRANSAKSI DATABASE
  // ----------------------------------------

  let client = null;
  let commitAttempted = false;

  try {
    client = await pool.connect();

    await client.query("BEGIN");

    // --------------------------------------
    // 4A. VALIDASI LOWONGAN
    // --------------------------------------

    const vacancyResult = await client.query(
      `
        SELECT
          id,
          title
        FROM recruitment_vacancies
        WHERE id = $1
          AND status = 'published'
          AND (
            closes_at IS NULL
            OR closes_at > NOW()
          )
        FOR SHARE
      `,
      [data.vacancyId],
    );

    if (vacancyResult.rowCount === 0) {
      throw createError("Lowongan tidak ditemukan atau sudah ditutup.", 404);
    }

    // --------------------------------------
    // 4B. BUAT LAMARAN
    // --------------------------------------

    const applicationResult = await client.query(
      `
        INSERT INTO recruitment_applications (
          vacancy_id,
          application_number,
          full_name,
          email,
          phone,
          address,
          city,
          province,
          education_level,
          education_major,
          experience_years,
          current_occupation,
          cover_letter,
          portfolio_url,
          tracking_token_hash,
          tracking_token_encrypted,
          status
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16,
          'submitted'
        )
        RETURNING
          id,
          application_number AS "applicationNumber",
          status,
          submitted_at AS "submittedAt"
      `,
      [
        data.vacancyId,
        applicationNumber,
        data.fullName,
        data.email,
        data.phone,
        data.address || null,
        data.city || null,
        data.province || null,
        data.educationLevel,
        data.educationMajor || null,
        data.experienceYears ?? 0,
        data.currentOccupation || null,
        data.coverLetter || null,
        data.portfolioUrl || null,
        trackingTokenHash,
        trackingTokenEncrypted,
      ],
    );

    // Ambil data lamaran hasil INSERT.
    // Ini memperbaiki ReferenceError: application is not defined.

    const application = applicationResult.rows[0];

    if (!application) {
      throw createError("Gagal menyimpan data lamaran.", 500);
    }

    // --------------------------------------
    // 4C. SIMPAN FILE METADATA
    // --------------------------------------

    await client.query(
      `
        INSERT INTO files (
          id,
          uploaded_by,
          storage_provider,
          storage_key,
          file_url,
          original_file_name,
          stored_file_name,
          mime_type,
          file_size_bytes,
          checksum_sha256,
          is_private
        )
        VALUES (
          $1,
          NULL,
          'neon',
          $2,
          NULL,
          $3,
          $4,
          'application/pdf',
          $5,
          $6,
          TRUE
        )
      `,
      [
        fileId,
        storageKey,
        originalFileName,
        storedFileName,
        file.size,
        checksum,
      ],
    );

    // --------------------------------------
    // 4D. HUBUNGKAN CV DENGAN LAMARAN
    // --------------------------------------

    await client.query(
      `
        INSERT INTO recruitment_documents (
          application_id,
          file_id,
          document_type,
          document_name,
          verification_status
        )
        VALUES ($1, $2, 'cv', $3, 'pending')
      `,
      [application.id, fileId, originalFileName],
    );

    // --------------------------------------
    // 4E. RIWAYAT STATUS AWAL
    // --------------------------------------

    await client.query(
      `
        INSERT INTO recruitment_stage_histories (
          application_id,
          from_status,
          to_status,
          notes,
          changed_by
        )
        VALUES (
          $1,
          NULL,
          'submitted',
          NULL,
          NULL
        )
      `,
      [application.id],
    );

    // --------------------------------------
    // 4F. COMMIT
    // ----------------------------------------

    commitAttempted = true;

    await client.query("COMMIT");

    // ----------------------------------------
    // 4G. RESPONSE SUKSES
    // ----------------------------------------

    return {
      applicationNumber: application.applicationNumber,
      status: application.status,
      submittedAt: application.submittedAt,
      vacancyTitle: vacancyResult.rows[0].title,

      // Token hanya diberikan saat lamaran pertama dibuat.
      trackingToken,
    };
  } catch (error) {
    // ----------------------------------------
    // 5. ROLLBACK JIKA COMMIT BELUM DICOBA
    // ----------------------------------------

    if (client && !commitAttempted) {
      await client.query("ROLLBACK").catch(() => {});
    }

    // ----------------------------------------
    // 6. JANGAN HAPUS FILE JIKA HASIL COMMIT
    // TIDAK DIKETAHUI
    // ----------------------------------------

    if (commitAttempted) {
      error.commitOutcomeUnknown = true;
      error.statusCode = 503;

      throw error;
    }

    // ----------------------------------------
    // 7. BERSIHKAN OBJECT JIKA TRANSAKSI GAGAL
    // ----------------------------------------

    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: storageBucket,
          Key: storageKey,
        }),
      );
    } catch (cleanupError) {
      try {
        await registerOrphanFile({
          fileId,
          storageKey,
          originalFileName,
          storedFileName,
          fileSize: file.size,
          checksum,
        });
      } catch (registrationError) {
        console.error("RECRUITMENT ORPHAN CLEANUP REGISTRATION FAILED:", {
          fileId,
          storageKey,
          storageError: cleanupError.message,
          registrationError: registrationError.message,
        });
      }
    }

    // ----------------------------------------
    // 8. TANGANI DUPLIKASI DATA
    // ----------------------------------------

    if (error.code === "23505") {
      const duplicateEmail = await pool
        .query(
          `
            SELECT id
            FROM recruitment_applications
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
          `,
          [data.email],
        )
        .catch(() => ({ rowCount: 0 }));

      if (duplicateEmail.rowCount > 0) {
        throw createError(
          "Email ini sudah pernah digunakan untuk melamar.",
          409,
        );
      }

      throw createError(
        "Nomor lamaran mengalami konflik. Silakan coba kembali.",
        409,
      );
    }

    throw error;
  } finally {
    client?.release();
  }
}

// ==========================================
// TRACK APPLICATION
// APPLICATION NUMBER + TRACKING TOKEN
// ==========================================

export async function trackApplication(applicationNumber, trackingToken) {
  const result = await pool.query(
    `
      SELECT
        ra.id,
        ra.application_number AS "applicationNumber",
        ra.status,
        ra.submitted_at AS "submittedAt",
        rv.title AS "vacancyTitle",
        ra.tracking_token_hash AS "trackingTokenHash"

      FROM recruitment_applications ra

      INNER JOIN recruitment_vacancies rv
        ON rv.id = ra.vacancy_id

      WHERE ra.application_number = $1
      LIMIT 1
    `,
    [applicationNumber],
  );

  if (result.rowCount === 0) {
    throw createError("Nomor lamaran atau token pelacakan tidak valid.", 404);
  }

  const application = result.rows[0];

  const suppliedHash = Buffer.from(hashToken(trackingToken), "hex");

  const storedHash = Buffer.from(application.trackingTokenHash, "hex");

  if (
    suppliedHash.length !== storedHash.length ||
    !timingSafeEqual(suppliedHash, storedHash)
  ) {
    throw createError("Nomor lamaran atau token pelacakan tidak valid.", 404);
  }

  // ----------------------------------------
  // RIWAYAT STATUS PUBLIK
  // Jangan tampilkan catatan internal HR.
  // ----------------------------------------

  const historyResult = await pool.query(
    `
      SELECT
        to_status AS status,
        created_at AS "createdAt"

      FROM recruitment_stage_histories

      WHERE application_id = $1

      ORDER BY created_at ASC
    `,
    [application.id],
  );

  return {
    applicationNumber: application.applicationNumber,
    vacancyTitle: application.vacancyTitle,
    status: application.status,
    submittedAt: application.submittedAt,
    history: historyResult.rows,
  };
}
