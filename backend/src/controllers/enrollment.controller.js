import {
  getAllEnrollments,
  getEnrollmentById,
  createEnrollment,
  updateEnrollment,
  updateEnrollmentStatus,
} from "../services/enrollment.service.js";

// ==========================================
// AUDIT CONTEXT
// ==========================================

function getAuditContext(req) {
  return {
    userId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || null,
  };
}

// ==========================================
// QUERY VALIDATION HELPERS
// ==========================================

const allowedStatuses = [
  "pending",
  "active",
  "paused",
  "completed",
  "cancelled",
];

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

// ==========================================
// GET: DAFTAR ENROLLMENT
// ==========================================

export async function listEnrollments(req, res, next) {
  try {
    const {
      search = "",
      status,
      branchId,
      studentId,
      programId,
      offeringId,
      page = "1",
      limit = "10",
    } = req.query;

    // ----------------------------------------
    // VALIDATE PAGINATION
    // ----------------------------------------

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);

    if (
      !Number.isInteger(parsedPage) ||
      parsedPage < 1 ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Parameter page atau limit tidak valid.",
      });
    }

    // ----------------------------------------
    // VALIDATE STATUS
    // ----------------------------------------

    if (status !== undefined && !allowedStatuses.includes(String(status))) {
      return res.status(400).json({
        success: false,
        message: "Parameter status Enrollment tidak valid.",
      });
    }

    // ----------------------------------------
    // VALIDATE UUID FILTERS
    // ----------------------------------------

    const uuidFilters = {
      branchId,
      studentId,
      programId,
      offeringId,
    };

    for (const [field, value] of Object.entries(uuidFilters)) {
      if (value !== undefined && !isValidUuid(String(value))) {
        return res.status(400).json({
          success: false,
          message: `Parameter ${field} tidak valid.`,
        });
      }
    }

    // ----------------------------------------
    // GET DATA
    // ----------------------------------------

    const result = await getAllEnrollments({
      search: String(search).trim(),
      status,
      branchId,
      studentId,
      programId,
      offeringId,
      page: parsedPage,
      limit: parsedLimit,
    });

    return res.status(200).json({
      success: true,
      message: "Daftar Enrollment berhasil diambil.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET: DETAIL ENROLLMENT
// ==========================================

export async function detailEnrollment(req, res, next) {
  try {
    const enrollment = await getEnrollmentById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detail Enrollment berhasil diambil.",
      data: enrollment,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// POST: TAMBAH ENROLLMENT
// ==========================================

export async function storeEnrollment(req, res, next) {
  try {
    const enrollment = await createEnrollment(req.body, getAuditContext(req));

    return res.status(201).json({
      success: true,
      message: "Enrollment berhasil dibuat.",
      data: enrollment,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PUT: EDIT ENROLLMENT
// ==========================================

export async function editEnrollment(req, res, next) {
  try {
    const enrollment = await updateEnrollment(
      req.params.id,
      req.body,
      getAuditContext(req),
    );

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enrollment berhasil diperbarui.",
      data: enrollment,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PATCH: UBAH STATUS ENROLLMENT
// ==========================================

export async function changeEnrollmentStatus(req, res, next) {
  try {
    const enrollment = await updateEnrollmentStatus(
      req.params.id,
      req.body.status,
      getAuditContext(req),
    );

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Status Enrollment berhasil diperbarui.",
      data: enrollment,
    });
  } catch (error) {
    return next(error);
  }
}
