import { Resend } from "resend";

// ==========================================
// CONFIGURATION
// ==========================================

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY belum dikonfigurasi.");
  }

  return new Resend(apiKey);
};

// ==========================================
// SEND EMAIL
// ==========================================

export const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  const from = process.env.RESEND_FROM_EMAIL;

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL belum dikonfigurasi.");
  }

  if (!to || !subject || (!html && !text)) {
    throw new Error("Data email belum lengkap.");
  }

  const resend = getResendClient();

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    const emailError = new Error(error.message || "Gagal mengirim email.");

    emailError.statusCode = 502;
    emailError.code = "EMAIL_PROVIDER_ERROR";

    throw emailError;
  }

  return {
    messageId: data?.id || null,
  };
};
