import { useCallback, useEffect, useState } from "react";

import {
  getRecruitmentApplications,
  getRecruitmentApplicationById,
  getRecruitmentApplicationDocumentUrl,
  getRecruitmentApplicationTrackingToken,
  updateRecruitmentApplicationStatus,
} from "../../../Services/RecruitmentApplicationService";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "submitted", label: "Dikirim" },
  { value: "screening", label: "Seleksi Administrasi" },
  { value: "shortlisted", label: "Kandidat Terpilih" },
  { value: "interview", label: "Wawancara" },
  { value: "accepted", label: "Diterima" },
  { value: "rejected", label: "Ditolak" },
  { value: "talent_pool", label: "Talent Pool" },
  { value: "withdrawn", label: "Mengundurkan Diri" },
];

const STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.filter((item) => item.value).map((item) => [
    item.value,
    item.label,
  ]),
);

const STATUS_STYLES = {
  submitted: "bg-blue-100 text-blue-700",
  screening: "bg-yellow-100 text-yellow-700",
  shortlisted: "bg-indigo-100 text-indigo-700",
  interview: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  talent_pool: "bg-teal-100 text-teal-700",
  withdrawn: "bg-gray-100 text-gray-600",
};

const EMPLOYMENT_LABELS = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Kontrak",
  internship: "Magang",
};

const DOCUMENT_LABELS = {
  cv: "CV / Resume",
  resume: "CV / Resume",
  identity: "Identitas",
  education: "Pendidikan",
  certificate: "Sertifikat",
  portfolio: "Portofolio",
  other: "Dokumen Lainnya",
};

const VERIFICATION_LABELS = {
  pending: "Menunggu Verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatFileSize(bytes) {
  if (!bytes) return "-";

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {STATUS_LABELS[status] || status || "-"}
    </span>
  );
}

export default function RecruitmentApplications() {
  const [applications, setApplications] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedApplication, setSelectedApplication] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [nextStatus, setNextStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [openingDocumentId, setOpeningDocumentId] = useState(null);

  const [trackingTokenData, setTrackingTokenData] = useState(null);
  const [trackingTokenLoading, setTrackingTokenLoading] = useState(false);
  const [trackingTokenCopyMessage, setTrackingTokenCopyMessage] = useState("");

  // ==========================================
  // LOAD APPLICATIONS
  // ==========================================

  const loadApplications = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError("");

        const result = await getRecruitmentApplications({
          page,
          limit: 10,
          search,
          status,
        });

        setApplications(result?.items || []);
        setPagination(
          result?.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        );
      } catch (err) {
        setError(err.message || "Gagal mengambil daftar lamaran.");
      } finally {
        setLoading(false);
      }
    },
    [search, status],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadApplications(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [loadApplications]);

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    loadApplications(page);
  };

  // ==========================================
  // OPEN APPLICATION DETAIL
  // ==========================================

  const handleOpenDetail = async (applicationId) => {
    try {
      setDetailLoading(true);
      setDetailError("");
      setStatusMessage("");
      setSelectedApplication(null);

      setTrackingTokenData(null);
      setTrackingTokenCopyMessage("");

      const result = await getRecruitmentApplicationById(applicationId);

      setSelectedApplication(result);
      setNextStatus(result.status || "");
      setStatusNotes("");
    } catch (err) {
      setDetailError(err.message || "Gagal mengambil detail lamaran.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    if (statusLoading || openingDocumentId || trackingTokenLoading) return;

    setSelectedApplication(null);
    setTrackingTokenData(null);
    setTrackingTokenCopyMessage("");

    setDetailError("");
    setStatusMessage("");
    setStatusNotes("");
  };

  // ==========================================
  // TRACKING TOKEN
  // ==========================================

  const handleRevealTrackingToken = async () => {
    if (!selectedApplication || trackingTokenLoading) return;

    try {
      setTrackingTokenLoading(true);
      setTrackingTokenCopyMessage("");
      setDetailError("");

      const result = await getRecruitmentApplicationTrackingToken(
        selectedApplication.id,
      );

      setTrackingTokenData(result);
    } catch (err) {
      setDetailError(err.message || "Gagal mengambil token pelacakan.");
    } finally {
      setTrackingTokenLoading(false);
    }
  };

  const handleCopyTrackingToken = async () => {
    if (!trackingTokenData?.trackingToken) return;

    try {
      await navigator.clipboard.writeText(trackingTokenData.trackingToken);

      setTrackingTokenCopyMessage("Token berhasil disalin.");
    } catch {
      setTrackingTokenCopyMessage(
        "Gagal menyalin token. Silakan salin secara manual.",
      );
    }
  };

  // ==========================================
  // OPEN DOCUMENT
  // ==========================================

  const handleOpenDocument = async (document) => {
    const newWindow = window.open("about:blank", "_blank");

    if (!newWindow) {
      setDetailError(
        "Browser memblokir tab baru. Izinkan pop-up untuk membuka dokumen.",
      );
      return;
    }

    try {
      setOpeningDocumentId(document.id);
      setDetailError("");

      const result = await getRecruitmentApplicationDocumentUrl(
        selectedApplication.id,
        document.id,
      );

      if (!result?.url) {
        throw new Error("URL dokumen tidak tersedia.");
      }

      newWindow.opener = null;
      newWindow.location.href = result.url;
    } catch (err) {
      newWindow.close();
      setDetailError(err.message || "Gagal membuka dokumen.");
    } finally {
      setOpeningDocumentId(null);
    }
  };

  // ==========================================
  // UPDATE APPLICATION STATUS
  // ==========================================

  const handleUpdateStatus = async () => {
    if (!selectedApplication || !nextStatus) return;

    if (nextStatus === selectedApplication.status) {
      setStatusMessage("Pilih status yang berbeda dari status saat ini.");
      return;
    }

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin mengubah status lamaran ini menjadi "${STATUS_LABELS[nextStatus]}"?`,
    );

    if (!confirmed) return;

    try {
      setStatusLoading(true);
      setStatusMessage("");
      setDetailError("");

      await updateRecruitmentApplicationStatus(selectedApplication.id, {
        status: nextStatus,
        notes: statusNotes.trim() || null,
      });

      const updated = await getRecruitmentApplicationById(
        selectedApplication.id,
      );

      setSelectedApplication(updated);
      setNextStatus(updated.status);
      setStatusNotes("");
      setStatusMessage("Status lamaran berhasil diperbarui.");

      await loadApplications(pagination.page);
    } catch (err) {
      setDetailError(err.message || "Gagal memperbarui status lamaran.");
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SUMMARY */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Lamaran</p>
          <p className="mt-2 text-3xl font-bold text-[#35485E]">
            {pagination.total}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Lamaran Ditampilkan</p>
          <p className="mt-2 text-3xl font-bold text-[#529F93]">
            {applications.length}
          </p>
        </div>
      </div>

      {/* APPLICATION TABLE */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* FILTER */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 md:flex-row">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Contoh: nama pelamar, email, atau nomor lamaran..."
            aria-label="Cari lamaran"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#529F93] md:flex-1"
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter status lamaran"
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#529F93]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#FCFAF5] text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Nomor Lamaran</th>
                <th className="px-5 py-4 font-semibold">Pelamar</th>
                <th className="px-5 py-4 font-semibold">Lowongan</th>
                <th className="px-5 py-4 font-semibold">Pendidikan</th>
                <th className="px-5 py-4 font-semibold">Tanggal Kirim</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    Memuat daftar lamaran...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center">
                    <p className="font-medium text-gray-600">
                      Belum ada lamaran pekerjaan.
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Lamaran yang masuk akan muncul di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                applications.map((application) => (
                  <tr
                    key={application.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-4 font-semibold text-[#35485E]">
                      {application.applicationNumber || "-"}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-700">
                        {application.fullName || "-"}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {application.email || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-700">
                        {application.vacancyTitle || "-"}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {application.vacancyCode || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {application.educationLevel || "-"}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatDate(application.submittedAt)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={application.status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(application.id)}
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-[#529F93] transition hover:bg-[#529F93]/10"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center">
          <p className="text-xs text-gray-500">
            Total {pagination.total} lamaran
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={loading || pagination.page <= 1}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sebelumnya
            </button>

            <span className="px-2 text-xs text-gray-500">
              Halaman {pagination.page} dari {pagination.totalPages || 1}
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={loading || pagination.page >= pagination.totalPages}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL LOADING */}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-2xl bg-white px-8 py-6 text-sm text-gray-600 shadow-xl">
            Memuat detail lamaran...
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-4xl rounded-2xl bg-white shadow-xl">
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between border-b border-gray-100 p-6">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  Detail Lamaran
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedApplication.applicationNumber || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseDetail}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-6 p-6">
              {detailError && (
                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
                  {detailError}
                </div>
              )}

              {statusMessage && (
                <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
                  {statusMessage}
                </div>
              )}

              {/* PERSONAL INFORMATION */}
              <section>
                <h3 className="mb-4 font-semibold text-[#35485E]">
                  Informasi Pelamar
                </h3>

                <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-400">Nama Lengkap</p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {selectedApplication.fullName || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="mt-1 break-all text-sm text-gray-700">
                      {selectedApplication.email || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Telepon</p>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedApplication.phone || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Kota / Provinsi</p>
                    <p className="mt-1 text-sm text-gray-700">
                      {[selectedApplication.city, selectedApplication.province]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Alamat</p>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedApplication.address || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Pendidikan</p>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedApplication.educationLevel || "-"}
                      {selectedApplication.educationMajor
                        ? ` - ${selectedApplication.educationMajor}`
                        : ""}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Pengalaman</p>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedApplication.experienceYears ?? 0} tahun
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Status Saat Ini</p>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedApplication.currentOccupation || "-"}
                    </p>
                  </div>
                </div>
              </section>

              {/* VACANCY */}
              <section>
                <h3 className="mb-3 font-semibold text-[#35485E]">
                  Informasi Lowongan
                </h3>

                <div className="rounded-xl border border-gray-100 p-5">
                  <p className="font-semibold text-gray-700">
                    {selectedApplication.vacancyTitle || "-"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedApplication.vacancyCode || "-"} ·{" "}
                    {EMPLOYMENT_LABELS[selectedApplication.employmentType] ||
                      "-"}
                  </p>
                  <div className="mt-3">
                    <StatusBadge status={selectedApplication.status} />
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    Dikirim: {formatDate(selectedApplication.submittedAt)}
                  </p>
                </div>
              </section>

              {/* TRACKING TOKEN */}
              <section>
                <h3 className="mb-3 font-semibold text-[#35485E]">
                  Token Pelacakan Pelamar
                </h3>

                <div className="space-y-3 rounded-xl border border-gray-100 p-5">
                  <p className="text-sm text-gray-500">
                    Token ini digunakan pelamar untuk memeriksa perkembangan
                    proses rekrutmen melalui halaman cek status lamaran.
                    Tampilkan hanya jika diperlukan.
                  </p>

                  {!trackingTokenData ? (
                    <button
                      type="button"
                      onClick={handleRevealTrackingToken}
                      disabled={trackingTokenLoading}
                      className="rounded-xl bg-[#529F93] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#438D82] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {trackingTokenLoading
                        ? "Mengambil Token..."
                        : "Tampilkan Token Pelacakan"}
                    </button>
                  ) : trackingTokenData.available ? (
                    <>
                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="mb-2 text-xs font-medium text-gray-500">
                          Token Pelacakan
                        </p>

                        <p className="break-all font-mono text-sm font-semibold text-[#35485E]">
                          {trackingTokenData.trackingToken}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleCopyTrackingToken}
                          className="rounded-lg bg-[#529F93] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#438D82]"
                        >
                          Salin Token
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTrackingTokenData(null);
                            setTrackingTokenCopyMessage("");
                          }}
                          className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                        >
                          Sembunyikan Token
                        </button>
                      </div>

                      {trackingTokenCopyMessage && (
                        <p className="text-xs text-gray-500">
                          {trackingTokenCopyMessage}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
                      Token tidak tersedia untuk lamaran lama. Token pelacakan
                      lamaran ini belum tersimpan dalam format terenkripsi.
                    </div>
                  )}
                </div>
              </section>

              {/* COVER LETTER */}
              <section>
                <div className="mb-3">
                  <h3 className="font-semibold text-[#35485E]">
                    Punya kendaraan?{" "}
                    <span className="text-xs font-normal text-gray-400">
                      (Opsional)
                    </span>
                  </h3>

                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    Surat lamaran merupakan bagian tambahan untuk memperkenalkan
                    diri, menjelaskan motivasi, dan menyampaikan alasan melamar
                    posisi ini. Pelamar tidak wajib mengisinya. Jika
                    dikosongkan, proses lamaran tetap dapat dilanjutkan sesuai
                    persyaratan lowongan.
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-5 text-sm leading-relaxed text-gray-700">
                  {selectedApplication.coverLetter || (
                    <span className="italic text-gray-400">
                      Pelamar tidak menyertakan surat lamaran.
                    </span>
                  )}
                </div>

                {selectedApplication.portfolioUrl && (
                  <p className="mt-3 text-sm">
                    Portofolio:{" "}
                    <a
                      href={selectedApplication.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all font-medium text-[#529F93] underline"
                    >
                      Buka portofolio
                    </a>
                  </p>
                )}
              </section>

              {/* DOCUMENTS */}
              <section>
                <h3 className="mb-3 font-semibold text-[#35485E]">
                  Dokumen Pendukung
                </h3>

                {selectedApplication.documents?.length ? (
                  <div className="space-y-3">
                    {selectedApplication.documents.map((document) => (
                      <div
                        key={document.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="font-medium text-gray-700">
                            {document.documentName ||
                              document.originalFileName ||
                              "Dokumen"}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {DOCUMENT_LABELS[document.documentType] ||
                              document.documentType ||
                              "Dokumen"}{" "}
                            · {formatFileSize(document.fileSizeBytes)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {VERIFICATION_LABELS[document.verificationStatus] ||
                              document.verificationStatus ||
                              "-"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenDocument(document)}
                          disabled={openingDocumentId === document.id}
                          className="rounded-lg bg-[#529F93] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#438D82] disabled:opacity-50"
                        >
                          {openingDocumentId === document.id
                            ? "Membuka..."
                            : "Buka Dokumen"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">
                    Belum ada dokumen pendukung.
                  </p>
                )}
              </section>

              {/* UPDATE STATUS */}
              <section>
                <h3 className="mb-3 font-semibold text-[#35485E]">
                  Perbarui Status Lamaran
                </h3>

                {selectedApplication.convertedUserId ? (
                  <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                    Lamaran ini sudah dikonversi menjadi profil personel.
                  </p>
                ) : (
                  <div className="space-y-3 rounded-xl border border-gray-100 p-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Status Lamaran
                      </label>

                      <select
                        value={nextStatus}
                        onChange={(event) => setNextStatus(event.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#529F93]"
                      >
                        {STATUS_OPTIONS.filter(
                          (option) => option.value !== "",
                        ).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Catatan Perubahan Status{" "}
                        <span className="font-normal text-gray-400">
                          (Opsional)
                        </span>
                      </label>

                      <textarea
                        value={statusNotes}
                        onChange={(event) => setStatusNotes(event.target.value)}
                        rows={3}
                        placeholder="Contoh: Dokumen lengkap, dijadwalkan wawancara, atau menunggu hasil seleksi."
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#529F93]"
                      />

                      <p className="mt-1 text-xs text-gray-400">
                        Isi jika ada informasi tambahan mengenai perubahan
                        status. Boleh dikosongkan jika tidak ada catatan.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleUpdateStatus}
                      disabled={
                        statusLoading ||
                        !nextStatus ||
                        nextStatus === selectedApplication.status
                      }
                      className="rounded-xl bg-[#529F93] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#438D82] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {statusLoading ? "Menyimpan..." : "Simpan Status"}
                    </button>
                  </div>
                )}
              </section>

              {/* HISTORY */}
              <section>
                <h3 className="mb-3 font-semibold text-[#35485E]">
                  Riwayat Perubahan Status
                </h3>

                {selectedApplication.history?.length ? (
                  <div className="space-y-4">
                    {selectedApplication.history.map((item) => (
                      <div
                        key={item.id}
                        className="border-l-2 border-[#529F93] py-1 pl-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={item.fromStatus} />
                          <span className="text-xs text-gray-400">→</span>
                          <StatusBadge status={item.toStatus} />
                        </div>

                        <p className="mt-2 text-xs text-gray-500">
                          {formatDate(item.createdAt)}
                          {item.changedByName ? ` · ${item.changedByName}` : ""}
                        </p>

                        {item.notes && (
                          <p className="mt-2 text-sm text-gray-600">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">
                    Belum ada riwayat perubahan status.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
