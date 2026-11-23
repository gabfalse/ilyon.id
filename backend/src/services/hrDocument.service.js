import { randomUUID, createHash } from "node:crypto";
import { pool } from "../config/database.js";

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { s3, storageBucket } from "../config/storage.js";
import { createAuditLog } from "./auditLog.service.js";

// ==========================================
// CONFIGURATION
// ==========================================

const PRESIGNED_URL_EXPIRY = 300;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

// ==========================================
// ERROR HELPER
// ==========================================

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// ==========================================
// FILE HELPERS
// ==========================================

function sanitizeOriginalFileName(fileName) {
  return fileName
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, 255);
}

function generateFileKey(profileId, extension) {
  const fileName = `${randomUUID()}.${extension}`;

  return `hr-documents/${profileId}/${fileName}`;
}

function calculateChecksum(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function validateFile(file) {
  if (!file?.buffer) {
    throw createServiceError("File dokumen wajib diunggah.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw createServiceError("Ukuran file maksimal 5 MB.");
  }

  if (!allowedMimeTypes.has(file.detectedMimeType)) {
    throw createServiceError("Format file tidak diizinkan.");
  }

  if (!file.detectedExtension) {
    throw createServiceError("Format file tidak valid.");
  }

  const originalFileName = sanitizeOriginalFileName(file.originalname || "");

  if (!originalFileName) {
    throw createServiceError("Nama file tidak valid.");
  }

  return {
    originalFileName,
    storedFileName: `${randomUUID()}.${file.detectedExtension}`,
    mimeType: file.detectedMimeType,
    extension: file.detectedExtension,
    fileSize: file.size,
    checksum: calculateChecksum(file.buffer),
  };
}

// ==========================================
// DATABASE TRANSACTION HELPER
// ==========================================

async function executeTransaction(callback) {
  const client = await pool.connect();

  let commitAttempted = false;

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    commitAttempted = true;
    await client.query("COMMIT");

    return result;
  } catch (error) {
    if (!commitAttempted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "HR DOCUMENT TRANSACTION ROLLBACK FAILED:",
          rollbackError.message,
        );
      }
    } else {
      // Hasil COMMIT mungkin tidak diketahui.
      // Jangan menghapus objek Storage secara otomatis.
      error.commitOutcomeUnknown = true;
      error.statusCode = 503;
    }

    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// OBJECT STORAGE HELPERS
// ==========================================

async function uploadObject(storageKey, file) {
  await s3.send(
    new PutObjectCommand({
      Bucket: storageBucket,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.detectedMimeType,
      ContentLength: file.size,
    }),
  );
}

async function deleteStorageObject(storageKey) {
  if (!storageKey) {
    throw new Error("Storage key tidak tersedia.");
  }

  await s3.send(
    new DeleteObjectCommand({
      Bucket: storageBucket,
      Key: storageKey,
    }),
  );
}

async function deleteObjectSafely(storageKey) {
  try {
    await deleteStorageObject(storageKey);
    return true;
  } catch (error) {
    console.error(
      "HR DOCUMENT STORAGE CLEANUP FAILED:",
      storageKey,
      error.message,
    );

    return false;
  }
}

// ==========================================
// CLEANUP QUEUE HELPERS
// ==========================================

async function enqueueStorageCleanup(client, fileId, storageKey) {
  if (!fileId || !storageKey) {
    throw createServiceError(
      "Informasi file untuk cleanup tidak lengkap.",
      500,
    );
  }

  const result = await client.query(
    `
      INSERT INTO hr_document_storage_cleanup_jobs (
        file_id,
        storage_key
      )
      VALUES ($1, $2)
      ON CONFLICT (file_id, storage_key)
      DO UPDATE SET updated_at = NOW()
      RETURNING id
    `,
    [fileId, storageKey],
  );

  return result.rows[0].id;
}

// ==========================================
// REGISTER ORPHAN OBJECT
// ==========================================

async function registerOrphanObjectForCleanup(data) {
  const { storageKey, fileInfo, actorId } = data;

  try {
    await executeTransaction(async (client) => {
      const fileResult = await client.query(
        `
          INSERT INTO files (
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
            $1, 'neon', $2, NULL, $3, $4, $5, $6, $7, TRUE
          )
          RETURNING id
        `,
        [
          actorId,
          storageKey,
          fileInfo.originalFileName,
          fileInfo.storedFileName,
          fileInfo.mimeType,
          fileInfo.fileSize,
          fileInfo.checksum,
        ],
      );

      await enqueueStorageCleanup(client, fileResult.rows[0].id, storageKey);
    });
  } catch (error) {
    console.error(
      "HR DOCUMENT ORPHAN REGISTRATION FAILED:",
      storageKey,
      error.message,
    );
  }
}

// ==========================================
// PROFILE VALIDATION
// ==========================================

async function ensureHrProfileExists(db, profileId) {
  const result = await db.query(
    `
      SELECT
        id,
        user_id,
        profile_type,
        profile_id
      FROM hr_person_profiles
      WHERE id = $1
      FOR SHARE
    `,
    [profileId],
  );

  if (!result.rows[0]) {
    throw createServiceError("Profil HR tidak ditemukan.", 404);
  }

  return result.rows[0];
}

// ==========================================
// FILE REFERENCE CHECK
// ==========================================

async function isFileReferencedByOtherModules(db, fileId) {
  const result = await db.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM (
          SELECT attachment_file_id AS file_id
          FROM curriculum_materials
          WHERE attachment_file_id = $1

          UNION ALL

          SELECT receipt_file_id
          FROM expenses
          WHERE receipt_file_id = $1

          UNION ALL

          SELECT file_id
          FROM gallery
          WHERE file_id = $1

          UNION ALL

          SELECT logo_file_id
          FROM organization_settings
          WHERE logo_file_id = $1

          UNION ALL

          SELECT file_id
          FROM payment_proofs
          WHERE file_id = $1

          UNION ALL

          SELECT file_id
          FROM registration_documents
          WHERE file_id = $1

          UNION ALL

          SELECT photo_file_id
          FROM students
          WHERE photo_file_id = $1

          UNION ALL

          SELECT avatar_file_id
          FROM users
          WHERE avatar_file_id = $1

          UNION ALL

          SELECT cover_file_id
          FROM website_content
          WHERE cover_file_id = $1

          UNION ALL

          SELECT file_id
          FROM hr_documents
          WHERE file_id = $1
        ) AS file_references
      ) AS is_referenced
    `,
    [fileId],
  );

  return result.rows[0].is_referenced;
}

// ==========================================
// DOCUMENT SELECT
// ==========================================

const documentSelect = `
  SELECT
    hd.id,
    hd.hr_person_profile_id AS "hrPersonProfileId",
    hd.file_id AS "fileId",

    hd.document_type AS "documentType",
    hd.document_name AS "documentName",
    hd.document_number AS "documentNumber",

    hd.issued_date AS "issuedDate",
    hd.expiry_date AS "expiryDate",

    hd.verification_status AS "verificationStatus",
    hd.verified_by AS "verifiedBy",
    hd.verified_at AS "verifiedAt",

    hd.notes,
    hd.created_at AS "createdAt",
    hd.updated_at AS "updatedAt",

    hp.profile_type AS "profileType",
    hp.profile_id AS "profileId",

    f.original_file_name AS "originalFileName",
    f.stored_file_name AS "storedFileName",
    f.mime_type AS "mimeType",
    f.file_size_bytes AS "fileSizeBytes",
    f.checksum_sha256 AS "checksumSha256",
    f.is_private AS "isPrivate"

  FROM hr_documents hd

  INNER JOIN hr_person_profiles hp
    ON hp.id = hd.hr_person_profile_id

  INNER JOIN files f
    ON f.id = hd.file_id
`;

// ==========================================
// GET DOCUMENTS BY HR PROFILE
// ==========================================

export async function getHrDocumentsByProfile(profileId) {
  const profileResult = await pool.query(
    `
      SELECT id, profile_type, profile_id
      FROM hr_person_profiles
      WHERE id = $1
    `,
    [profileId],
  );

  if (!profileResult.rows[0]) {
    throw createServiceError("Profil HR tidak ditemukan.", 404);
  }

  const result = await pool.query(
    `
      ${documentSelect}
      WHERE hd.hr_person_profile_id = $1
      ORDER BY hd.created_at DESC
    `,
    [profileId],
  );

  return {
    profile: profileResult.rows[0],
    documents: result.rows,
  };
}

// ==========================================
// GET DOCUMENT BY ID
// ==========================================

export async function getHrDocumentById(documentId) {
  const result = await pool.query(
    `
      ${documentSelect}
      WHERE hd.id = $1
    `,
    [documentId],
  );

  if (!result.rows[0]) {
    throw createServiceError("Dokumen HR tidak ditemukan.", 404);
  }

  return result.rows[0];
}

// ==========================================
// UPLOAD HR DOCUMENT
// ==========================================

export async function uploadHrDocument(data) {
  const {
    hrPersonProfileId,
    file,
    metadata,
    actorId,
    ipAddress = null,
    userAgent = null,
  } = data;

  const fileInfo = validateFile(file);

  await ensureHrProfileExists(pool, hrPersonProfileId);

  const storageKey = generateFileKey(hrPersonProfileId, fileInfo.extension);

  let objectUploaded = false;
  let documentId;

  try {
    await uploadObject(storageKey, file);
    objectUploaded = true;

    const document = await executeTransaction(async (client) => {
      const profile = await ensureHrProfileExists(client, hrPersonProfileId);

      const fileResult = await client.query(
        `
          INSERT INTO files (
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
            $1, 'neon', $2, NULL, $3, $4, $5, $6, $7, TRUE
          )
          RETURNING id
        `,
        [
          actorId,
          storageKey,
          fileInfo.originalFileName,
          fileInfo.storedFileName,
          fileInfo.mimeType,
          fileInfo.fileSize,
          fileInfo.checksum,
        ],
      );

      const fileId = fileResult.rows[0].id;

      const documentResult = await client.query(
        `
          INSERT INTO hr_documents (
            hr_person_profile_id,
            file_id,
            document_type,
            document_name,
            document_number,
            issued_date,
            expiry_date,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `,
        [
          profile.id,
          fileId,
          metadata.documentType,
          metadata.documentName,
          metadata.documentNumber,
          metadata.issuedDate,
          metadata.expiryDate,
          metadata.notes,
        ],
      );

      const created = documentResult.rows[0];

      await createAuditLog(
        {
          userId: actorId,
          branchId: null,
          action: "HR_DOCUMENT_UPLOADED",
          entityTable: "hr_documents",
          entityId: created.id,
          oldValues: null,
          newValues: {
            hrPersonProfileId: profile.id,
            profileType: profile.profile_type,
            documentType: created.document_type,
            documentName: created.document_name,
            fileId,
            originalFileName: fileInfo.originalFileName,
            mimeType: fileInfo.mimeType,
            fileSize: fileInfo.fileSize,
          },
          ipAddress,
          userAgent,
        },
        client,
      );

      return created;
    });

    documentId = document.id;
  } catch (error) {
    if (objectUploaded && error.commitOutcomeUnknown) {
      console.error("HR DOCUMENT UPLOAD COMMIT OUTCOME UNKNOWN:", storageKey);
    } else if (objectUploaded) {
      const cleaned = await deleteObjectSafely(storageKey);

      if (!cleaned) {
        await registerOrphanObjectForCleanup({
          storageKey,
          fileInfo,
          actorId,
        });
      }
    }

    throw error;
  }

  return getHrDocumentById(documentId);
}

// ==========================================
// UPDATE DOCUMENT METADATA
// ==========================================

export async function updateHrDocument(data) {
  const {
    documentId,
    metadata,
    actorId,
    ipAddress = null,
    userAgent = null,
  } = data;

  await executeTransaction(async (client) => {
    const existingResult = await client.query(
      `
        SELECT *
        FROM hr_documents
        WHERE id = $1
        FOR UPDATE
      `,
      [documentId],
    );

    const existing = existingResult.rows[0];

    if (!existing) {
      throw createServiceError("Dokumen HR tidak ditemukan.", 404);
    }

    const updatedResult = await client.query(
      `
        UPDATE hr_documents
        SET
          document_type = $2,
          document_name = $3,
          document_number = $4,
          issued_date = $5,
          expiry_date = $6,
          notes = $7,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        documentId,
        metadata.documentType,
        metadata.documentName,
        metadata.documentNumber,
        metadata.issuedDate,
        metadata.expiryDate,
        metadata.notes,
      ],
    );

    const updated = updatedResult.rows[0];

    await createAuditLog(
      {
        userId: actorId,
        branchId: null,
        action: "HR_DOCUMENT_UPDATED",
        entityTable: "hr_documents",
        entityId: documentId,
        oldValues: {
          documentType: existing.document_type,
          documentName: existing.document_name,
          documentNumber: existing.document_number,
          issuedDate: existing.issued_date,
          expiryDate: existing.expiry_date,
          notes: existing.notes,
        },
        newValues: {
          documentType: updated.document_type,
          documentName: updated.document_name,
          documentNumber: updated.document_number,
          issuedDate: updated.issued_date,
          expiryDate: updated.expiry_date,
          notes: updated.notes,
        },
        ipAddress,
        userAgent,
      },
      client,
    );
  });

  return getHrDocumentById(documentId);
}

// ==========================================
// REPLACE DOCUMENT FILE
// ==========================================

export async function replaceHrDocumentFile(data) {
  const {
    documentId,
    file,
    actorId,
    ipAddress = null,
    userAgent = null,
  } = data;

  const fileInfo = validateFile(file);

  const storageKey = generateFileKey(documentId, fileInfo.extension);

  let objectUploaded = false;

  try {
    await uploadObject(storageKey, file);
    objectUploaded = true;

    await executeTransaction(async (client) => {
      const lockedResult = await client.query(
        `
          SELECT
            hd.id,
            hd.file_id,
            f.storage_key,
            f.storage_provider
          FROM hr_documents hd
          INNER JOIN files f ON f.id = hd.file_id
          WHERE hd.id = $1
          FOR UPDATE OF hd, f
        `,
        [documentId],
      );

      const existing = lockedResult.rows[0];

      if (!existing) {
        throw createServiceError("Dokumen HR tidak ditemukan.", 404);
      }

      if (existing.storage_provider !== "neon" || !existing.storage_key) {
        throw createServiceError(
          "File lama bukan dokumen Object Storage HR yang valid.",
          409,
        );
      }

      const newFileResult = await client.query(
        `
          INSERT INTO files (
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
            $1, 'neon', $2, NULL, $3, $4, $5, $6, $7, TRUE
          )
          RETURNING id
        `,
        [
          actorId,
          storageKey,
          fileInfo.originalFileName,
          fileInfo.storedFileName,
          fileInfo.mimeType,
          fileInfo.fileSize,
          fileInfo.checksum,
        ],
      );

      const newFileId = newFileResult.rows[0].id;

      await client.query(
        `
          UPDATE hr_documents
          SET
            file_id = $2,
            verification_status = 'pending',
            verified_by = NULL,
            verified_at = NULL,
            updated_at = NOW()
          WHERE id = $1
        `,
        [documentId, newFileId],
      );

      await enqueueStorageCleanup(
        client,
        existing.file_id,
        existing.storage_key,
      );

      await createAuditLog(
        {
          userId: actorId,
          branchId: null,
          action: "HR_DOCUMENT_REPLACED",
          entityTable: "hr_documents",
          entityId: documentId,
          oldValues: {
            fileId: existing.file_id,
          },
          newValues: {
            fileId: newFileId,
            originalFileName: fileInfo.originalFileName,
            mimeType: fileInfo.mimeType,
            fileSize: fileInfo.fileSize,
            verificationStatus: "pending",
          },
          ipAddress,
          userAgent,
        },
        client,
      );
    });
  } catch (error) {
    if (objectUploaded && error.commitOutcomeUnknown) {
      console.error("HR DOCUMENT REPLACE COMMIT OUTCOME UNKNOWN:", storageKey);
    } else if (objectUploaded) {
      const cleaned = await deleteObjectSafely(storageKey);

      if (!cleaned) {
        await registerOrphanObjectForCleanup({
          storageKey,
          fileInfo,
          actorId,
        });
      }
    }

    throw error;
  }

  // Cleanup file lama dilakukan melalui antrean.
  const cleanup = await processPendingHrDocumentStorageCleanup();

  return {
    document: await getHrDocumentById(documentId),
    cleanup,
  };
}

// ==========================================
// VERIFY / REJECT DOCUMENT
// ==========================================

export async function updateHrDocumentVerification(data) {
  const {
    documentId,
    verificationStatus,
    actorId,
    ipAddress = null,
    userAgent = null,
  } = data;

  await executeTransaction(async (client) => {
    const existingResult = await client.query(
      `
        SELECT *
        FROM hr_documents
        WHERE id = $1
        FOR UPDATE
      `,
      [documentId],
    );

    const existing = existingResult.rows[0];

    if (!existing) {
      throw createServiceError("Dokumen HR tidak ditemukan.", 404);
    }

    const action =
      verificationStatus === "verified"
        ? "HR_DOCUMENT_VERIFIED"
        : "HR_DOCUMENT_REJECTED";

    const updatedResult = await client.query(
      `
        UPDATE hr_documents
        SET
          verification_status = $2,
          verified_by = $3,
          verified_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [documentId, verificationStatus, actorId],
    );

    const updated = updatedResult.rows[0];

    await createAuditLog(
      {
        userId: actorId,
        branchId: null,
        action,
        entityTable: "hr_documents",
        entityId: documentId,
        oldValues: {
          verificationStatus: existing.verification_status,
          verifiedBy: existing.verified_by,
        },
        newValues: {
          verificationStatus: updated.verification_status,
          verifiedBy: updated.verified_by,
          verifiedAt: updated.verified_at,
        },
        ipAddress,
        userAgent,
      },
      client,
    );
  });

  return getHrDocumentById(documentId);
}

// ==========================================
// GENERATE PRIVATE DOWNLOAD URL
// ==========================================

export async function getHrDocumentDownloadUrl(data) {
  const { documentId, actorId, ipAddress = null, userAgent = null } = data;

  const result = await pool.query(
    `
      SELECT
        hd.id,
        hd.document_name,
        f.storage_key,
        f.original_file_name,
        f.mime_type
      FROM hr_documents hd
      INNER JOIN files f ON f.id = hd.file_id
      WHERE hd.id = $1
        AND f.is_private = TRUE
        AND f.storage_provider = 'neon'
        AND f.storage_key IS NOT NULL
    `,
    [documentId],
  );

  const document = result.rows[0];

  if (!document) {
    throw createServiceError("Dokumen HR tidak ditemukan.", 404);
  }

  const command = new GetObjectCommand({
    Bucket: storageBucket,
    Key: document.storage_key,
    ResponseContentType: document.mime_type,
    ResponseContentDisposition: "attachment",
  });

  const downloadUrl = await getSignedUrl(s3, command, {
    expiresIn: PRESIGNED_URL_EXPIRY,
  });

  await createAuditLog({
    userId: actorId,
    branchId: null,
    action: "HR_DOCUMENT_ACCESSED",
    entityTable: "hr_documents",
    entityId: documentId,
    oldValues: null,
    newValues: {
      accessType: "download",
      documentName: document.document_name,
    },
    ipAddress,
    userAgent,
  });

  return {
    documentId,
    documentName: document.document_name,
    originalFileName: document.original_file_name,
    downloadUrl,
    expiresIn: PRESIGNED_URL_EXPIRY,
  };
}

// ==========================================
// DELETE HR DOCUMENT
// ==========================================

export async function deleteHrDocument(data) {
  const { documentId, actorId, ipAddress = null, userAgent = null } = data;

  const deleted = await executeTransaction(async (client) => {
    const existingResult = await client.query(
      `
        SELECT
          hd.*,
          f.id AS file_id,
          f.storage_key,
          f.storage_provider,
          f.original_file_name
        FROM hr_documents hd
        INNER JOIN files f ON f.id = hd.file_id
        WHERE hd.id = $1
        FOR UPDATE OF hd, f
      `,
      [documentId],
    );

    const existing = existingResult.rows[0];

    if (!existing) {
      throw createServiceError("Dokumen HR tidak ditemukan.", 404);
    }

    if (existing.storage_provider !== "neon" || !existing.storage_key) {
      throw createServiceError(
        "File dokumen tidak memiliki lokasi Object Storage yang valid.",
        409,
      );
    }

    await client.query(`DELETE FROM hr_documents WHERE id = $1`, [documentId]);

    const cleanupJobId = await enqueueStorageCleanup(
      client,
      existing.file_id,
      existing.storage_key,
    );

    await createAuditLog(
      {
        userId: actorId,
        branchId: null,
        action: "HR_DOCUMENT_DELETED",
        entityTable: "hr_documents",
        entityId: documentId,
        oldValues: {
          documentType: existing.document_type,
          documentName: existing.document_name,
          fileId: existing.file_id,
          originalFileName: existing.original_file_name,
        },
        newValues: null,
        ipAddress,
        userAgent,
      },
      client,
    );

    return {
      cleanupJobId,
    };
  });

  let cleanup;

  try {
    cleanup = await processHrDocumentStorageCleanupJob(deleted.cleanupJobId);
  } catch (error) {
    console.error(
      "HR DOCUMENT DELETE CLEANUP PENDING:",
      deleted.cleanupJobId,
      error.message,
    );

    cleanup = {
      jobId: deleted.cleanupJobId,
      processed: false,
      status: "retry_required",
      message: "Dokumen terhapus, tetapi pembersihan file Storage tertunda.",
    };
  }

  return {
    id: documentId,
    deleted: true,
    cleanup,
  };
}

// ==========================================
// PROCESS ONE CLEANUP JOB
// ==========================================

export async function processHrDocumentStorageCleanupJob(jobId) {
  try {
    return await executeTransaction(async (client) => {
      const jobResult = await client.query(
        `
          SELECT
            id,
            file_id,
            storage_key,
            attempts
          FROM hr_document_storage_cleanup_jobs
          WHERE id = $1
          FOR UPDATE
        `,
        [jobId],
      );

      const job = jobResult.rows[0];

      if (!job) {
        return {
          jobId,
          processed: true,
          status: "already_completed",
        };
      }

      const fileResult = await client.query(
        `
          SELECT id
          FROM files
          WHERE id = $1
          FOR UPDATE
        `,
        [job.file_id],
      );

      if (!fileResult.rows[0]) {
        await client.query(
          `
            DELETE FROM hr_document_storage_cleanup_jobs
            WHERE id = $1
          `,
          [job.id],
        );

        return {
          jobId,
          processed: true,
          status: "file_metadata_missing",
        };
      }

      const isReferenced = await isFileReferencedByOtherModules(
        client,
        job.file_id,
      );

      if (isReferenced) {
        await client.query(
          `
            DELETE FROM hr_document_storage_cleanup_jobs
            WHERE id = $1
          `,
          [job.id],
        );

        return {
          jobId,
          processed: true,
          status: "file_still_referenced",
        };
      }

      // Hapus metadata terlebih dahulu.
      // Jika penghapusan Storage gagal, transaksi rollback.
      await client.query(
        `
          DELETE FROM files
          WHERE id = $1
        `,
        [job.file_id],
      );

      await deleteStorageObject(job.storage_key);

      return {
        jobId,
        processed: true,
        status: "completed",
      };
    });
  } catch (error) {
    try {
      await pool.query(
        `
          UPDATE hr_document_storage_cleanup_jobs
          SET
            attempts = attempts + 1,
            last_error = LEFT($2, 2000),
            updated_at = NOW()
          WHERE id = $1
        `,
        [jobId, error.message || "Unknown cleanup error"],
      );
    } catch (updateError) {
      console.error(
        "HR DOCUMENT CLEANUP ERROR RECORDING FAILED:",
        jobId,
        updateError.message,
      );
    }

    throw error;
  }
}

// ==========================================
// PROCESS PENDING CLEANUP JOBS
// ==========================================

export async function processPendingHrDocumentStorageCleanup(limit = 20) {
  const safeLimit = Math.min(
    Math.max(Number.parseInt(limit, 10) || 20, 1),
    100,
  );

  const jobsResult = await pool.query(
    `
      SELECT
        id,
        attempts,
        last_error AS "lastError",
        created_at AS "createdAt"
      FROM hr_document_storage_cleanup_jobs
      ORDER BY created_at ASC
      LIMIT $1
    `,
    [safeLimit],
  );

  const results = [];

  for (const job of jobsResult.rows) {
    try {
      const result = await processHrDocumentStorageCleanupJob(job.id);

      results.push({
        ...result,
        attempts: Number(job.attempts),
      });
    } catch (error) {
      console.error("HR DOCUMENT CLEANUP JOB FAILED:", job.id, error.message);

      const updatedJob = await pool.query(
        `
          SELECT attempts, last_error AS "lastError"
          FROM hr_document_storage_cleanup_jobs
          WHERE id = $1
        `,
        [job.id],
      );

      results.push({
        jobId: job.id,
        processed: false,
        status: "retry_required",
        attempts: updatedJob.rows[0]
          ? Number(updatedJob.rows[0].attempts)
          : Number(job.attempts) + 1,
        message: updatedJob.rows[0]?.lastError || error.message,
      });
    }
  }

  return {
    total: results.length,
    completed: results.filter((item) => item.processed).length,
    pending: results.filter((item) => !item.processed).length,
    results,
  };
}
