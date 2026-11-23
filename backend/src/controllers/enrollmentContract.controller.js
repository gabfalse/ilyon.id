import {
  getAllEnrollmentContracts,
  getEnrollmentContractById,
  createEnrollmentContract,
  updateEnrollmentContract,
  updateEnrollmentContractStatus,
  updateEnrollmentContractMember,
} from "../services/enrollmentContract.service.js";

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
// VALIDATION HELPERS
// ==========================================

const allowedStatuses = [
  "pending",
  "active",
  "paused",
  "completed",
  "cancelled",
];

const allowedMemberStatuses = ["active", "completed", "left"];

function isValidUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

// ==========================================
// HANDLE UNIQUE CONFLICT
// ==========================================

function handleUniqueConflict(error, res) {
  if (error.code !== "23505") {
    return false;
  }

  if (
    error.constraint === "enrollment_contract_members_one_active_per_enrollment"
  ) {
    res.status(409).json({
      success: false,
      message: "Salah satu Enrollment sudah menjadi anggota Contract aktif.",
    });

    return true;
  }

  if (error.constraint === "enrollment_contracts_contract_code_key") {
    res.status(409).json({
      success: false,
      message: "Kode Contract sudah digunakan.",
    });

    return true;
  }

  res.status(409).json({
    success: false,
    message: "Data Contract mengalami konflik dengan data yang sudah ada.",
  });

  return true;
}

// ==========================================
// GET: DAFTAR ENROLLMENT CONTRACT
// ==========================================

export async function listEnrollmentContracts(req, res, next) {
  try {
    const {
      search = "",
      status,
      branchId,
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
        message: "Parameter status Contract tidak valid.",
      });
    }

    // ----------------------------------------
    // VALIDATE UUID FILTERS
    // ----------------------------------------

    if (branchId !== undefined && !isValidUuid(String(branchId))) {
      return res.status(400).json({
        success: false,
        message: "Parameter branchId tidak valid.",
      });
    }

    if (offeringId !== undefined && !isValidUuid(String(offeringId))) {
      return res.status(400).json({
        success: false,
        message: "Parameter offeringId tidak valid.",
      });
    }

    // ----------------------------------------
    // GET DATA
    // ----------------------------------------

    const result = await getAllEnrollmentContracts({
      search: String(search).trim(),
      status,
      branchId,
      offeringId,
      page: parsedPage,
      limit: parsedLimit,
    });

    return res.status(200).json({
      success: true,
      message: "Daftar Enrollment Contract berhasil diambil.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GET: DETAIL ENROLLMENT CONTRACT
// ==========================================

export async function detailEnrollmentContract(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID Contract tidak valid.",
      });
    }

    const contract = await getEnrollmentContractById(id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Enrollment Contract tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detail Enrollment Contract berhasil diambil.",
      data: contract,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// POST: CREATE ENROLLMENT CONTRACT
// ==========================================

export async function storeEnrollmentContract(req, res, next) {
  try {
    const contract = await createEnrollmentContract(
      req.body,
      getAuditContext(req),
    );

    return res.status(201).json({
      success: true,
      message: "Enrollment Contract berhasil dibuat.",
      data: contract,
    });
  } catch (error) {
    if (handleUniqueConflict(error, res)) {
      return;
    }

    return next(error);
  }
}

// ==========================================
// PUT: UPDATE ENROLLMENT CONTRACT
// ==========================================

export async function editEnrollmentContract(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID Contract tidak valid.",
      });
    }

    const contract = await updateEnrollmentContract(
      id,
      req.body,
      getAuditContext(req),
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Enrollment Contract tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enrollment Contract berhasil diperbarui.",
      data: contract,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PATCH: UPDATE CONTRACT STATUS
// ==========================================

export async function changeEnrollmentContractStatus(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidUuid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID Contract tidak valid.",
      });
    }

    const contract = await updateEnrollmentContractStatus(
      id,
      req.body.status,
      getAuditContext(req),
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Enrollment Contract tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Status Enrollment Contract berhasil diperbarui.",
      data: contract,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PATCH: UPDATE CONTRACT MEMBER
// ==========================================

export async function changeEnrollmentContractMember(req, res, next) {
  try {
    const { contractId, enrollmentId } = req.params;

    if (!isValidUuid(contractId) || !isValidUuid(enrollmentId)) {
      return res.status(400).json({
        success: false,
        message: "ID Contract atau ID Enrollment tidak valid.",
      });
    }

    const contract = await updateEnrollmentContractMember(
      contractId,
      enrollmentId,
      req.body,
      getAuditContext(req),
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract atau anggota Enrollment tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Anggota Enrollment Contract berhasil diperbarui.",
      data: contract,
    });
  } catch (error) {
    if (handleUniqueConflict(error, res)) {
      return;
    }

    return next(error);
  }
}
