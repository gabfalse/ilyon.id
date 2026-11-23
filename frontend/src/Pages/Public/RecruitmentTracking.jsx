import { useState } from "react";
import { Link } from "react-router-dom";

import { trackPublicRecruitmentApplication } from "../../Services/RecruitmentPublicService";

const STATUS_LABELS = {
  submitted: "Lamaran Diterima",
  screening: "Dalam Proses Seleksi Administrasi",
  shortlisted: "Lolos Seleksi Administrasi",
  interview: "Tahap Wawancara",
  accepted: "Diterima",
  rejected: "Tidak Lolos Seleksi",
  talent_pool: "Talent Pool",
  withdrawn: "Lamaran Ditarik",
};

function formatDate(date) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "Status belum tersedia";
}

function getStatusColor(status) {
  switch (status) {
    case "accepted":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "interview":
    case "shortlisted":
      return "bg-blue-100 text-blue-800";
    case "screening":
      return "bg-amber-100 text-amber-800";
    case "withdrawn":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-indigo-100 text-indigo-800";
  }
}

export default function RecruitmentTracking() {
  const [applicationNumber, setApplicationNumber] = useState("");
  const [trackingToken, setTrackingToken] = useState("");

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setApplication(null);

    const number = applicationNumber.trim();
    const token = trackingToken.trim();

    if (!number || !token) {
      setError("Nomor lamaran dan token pelacakan wajib diisi.");
      return;
    }

    try {
      setLoading(true);

      const result = await trackPublicRecruitmentApplication(number, token);

      setApplication(result);
    } catch (err) {
      setError(err.message || "Tidak dapat mengambil status lamaran.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* HEADER */}
        <div className="mb-8 text-center">
          <span className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
            RECRUITMENT TRACKING
          </span>

          <h1 className="mt-5 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Cek Status Lamaran
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600">
            Masukkan nomor lamaran dan token pelacakan yang kamu peroleh setelah
            berhasil mengirimkan lamaran.
          </p>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <label
              htmlFor="applicationNumber"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Nomor Lamaran
            </label>

            <input
              id="applicationNumber"
              type="text"
              value={applicationNumber}
              onChange={(event) => setApplicationNumber(event.target.value)}
              placeholder="Contoh: ILA-2026-XXXXXX"
              autoComplete="off"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="trackingToken"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Token Pelacakan
            </label>

            <input
              id="trackingToken"
              type="password"
              value={trackingToken}
              onChange={(event) => setTrackingToken(event.target.value)}
              placeholder="Masukkan token pelacakan"
              autoComplete="off"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Token bersifat rahasia. Jangan membagikannya kepada orang lain.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-primary px-6 py-3 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Memeriksa Lamaran..." : "Cek Status Lamaran"}
          </button>
        </form>

        {/* RESULT */}
        {application && (
          <section aria-live="polite" className="mt-8 space-y-6">
            {/* CURRENT STATUS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-bold uppercase tracking-wide text-primary">
                Hasil Pelacakan
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                {application.vacancyTitle}
              </h2>

              <div className="mt-5">
                <p className="text-sm text-slate-500">Nomor Lamaran</p>

                <p className="mt-1 font-bold text-slate-800">
                  {application.applicationNumber}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-sm text-slate-500">Status Saat Ini</p>

                <span
                  className={`mt-2 inline-flex rounded-full px-4 py-2 text-sm font-bold ${getStatusColor(application.status)}`}
                >
                  {getStatusLabel(application.status)}
                </span>
              </div>

              <div className="mt-5">
                <p className="text-sm text-slate-500">Tanggal Pengajuan</p>

                <p className="mt-1 font-semibold text-slate-800">
                  {formatDate(application.submittedAt)}
                </p>
              </div>
            </div>

            {/* HISTORY */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-extrabold text-slate-900">
                Riwayat Lamaran
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Perkembangan tahapan proses lamaran kamu.
              </p>

              {Array.isArray(application.history) &&
              application.history.length > 0 ? (
                <div className="mt-6 space-y-0">
                  {application.history.map((item, index) => (
                    <div
                      key={`${item.status}-${item.createdAt}-${index}`}
                      className="relative flex gap-4 pb-7 last:pb-0"
                    >
                      {index !== application.history.length - 1 && (
                        <div className="absolute bottom-0 left-[11px] top-6 w-0.5 bg-slate-200" />
                      )}

                      <div className="relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-primary/20 bg-primary" />

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800">
                          {getStatusLabel(item.status)}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Belum ada riwayat perubahan status.
                </p>
              )}
            </div>

            <p className="text-center text-xs leading-6 text-slate-500">
              Informasi ini menampilkan status dan riwayat tahapan lamaran yang
              tersedia pada sistem Ilyon Academy.
            </p>
          </section>
        )}

        {/* BACK LINK */}
        <div className="mt-8 text-center">
          <Link
            to="/recruitment"
            className="text-sm font-bold text-primary hover:underline"
          >
            ← Kembali ke halaman karier
          </Link>
        </div>
      </div>
    </main>
  );
}
