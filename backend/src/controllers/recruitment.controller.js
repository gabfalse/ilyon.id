import {
  getAllVacancies,
  getVacancyById,
  createVacancy,
  updateVacancy,
  updateVacancyStatus,
  deleteVacancy,
} from "../services/recruitment.service.js";

import { sendEmail } from "../services/email.service.js";

// ==========================================
// HELPER
// ==========================================

function getActorContext(req) {
  return {
    actorId: req.user.id,
    ipAddress: req.ip || null,
    userAgent: req.get("user-agent") || null,
  };
}

// ==========================================
// GET ALL VACANCIES
// ==========================================

export async function getVacancies(req, res, next) {
  try {
    const data = await getAllVacancies(req.validatedVacancyQuery);

    return res.status(200).json({
      success: true,
      message: "Daftar lowongan berhasil diambil.",
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET VACANCY DETAIL
// ==========================================

export async function getVacancyDetail(req, res, next) {
  try {
    const data = await getVacancyById(req.params.vacancyId);

    return res.status(200).json({
      success: true,
      message: "Detail lowongan berhasil diambil.",
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// CREATE VACANCY
// ==========================================

export async function createVacancyHandler(req, res, next) {
  try {
    const data = await createVacancy(req.body, getActorContext(req));

    return res.status(201).json({
      success: true,
      message: "Lowongan berhasil dibuat.",
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// UPDATE VACANCY
// ==========================================

export async function updateVacancyHandler(req, res, next) {
  try {
    const data = await updateVacancy(
      req.params.vacancyId,
      req.body,
      getActorContext(req),
    );

    return res.status(200).json({
      success: true,
      message: "Lowongan berhasil diperbarui.",
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// UPDATE VACANCY STATUS
// ==========================================

export async function updateVacancyStatusHandler(req, res, next) {
  try {
    const data = await updateVacancyStatus(
      req.params.vacancyId,
      req.body.status,
      getActorContext(req),
    );

    return res.status(200).json({
      success: true,
      message: "Status lowongan berhasil diperbarui.",
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// DELETE VACANCY
// ==========================================

export async function deleteVacancyHandler(req, res, next) {
  try {
    const data = await deleteVacancy(
      req.params.vacancyId,
      getActorContext(req),
    );

    return res.status(200).json({
      success: true,
      message: "Lowongan berhasil dihapus.",
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// TEST EMAIL
// ==========================================

export async function sendTestEmailHandler(req, res, next) {
  try {
    const recipient = req.user.email;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: "Email akun admin tidak tersedia.",
      });
    }

    const result = await sendEmail({
      to: recipient,
      subject: "Tes Email - Ilyon Academy",
      text: [
        `Halo ${req.user.fullName || "Admin"},`,
        "",
        "Email ini merupakan pengujian integrasi email Ilyon Academy.",
        "",
        "Jika email ini diterima, konfigurasi Resend berhasil.",
        "",
        "Ilyon Academy",
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Ilyon Academy</h2>
          <p>Halo ${String(req.user.fullName || "Admin").replace(
            /[&<>"']/g,
            (char) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              })[char],
          )},</p>
          <p>
            Email ini merupakan pengujian integrasi email
            Ilyon Academy.
          </p>
          <p>Jika email ini diterima, konfigurasi Resend berhasil.</p>
          <p>Ilyon Academy</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Email tes berhasil dikirim.",
      data: {
        recipient,
        messageId: result.messageId,
      },
    });
  } catch (error) {
    next(error);
  }
}
