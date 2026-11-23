import {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  updateBranchStatus,
  getActiveBranchesForParent,
} from "../services/branch.service.js";

// GET: Mengambil seluruh cabang
export async function listBranches(req, res, next) {
  try {
    const { search = "", isActive, page = "1", limit = "10" } = req.query;

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

    let activeFilter;

    if (isActive !== undefined) {
      if (isActive !== "true" && isActive !== "false") {
        return res.status(400).json({
          success: false,
          message: "Parameter isActive harus true atau false.",
        });
      }

      activeFilter = isActive === "true";
    }

    const result = await getAllBranches({
      search: String(search).trim(),
      isActive: activeFilter,
      page: parsedPage,
      limit: parsedLimit,
    });

    return res.status(200).json({
      success: true,
      message: "Daftar cabang berhasil diambil.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

// GET: Mengambil detail cabang
export async function detailBranch(req, res, next) {
  try {
    const branch = await getBranchById(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Cabang tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detail cabang berhasil diambil.",
      data: branch,
    });
  } catch (error) {
    return next(error);
  }
}

// POST: Membuat cabang baru
export async function storeBranch(req, res, next) {
  try {
    const branch = await createBranch(req.body);

    return res.status(201).json({
      success: true,
      message: "Cabang berhasil ditambahkan.",
      data: branch,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Kode cabang sudah digunakan.",
      });
    }

    return next(error);
  }
}

// PUT: Memperbarui data cabang
export async function editBranch(req, res, next) {
  try {
    const branch = await updateBranch(req.params.id, req.body);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Cabang tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data cabang berhasil diperbarui.",
      data: branch,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Kode cabang sudah digunakan.",
      });
    }

    return next(error);
  }
}

// PATCH: Mengubah status cabang
export async function changeBranchStatus(req, res, next) {
  try {
    const branch = await updateBranchStatus(req.params.id, req.body.isActive);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Cabang tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Status cabang berhasil diperbarui.",
      data: branch,
    });
  } catch (error) {
    return next(error);
  }
}

// GET: Mengambil daftar unit aktif untuk Parent
export async function getParentBranches(req, res, next) {
  try {
    const branches = await getActiveBranchesForParent();

    return res.status(200).json({
      success: true,
      message: "Daftar unit berhasil diambil.",
      data: branches,
    });
  } catch (error) {
    return next(error);
  }
}
