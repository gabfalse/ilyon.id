import {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  updateSubjectStatus,
  getSubjectsByProgram,
  updateProgramSubjects,
} from "../services/subject.service.js";

export async function getSubjects(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20),
    );

    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
          ? false
          : undefined;

    const result = await getAllSubjects({
      search: String(req.query.search || "").trim(),
      isActive,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Daftar mata pelajaran berhasil diambil.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSubject(req, res, next) {
  try {
    const subject = await getSubjectById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Mata pelajaran tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detail mata pelajaran berhasil diambil.",
      data: subject,
    });
  } catch (error) {
    next(error);
  }
}

export async function createSubjectController(req, res, next) {
  try {
    const subject = await createSubject(req.body);

    return res.status(201).json({
      success: true,
      message: "Mata pelajaran berhasil ditambahkan.",
      data: subject,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Kode mata pelajaran sudah digunakan.",
      });
    }

    next(error);
  }
}

export async function updateSubjectController(req, res, next) {
  try {
    const subject = await updateSubject(req.params.id, req.body);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Mata pelajaran tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mata pelajaran berhasil diperbarui.",
      data: subject,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Kode mata pelajaran sudah digunakan.",
      });
    }

    next(error);
  }
}

export async function updateSubjectStatusController(req, res, next) {
  try {
    const subject = await updateSubjectStatus(req.params.id, req.body.isActive);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Mata pelajaran tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: subject.isActive
        ? "Mata pelajaran berhasil diaktifkan."
        : "Mata pelajaran berhasil dinonaktifkan.",
      data: subject,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProgramSubjectsController(req, res, next) {
  try {
    const result = await getSubjectsByProgram(req.params.programId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Program tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mata pelajaran program berhasil diambil.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProgramSubjectsController(req, res, next) {
  try {
    const result = await updateProgramSubjects(
      req.params.programId,
      req.body.subjects,
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Program tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Relasi mata pelajaran program berhasil diperbarui.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
