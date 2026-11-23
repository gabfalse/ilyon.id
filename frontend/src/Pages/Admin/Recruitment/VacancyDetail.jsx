import { useEffect, useState } from "react";
import { getRecruitmentVacancyById } from "../../../Services/RecruitmentService";

const EMPLOYMENT_LABELS = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Kontrak",
  internship: "Magang",
};

const STATUS_LABELS = {
  draft: "Draft",
  published: "Terbit",
  closed: "Ditutup",
  archived: "Diarsipkan",
};

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-700",
  archived: "bg-yellow-100 text-yellow-700",
};

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function DetailItem({ label, children }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <div className="text-sm text-[#35485E]">{children || "-"}</div>
    </div>
  );
}

export default function VacancyDetail({ vacancyId, onClose }) {
  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      try {
        setLoading(true);
        setError("");

        const result = await getRecruitmentVacancyById(vacancyId);

        if (active) {
          setVacancy(result?.vacancy || result);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Gagal mengambil detail lowongan.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (vacancyId) {
      loadDetail();
    } else {
      setError("ID lowongan tidak ditemukan.");
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [vacancyId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#FCFAF5] shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-[#FCFAF5] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-[#35485E]">
              Detail Lowongan
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Informasi lengkap posisi pekerjaan
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Tutup detail"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">
              Memuat detail lowongan...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : vacancy ? (
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      STATUS_STYLES[vacancy.status] ||
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_LABELS[vacancy.status] || vacancy.status || "-"}
                  </span>

                  <span className="rounded-full bg-[#529F93]/10 px-3 py-1 text-xs font-semibold text-[#529F93]">
                    {EMPLOYMENT_LABELS[vacancy.employmentType] ||
                      vacancy.employmentType ||
                      "-"}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-[#35485E]">
                  {vacancy.title || "-"}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  {vacancy.vacancyCode || "-"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 rounded-xl border border-gray-100 bg-white p-5 sm:grid-cols-2">
                {/* <DetailItem label="Cabang">
                  {vacancy.branchName || "Tidak terikat cabang"}
                </DetailItem> */}

                <DetailItem label="Lokasi">{vacancy.location}</DetailItem>

                <DetailItem label="Jumlah Dibutuhkan">
                  {vacancy.openings ? `${vacancy.openings} orang` : "-"}
                </DetailItem>

                <DetailItem label="Batas Lamaran">
                  {formatDate(vacancy.closesAt)}
                </DetailItem>

                <DetailItem label="Tanggal Dibuat">
                  {formatDate(vacancy.createdAt)}
                </DetailItem>

                <DetailItem label="Terakhir Diperbarui">
                  {formatDate(vacancy.updatedAt)}
                </DetailItem>

                <DetailItem label="Tanggal Dipublikasikan">
                  {formatDate(vacancy.publishedAt)}
                </DetailItem>
              </div>

              <div className="space-y-5">
                <section>
                  <h4 className="mb-2 font-semibold text-[#35485E]">
                    Deskripsi Pekerjaan
                  </h4>
                  <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
                    {vacancy.description || "-"}
                  </p>
                </section>

                <section>
                  <h4 className="mb-2 font-semibold text-[#35485E]">
                    Tanggung Jawab
                  </h4>
                  <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
                    {vacancy.responsibilities || "-"}
                  </p>
                </section>

                <section>
                  <h4 className="mb-2 font-semibold text-[#35485E]">
                    Persyaratan
                  </h4>
                  <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
                    {vacancy.requirements || "-"}
                  </p>
                </section>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#35485E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#29394c]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
