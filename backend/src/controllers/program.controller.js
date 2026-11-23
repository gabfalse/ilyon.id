import {
  getAllPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  updateProgramStatus,
  getAllOfferingsByProgram,
  getActiveOfferingsByProgram,
  getActiveOfferingsForParent, // TAMBAHKAN INI
  getOfferingById,
  createOffering,
  updateOffering,
  updateOfferingStatus,

  // Program - Subject Mapping
  getProgramSubjectsByProgram,
  getAvailableProgramSubjects as getAvailableProgramSubjectsService,
  addSubjectToProgram,
  updateProgramSubject,
  removeProgramSubject,
} from "../services/program.service.js";

// ==========================================
// PROGRAM
// ==========================================

// GET /api/programs
export async function getPrograms(req, res, next) {
  try {
    const { search = "", isActive, page = 1, limit = 10 } = req.query;

    const result = await getAllPrograms({
      search,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
      page: Number(page),
      limit: Number(limit),
    });

    return res.status(200).json({
      success: true,
      message: "Data program berhasil diambil.",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/programs/:id
export async function getProgram(req, res, next) {
  try {
    const program = await getProgramById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detail program berhasil diambil.",
      data: program,
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/programs
export async function postProgram(req, res, next) {
  try {
    const program = await createProgram(req.body);

    return res.status(201).json({
      success: true,
      message: "Program berhasil ditambahkan.",
      data: program,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Kode program sudah digunakan.",
      });
    }

    return next(error);
  }
}

// PUT /api/programs/:id
export async function putProgram(req, res, next) {
  try {
    const program = await updateProgram(req.params.id, req.body);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Program berhasil diperbarui.",
      data: program,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Kode program sudah digunakan.",
      });
    }

    return next(error);
  }
}

// PATCH /api/programs/:id/status
export async function patchProgramStatus(req, res, next) {
  try {
    const program = await updateProgramStatus(req.params.id, req.body.isActive);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Status program berhasil diperbarui.",
      data: program,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PROGRAM - SUBJECT MAPPING
// ==========================================

// GET /api/programs/:programId/subjects
export async function getProgramSubjects(req, res, next) {
  try {
    const subjects = await getProgramSubjectsByProgram(req.params.programId);

    return res.status(200).json({
      success: true,
      message: "Data Subject Program berhasil diambil.",
      data: subjects,
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/programs/:programId/subjects/available
export async function getAvailableProgramSubjects(req, res, next) {
  try {
    const subjects = await getAvailableProgramSubjectsService(
      req.params.programId,
      {
        search: req.query.search || "",
      },
    );

    return res.status(200).json({
      success: true,
      message: "Data Subject yang tersedia berhasil diambil.",
      data: subjects,
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/programs/:programId/subjects
export async function postProgramSubject(req, res, next) {
  try {
    const subject = await addSubjectToProgram(req.params.programId, req.body);

    return res.status(201).json({
      success: true,
      message: "Subject berhasil ditambahkan ke Program.",
      data: subject,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Subject sudah terhubung dengan Program ini.",
      });
    }

    return next(error);
  }
}

// PATCH /api/programs/:programId/subjects/:subjectId
export async function patchProgramSubject(req, res, next) {
  try {
    const subject = await updateProgramSubject(
      req.params.programId,
      req.params.subjectId,
      req.body.isRequired,
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Relasi Program dan Subject tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Status Subject berhasil diperbarui.",
      data: subject,
    });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/programs/:programId/subjects/:subjectId
export async function deleteProgramSubject(req, res, next) {
  try {
    const deleted = await removeProgramSubject(
      req.params.programId,
      req.params.subjectId,
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Relasi Program dan Subject tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subject berhasil dilepaskan dari Program.",
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// PROGRAM OFFERING
// ==========================================
// GET /api/programs/parent/offerings
export async function getParentProgramOfferings(req, res, next) {
  try {
    const offerings = await getActiveOfferingsForParent();

    return res.status(200).json({
      success: true,
      message: "Katalog program berhasil diambil.",
      data: offerings,
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/programs/:programId/offerings
export async function getProgramOfferings(req, res, next) {
  try {
    const { search = "", isActive, page = 1, limit = 10 } = req.query;

    const result = await getAllOfferingsByProgram(req.params.programId, {
      search,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
      page: Number(page),
      limit: Number(limit),
    });

    return res.status(200).json({
      success: true,
      message: "Data offering berhasil diambil.",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/programs/:programId/offerings/active
export async function getActiveProgramOfferings(req, res, next) {
  try {
    const offerings = await getActiveOfferingsByProgram(req.params.programId);

    return res.status(200).json({
      success: true,
      message: "Data offering aktif berhasil diambil.",
      data: offerings,
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/programs/offerings/:offeringId
export async function getOffering(req, res, next) {
  try {
    const offering = await getOfferingById(req.params.offeringId);

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: "Offering tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detail offering berhasil diambil.",
      data: offering,
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/programs/:programId/offerings
export async function postProgramOffering(req, res, next) {
  try {
    const offering = await createOffering(req.params.programId, req.body);

    return res.status(201).json({
      success: true,
      message: "Offering berhasil ditambahkan.",
      data: offering,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Kode offering sudah digunakan.",
      });
    }

    return next(error);
  }
}

// PUT /api/programs/offerings/:offeringId
export async function putProgramOffering(req, res, next) {
  try {
    const offering = await updateOffering(req.params.offeringId, req.body);

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: "Offering tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offering berhasil diperbarui.",
      data: offering,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Kode offering sudah digunakan.",
      });
    }

    return next(error);
  }
}

// PATCH /api/programs/offerings/:offeringId/status
export async function patchProgramOfferingStatus(req, res, next) {
  try {
    const offering = await updateOfferingStatus(
      req.params.offeringId,
      req.body.isActive,
    );

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: "Offering tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Status offering berhasil diperbarui.",
      data: offering,
    });
  } catch (error) {
    return next(error);
  }
}
