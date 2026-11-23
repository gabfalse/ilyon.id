import {
  getHrDocumentsByProfile,
  getHrDocumentById,
  uploadHrDocument,
  updateHrDocument,
  replaceHrDocumentFile,
  updateHrDocumentVerification,
  getHrDocumentDownloadUrl,
  deleteHrDocument,
} from "../services/hrDocument.service.js";

// ==========================================
// GET: DAFTAR DOKUMEN BERDASARKAN PROFIL HR
// ==========================================

export async function listHrDocuments(req, res, next) {
  try {
    const result = await getHrDocumentsByProfile(req.params.profileId);

    return res.status(200).json({
      success: true,
      message: "Daftar dokumen HR berhasil diambil.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET: DETAIL DOKUMEN HR
// ==========================================

export async function detailHrDocument(req, res, next) {
  try {
    const document = await getHrDocumentById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Detail dokumen HR berhasil diambil.",
      data: document,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// POST: UPLOAD DOKUMEN HR
// ==========================================

export async function storeHrDocument(req, res, next) {
  try {
    const { hrPersonProfileId, ...metadata } = req.body;

    const document = await uploadHrDocument({
      hrPersonProfileId,
      file: req.file,
      metadata,
      actorId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(201).json({
      success: true,
      message: "Dokumen HR berhasil diunggah.",
      data: document,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PUT: UPDATE METADATA DOKUMEN
// ==========================================

export async function updateHrDocumentController(req, res, next) {
  try {
    const document = await updateHrDocument({
      documentId: req.params.id,
      metadata: req.body,
      actorId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: "Metadata dokumen HR berhasil diperbarui.",
      data: document,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PATCH: GANTI FILE DOKUMEN
// ==========================================

export async function replaceHrDocumentFileController(req, res, next) {
  try {
    const result = await replaceHrDocumentFile({
      documentId: req.params.id,
      file: req.file,
      actorId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: "File dokumen HR berhasil diganti.",
      data: result.document,
      cleanup: result.cleanup,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PATCH: VERIFIKASI / TOLAK DOKUMEN
// ==========================================

export async function verifyHrDocumentController(req, res, next) {
  try {
    const document = await updateHrDocumentVerification({
      documentId: req.params.id,
      verificationStatus: req.body.verificationStatus,
      actorId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message:
        req.body.verificationStatus === "verified"
          ? "Dokumen HR berhasil diverifikasi."
          : "Dokumen HR berhasil ditolak.",
      data: document,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET: DOWNLOAD DOKUMEN HR
// ==========================================

export async function downloadHrDocumentController(req, res, next) {
  try {
    const result = await getHrDocumentDownloadUrl({
      documentId: req.params.id,
      actorId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: "URL download dokumen HR berhasil dibuat.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// DELETE: HAPUS DOKUMEN HR
// ==========================================

export async function deleteHrDocumentController(req, res, next) {
  try {
    const result = await deleteHrDocument({
      documentId: req.params.id,
      actorId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: "Dokumen HR berhasil dihapus.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
