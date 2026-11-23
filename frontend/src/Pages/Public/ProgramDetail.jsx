import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ProgramPublicService from "../../Services/ProgramPublicService";
import { getProgramSlug } from "../../Utils/ProgramSlug";

const DELIVERY_TYPES = {
  online: "Online",
  onsite: "Onsite",
  visit: "Home Visit",
};

const LEARNING_METHODS = {
  private: "Private",
  small_group: "Small Group",
  group: "Group",
};

const BILLING_PERIODS = {
  monthly: "Bulanan",
  per_session: "Per Pertemuan",
  weekly: "Mingguan",
  yearly: "Tahunan",
};

function formatValue(mapping, value) {
  return mapping[value] || value || "-";
}

export default function ProgramDetail() {
  const { slug } = useParams();

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProgram = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const programs = await ProgramPublicService.getPrograms();

      const selectedProgram = Array.isArray(programs)
        ? programs.find(
            (item) => getProgramSlug(item) === String(slug).toLowerCase(),
          )
        : null;

      setProgram(selectedProgram || null);
    } catch (err) {
      console.error("Gagal mengambil detail program:", err);
      setError("Detail program belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadProgram();
  }, [loadProgram]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-24 text-center">
        <p className="text-gray-500">Memuat detail program...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-24 text-center">
        <p className="text-red-600">{error}</p>

        <button
          onClick={loadProgram}
          className="mt-5 rounded-xl bg-[#529F93] px-6 py-3 font-bold text-white"
        >
          Coba Lagi
        </button>
      </main>
    );
  }

  if (!program) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-[#35485E]">
          Program Tidak Ditemukan
        </h1>

        <p className="mt-3 text-gray-500">
          Program yang kamu cari mungkin sudah tidak tersedia.
        </p>

        <Link
          to="/programs"
          className="mt-6 inline-flex rounded-xl bg-[#529F93] px-6 py-3 font-bold text-white"
        >
          Kembali ke Program
        </Link>
      </main>
    );
  }

  const offerings = Array.isArray(program.offerings) ? program.offerings : [];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* HERO */}
      <section className="bg-[#35485E] px-4 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <Link
            to="/programs"
            className="text-sm font-semibold text-[#A9D8CF] hover:text-white"
          >
            ← Semua Program
          </Link>

          <p className="mt-10 text-xs font-bold tracking-[0.2em] text-[#A9D8CF]">
            PROGRAM ILYON ACADEMY
          </p>

          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold sm:text-5xl">
            {program.programName}
          </h1>

          {program.programCode && (
            <p className="mt-4 text-sm font-semibold tracking-wider text-[#A9D8CF]">
              {program.programCode}
            </p>
          )}

          <p className="mt-6 max-w-2xl text-base leading-8 text-gray-200">
            {program.description ||
              "Program pembelajaran untuk mendukung kebutuhan dan perkembangan peserta didik."}
          </p>
        </div>
      </section>

      {/* DETAIL */}
      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-3">
          {/* INFORMASI PROGRAM */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-extrabold text-[#35485E]">
                Tentang Program
              </h2>

              <p className="mt-5 leading-8 text-gray-600">
                {program.description ||
                  "Informasi lengkap mengenai program ini dapat diperoleh melalui tim Ilyon Academy."}
              </p>

              {program.defaultDurationMinutes && (
                <div className="mt-6 rounded-2xl bg-[#F2F8F6] p-5">
                  <p className="text-xs font-bold text-gray-500">
                    DURASI DEFAULT
                  </p>
                  <p className="mt-2 text-lg font-bold text-[#35485E]">
                    {program.defaultDurationMinutes} menit
                  </p>
                </div>
              )}
            </div>

            {/* OFFERINGS */}
            <div className="mt-8">
              <h2 className="text-2xl font-extrabold text-[#35485E]">
                Pilihan Layanan
              </h2>

              <p className="mt-2 text-sm leading-7 text-gray-500">
                Pilih metode pembelajaran yang sesuai dengan kebutuhan peserta
                didik.
              </p>

              {offerings.length > 0 ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {offerings.map((offering) => (
                    <article
                      key={offering.id}
                      className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF5F3] text-xl text-[#529F93]">
                        ✦
                      </div>

                      <h3 className="mt-5 text-lg font-bold text-[#35485E]">
                        {offering.offeringName}
                      </h3>

                      {offering.offeringCode && (
                        <p className="mt-1 text-xs text-gray-400">
                          {offering.offeringCode}
                        </p>
                      )}

                      <div className="mt-5 space-y-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-gray-500">Metode</span>
                          <span className="font-semibold text-[#35485E]">
                            {formatValue(DELIVERY_TYPES, offering.deliveryType)}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-gray-500">Pembelajaran</span>
                          <span className="font-semibold text-[#35485E]">
                            {formatValue(
                              LEARNING_METHODS,
                              offering.learningMethod,
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-gray-500">Durasi</span>
                          <span className="font-semibold text-[#35485E]">
                            {offering.sessionDurationMinutes
                              ? `${offering.sessionDurationMinutes} menit`
                              : "-"}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-gray-500">Kuota</span>
                          <span className="font-semibold text-[#35485E]">
                            {offering.isUnlimited
                              ? "Tidak terbatas"
                              : offering.meetingQuota
                                ? `${offering.meetingQuota} pertemuan`
                                : "-"}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-gray-500">Periode</span>
                          <span className="font-semibold text-[#35485E]">
                            {formatValue(
                              BILLING_PERIODS,
                              offering.billingPeriod,
                            )}
                          </span>
                        </div>
                      </div>

                      {offering.description && (
                        <p className="mt-5 border-t border-gray-100 pt-4 text-sm leading-7 text-gray-500">
                          {offering.description}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-white p-6 text-sm text-gray-500">
                  Belum ada pilihan layanan aktif untuk program ini.
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <aside>
            <div className="sticky top-24 rounded-3xl bg-white p-7 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF5F3] text-2xl text-[#529F93]">
                ✦
              </div>

              <h2 className="mt-5 text-xl font-extrabold text-[#35485E]">
                Tertarik dengan program ini?
              </h2>

              <p className="mt-3 text-sm leading-7 text-gray-500">
                Hubungi tim Ilyon Academy untuk mendapatkan informasi lebih
                lanjut mengenai program dan pilihan layanan.
              </p>

              <Link
                to="/contact"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#529F93] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#438B80]"
              >
                Konsultasi Program
              </Link>

              <Link
                to="/programs"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-[#35485E] transition hover:bg-gray-50"
              >
                Lihat Program Lain
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
