import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getPublicRecruitmentVacancies } from "../../Services/RecruitmentPublicService";

const EMPLOYMENT_LABELS = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Kontrak",
  internship: "Magang",
};

function formatDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function Recruitment() {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadVacancies() {
      try {
        setLoading(true);
        setError("");

        const result = await getPublicRecruitmentVacancies();

        if (active) {
          setVacancies(Array.isArray(result) ? result : []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Gagal mengambil daftar lowongan.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadVacancies();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HERO */}
      <section className="relative overflow-hidden bg-primary px-4 py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold">
              CAREER OPPORTUNITIES
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Tumbuh dan Berkembang Bersama Ilyon Academy
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">
              Bergabunglah bersama tim Ilyon Academy dan jadilah bagian dari
              perjalanan menciptakan pengalaman belajar yang menyenangkan dan
              bermakna bagi anak-anak.
            </p>

            <a
              href="#vacancies"
              className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 font-extrabold text-primary transition hover:bg-slate-100"
            >
              Lihat Lowongan
            </a>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section
        id="vacancies"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wider text-primary">
              Join Our Team
            </p>

            <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
              Lowongan Pekerjaan
            </h2>

            <p className="mt-3 text-slate-500">
              Temukan kesempatan untuk berkembang bersama kami.
            </p>
          </div>

          <Link
            to="/recruitment/tracking"
            className="text-sm font-bold text-primary hover:underline"
          >
            Lacak Lamaran Saya →
          </Link>
        </div>

        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p className="font-bold">Gagal memuat lowongan.</p>
            <p className="mt-2 text-sm">{error}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!loading && !error && vacancies.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="text-5xl">📋</div>

            <h3 className="mt-5 text-xl font-extrabold text-slate-900">
              Belum Ada Lowongan Tersedia
            </h3>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-500">
              Saat ini belum ada posisi yang dibuka. Silakan kunjungi halaman
              ini kembali untuk melihat kesempatan karier berikutnya.
            </p>
          </div>
        )}

        {!loading && !error && vacancies.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vacancies.map((vacancy) => (
              <article
                key={vacancy.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {EMPLOYMENT_LABELS[vacancy.employmentType] ||
                      vacancy.employmentType}
                  </span>

                  {vacancy.openings && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {vacancy.openings} posisi
                    </span>
                  )}
                </div>

                <h3 className="mt-5 text-xl font-extrabold text-slate-900">
                  {vacancy.title}
                </h3>

                <div className="mt-4 space-y-2 text-sm text-slate-500">
                  <p>
                    <span className="mr-2">📍</span>
                    {vacancy.location ||
                      vacancy.branchName ||
                      "Lokasi akan diinformasikan"}
                  </p>

                  {vacancy.closesAt && (
                    <p>
                      <span className="mr-2">📅</span>
                      Ditutup: {formatDate(vacancy.closesAt)}
                    </p>
                  )}
                </div>

                {vacancy.description && (
                  <p className="mt-5 line-clamp-3 text-sm leading-7 text-slate-600">
                    {vacancy.description}
                  </p>
                )}

                <div className="mt-auto pt-6">
                  <Link
                    to={`/recruitment/${vacancy.id}`}
                    className="flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white transition hover:opacity-90"
                  >
                    Lihat Detail Lowongan →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER CTA */}
      <section className="bg-white px-4 py-14">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Ingin Menjadi Bagian dari Ilyon Academy?
          </h2>

          <p className="mt-3 text-slate-500">
            Jelajahi peluang karier dan temukan posisi yang sesuai dengan
            kemampuanmu.
          </p>
        </div>
      </section>
    </div>
  );
}
