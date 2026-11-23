import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProgramPublicService from "../Services/ProgramPublicService";

import { getProgramSlug } from "../Utils/ProgramSlug";

// ==========================================
// HELPERS
// ==========================================

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

function formatDeliveryType(value) {
  return DELIVERY_TYPES[value] || value || "-";
}

function formatLearningMethod(value) {
  return LEARNING_METHODS[value] || value || "-";
}

function formatDuration(value) {
  if (!value) return null;

  return `${value} menit`;
}

// ==========================================
// PUBLIC PROGRAMS SECTION
// ==========================================

export default function PublicProgramsSection() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPrograms = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await ProgramPublicService.getPrograms();

      setPrograms(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("Gagal mengambil program publik:", err);
      setError("Program belajar belum dapat dimuat. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#529F93]">
              PROGRAM ILYON ACADEMY
            </p>

            <h2 className="mt-3 text-3xl font-extrabold text-[#35485E]">
              Pilihan Program Belajar
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500">
              Temukan berbagai pilihan program pembelajaran yang tersedia untuk
              mendukung kebutuhan dan perkembangan peserta didik.
            </p>
          </div>

          <Link
            to="/programs"
            className="shrink-0 font-bold text-[#529F93] transition hover:text-[#35485E]"
          >
            Lihat Semua Program →
          </Link>
        </div>

        {/* LOADING */}

        {loading && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-3xl border border-gray-100 p-6"
              >
                <div className="h-12 w-12 rounded-2xl bg-gray-100" />
                <div className="mt-6 h-5 w-3/4 rounded bg-gray-100" />
                <div className="mt-4 h-3 w-full rounded bg-gray-100" />
                <div className="mt-2 h-3 w-2/3 rounded bg-gray-100" />
                <div className="mt-7 h-20 rounded-2xl bg-gray-100" />
              </div>
            ))}
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="mt-10 rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-600">{error}</p>

            <button
              type="button"
              onClick={loadPrograms}
              className="mt-4 rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#438B80]"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* EMPTY */}

        {!loading && !error && programs.length === 0 && (
          <div className="mt-10 rounded-2xl border border-gray-100 bg-gray-50 p-10 text-center">
            <p className="font-semibold text-[#35485E]">
              Belum ada program yang tersedia.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Silakan kunjungi kembali halaman ini nanti.
            </p>
          </div>
        )}

        {/* PROGRAM LIST */}

        {!loading && !error && programs.length > 0 && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => {
              const offerings = Array.isArray(program.offerings)
                ? program.offerings
                : [];

              const deliveryTypes = [
                ...new Set(
                  offerings.map((item) => item.deliveryType).filter(Boolean),
                ),
              ];

              return (
                <article
                  key={program.id}
                  className="group flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* PROGRAM HEADER */}

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF5F3] text-2xl text-[#529F93]">
                      ✦
                    </div>

                    <span className="rounded-full bg-[#EAF5F3] px-3 py-1 text-[10px] font-bold tracking-wide text-[#529F93]">
                      PROGRAM AKTIF
                    </span>
                  </div>

                  {/* PROGRAM INFO */}

                  <div className="mt-6">
                    <h3 className="text-xl font-extrabold leading-snug text-[#35485E]">
                      {program.programName}
                    </h3>

                    {program.programCode && (
                      <p className="mt-1 text-xs font-semibold tracking-wide text-[#529F93]">
                        {program.programCode}
                      </p>
                    )}

                    <p className="mt-4 min-h-[48px] text-sm leading-7 text-gray-500">
                      {program.description ||
                        "Program pembelajaran untuk mendukung perkembangan peserta didik."}
                    </p>
                  </div>

                  {/* DELIVERY TYPES */}

                  {deliveryTypes.length > 0 && (
                    <div className="mt-5">
                      <p className="text-xs font-bold text-[#35485E]">
                        Metode Pembelajaran
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {deliveryTypes.map((type) => (
                          <span
                            key={type}
                            className="rounded-full border border-[#529F93]/20 bg-[#F2F8F6] px-3 py-1.5 text-xs font-semibold text-[#529F93]"
                          >
                            {formatDeliveryType(type)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* OFFERINGS */}

                  <div className="mt-6 flex-1 border-t border-gray-100 pt-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-[#35485E]">
                        Pilihan Layanan
                      </p>

                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                        {offerings.length} layanan
                      </span>
                    </div>

                    {offerings.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {offerings.slice(0, 3).map((offering) => (
                          <div
                            key={offering.id}
                            className="rounded-2xl bg-gray-50 p-4"
                          >
                            <p className="text-sm font-bold text-[#35485E]">
                              {offering.offeringName}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600">
                                {formatDeliveryType(offering.deliveryType)}
                              </span>

                              {offering.learningMethod && (
                                <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600">
                                  {formatLearningMethod(
                                    offering.learningMethod,
                                  )}
                                </span>
                              )}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                              {offering.sessionDurationMinutes && (
                                <span>
                                  Durasi:{" "}
                                  {formatDuration(
                                    offering.sessionDurationMinutes,
                                  )}
                                </span>
                              )}

                              {offering.isUnlimited ? (
                                <span>Kuota fleksibel</span>
                              ) : offering.meetingQuota ? (
                                <span>{offering.meetingQuota} pertemuan</span>
                              ) : null}
                            </div>
                          </div>
                        ))}

                        {offerings.length > 3 && (
                          <p className="pt-1 text-center text-xs font-semibold text-[#529F93]">
                            + {offerings.length - 3} pilihan layanan lainnya
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl bg-gray-50 p-4 text-xs text-gray-500">
                        Informasi layanan belum tersedia.
                      </p>
                    )}
                  </div>

                  {/* ACTION */}

                  <Link
                    to={`/programs/${getProgramSlug(program)}`}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#529F93] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#438B80]"
                  >
                    Lihat Detail Program →
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        {/* FOOTER */}

        {!loading && !error && programs.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              to="/programs"
              className="inline-flex items-center justify-center rounded-xl border border-[#529F93]/30 px-6 py-3 text-sm font-bold text-[#529F93] transition hover:bg-[#EAF5F3]"
            >
              Jelajahi Semua Program →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
