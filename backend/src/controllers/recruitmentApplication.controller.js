import {
  getAllApplications,
  getApplicationById,
  getApplicationDocumentUrl,
  getApplicationTrackingToken,
  updateApplicationStatus,
} from "../services/recruitmentApplication.service.js";

// ==========================================
// HELPERS
// ==========================================

function getActorContext(req) {
  return {
    actorId: req.user?.id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || null,
  };
}

function handleControllerError(res, error) {
  console.error("[Recruitment Application]", error);

  const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;

  return res.status(status).json({
    success: false,
    message: status >= 500 ? "Terjadi kesalahan pada server." : error.message,
  });
}

// ==========================================
// GET APPLICATIONS
// ==========================================

export async function getApplications(req, res) {
  try {
    const result = await getAllApplications(
      req.validatedApplicationQuery || req.query,
    );

    return res.status(200).json({
      success: true,
      message: "Daftar lamaran berhasil diambil.",
      data: result,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

// ==========================================
// GET APPLICATION DETAIL
// ==========================================

export async function getApplicationDetail(req, res) {
  try {
    const result = await getApplicationById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Detail lamaran berhasil diambil.",
      data: result,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

// ==========================================
// GET PRIVATE DOCUMENT URL
// ==========================================

export async function getApplicationDocument(req, res) {
  try {
    console.log("[DOCUMENT ROUTE] Incoming parameters:", {
      applicationId: req.params.applicationId,
      documentId: req.params.documentId,
    });

    const result = await getApplicationDocumentUrl(
      req.params.applicationId,
      req.params.documentId,
    );

    console.log("[DOCUMENT SERVICE] Signed URL generated:", {
      success: Boolean(result?.url),
      expiresIn: result?.expiresIn,
    });

    return res.status(200).json({
      success: true,
      message: "Tautan dokumen berhasil dibuat.",
      data: result,
    });
  } catch (error) {
    console.error("[DOCUMENT SERVICE] Failed:", {
      message: error.message,
      statusCode: error.statusCode,
    });

    return handleControllerError(res, error);
  }
}

// ==========================================
// GET APPLICATION TRACKING TOKEN
// ==========================================

export async function getApplicationTrackingTokenHandler(req, res) {
  try {
    const result = await getApplicationTrackingToken(
      req.params.id,
      getActorContext(req),
    );

    return res.status(200).json({
      success: true,
      message: result.available
        ? "Token pelacakan berhasil diambil."
        : "Token pelacakan tidak tersedia untuk lamaran lama.",
      data: result,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

// ==========================================
// UPDATE APPLICATION STATUS
// ==========================================

export async function updateApplicationStatusHandler(req, res) {
  try {
    const result = await updateApplicationStatus(
      req.params.id,
      {
        status: req.body.status,
        notes: req.body.notes,
      },
      getActorContext(req),
    );

    return res.status(200).json({
      success: true,
      message: "Status lamaran berhasil diperbarui.",
      data: result,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}
