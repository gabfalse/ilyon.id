import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardPublicService from "../../Services/DashboardPublicService";

import PublicProgramsSection from "../../Components/PublicProgramsSection";

// ==========================================
// STATISTICS
// ==========================================

const STATISTICS = [
  { key: "students", label: "Siswa Terdaftar", icon: "♙" },
  { key: "branches", label: "Cabang & Unit", icon: "⌂" },
  { key: "tutors", label: "Tutor", icon: "♧" },
  { key: "staff", label: "Tim Staff", icon: "◎" },
  { key: "programs", label: "Program Belajar", icon: "▤" },
  { key: "offerings", label: "Pilihan Layanan", icon: "▣" },
];

const ADVANTAGES = [
  {
    number: "01",
    icon: "✦",
    title: "Pembelajaran Terarah",
    description:
      "Pembelajaran disusun dengan memperhatikan kebutuhan dan tahap perkembangan peserta didik.",
  },
  {
    number: "02",
    icon: "⌂",
    title: "Pilihan Metode Fleksibel",
    description:
      "Tersedia pilihan pembelajaran online, onsite, dan home visit sesuai layanan yang tersedia.",
  },
  {
    number: "03",
    icon: "♧",
    title: "Dukungan Tenaga Pengajar",
    description:
      "Didukung tutor dan tim yang berperan dalam mendampingi proses pembelajaran.",
  },
  {
    number: "04",
    icon: "♡",
    title: "Beragam Pilihan Program",
    description:
      "Berbagai kategori pembelajaran untuk mendukung kebutuhan belajar peserta didik.",
  },
];

const LEARNING_METHODS = [
  {
    title: "Online",
    subtitle: "Belajar dari mana saja",
    icon: "⌘",
    description:
      "Pembelajaran melalui media digital untuk memberikan fleksibilitas tempat belajar.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Onsite",
    subtitle: "Belajar di lokasi",
    icon: "⌂",
    description:
      "Pembelajaran secara langsung di lokasi cabang atau unit Ilyon Academy.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Home Visit",
    subtitle: "Belajar di rumah",
    icon: "⌂",
    description:
      "Pilihan pembelajaran dengan kunjungan tutor ke lokasi peserta didik.",
    color: "bg-orange-50 text-orange-600",
  },
];

// ==========================================
// HELPERS
// ==========================================

const formatNumber = (value) =>
  new Intl.NumberFormat("id-ID").format(Number(value) || 0);

// ==========================================
// HOMEPAGE
// ==========================================

export default function Home() {
  const [statistics, setStatistics] = useState(null);
  const [statisticsLoading, setStatisticsLoading] = useState(true);

  const loadStatistics = useCallback(async () => {
    try {
      setStatisticsLoading(true);

      const result = await DashboardPublicService.getStatistics();
      setStatistics(result);
    } catch (error) {
      console.error("Gagal mengambil statistik homepage:", error);
    } finally {
      setStatisticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  return (
    <div className="overflow-hidden">
      {/* ====================================== */}
      {/* HERO */}
      {/* ====================================== */}

      <section className="relative overflow-hidden bg-gradient-to-br from-[#EAF5F3] via-[#F5FAF8] to-[#FFF8EA]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#70B8AE]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#F2D9A9]/25 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#529F93]/20 bg-white/80 px-4 py-2 text-xs font-bold tracking-wide text-[#529F93]">
              <span className="h-2 w-2 rounded-full bg-[#70B8AE]" />
              SELAMAT DATANG DI ILYON ACADEMY
            </div>

            <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-[#35485E] sm:text-5xl lg:text-6xl">
              Setiap Anak Punya
              <span className="block text-[#529F93]">Potensi untuk</span>
              Bertumbuh.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-[#647386] sm:text-lg">
              Temukan pengalaman belajar yang mendukung kebutuhan, kemampuan,
              dan perjalanan perkembangan anak bersama Ilyon Academy.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/programs"
                className="inline-flex items-center justify-center rounded-xl bg-[#529F93] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#529F93]/20 transition hover:-translate-y-0.5 hover:bg-[#438B80]"
              >
                Jelajahi Program →
              </Link>

              <Link
                to="/about"
                className="inline-flex items-center justify-center rounded-xl border border-[#529F93]/30 bg-white px-6 py-3.5 text-sm font-bold text-[#529F93] transition hover:bg-[#EAF5F3]"
              >
                Tentang Ilyon
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[#647386]">
              <span className="flex items-center gap-2">
                <span className="text-[#529F93]">✓</span>
                Pilihan program belajar
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[#529F93]">✓</span>
                Pilihan metode pembelajaran
              </span>
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-5 top-10 h-24 w-24 rounded-3xl bg-[#F1DDAF]/70 rotate-12" />
            <div className="absolute -right-4 bottom-8 h-28 w-28 rounded-full bg-[#70B8AE]/25" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-3 shadow-2xl shadow-[#35485E]/10">
              <div className="flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#529F93] to-[#79BDB3] p-7 text-white sm:min-h-[400px] sm:p-9">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-[0.2em] text-white/70">
                      ILYON ACADEMY
                    </p>
                    <p className="mt-2 text-sm font-medium text-white/90">
                      Learning & Growing Together
                    </p>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl">
                    ✦
                  </div>
                </div>

                <div className="py-7 text-center">
                  <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-white/30 bg-white/15 text-7xl shadow-inner sm:h-44 sm:w-44 sm:text-8xl">
                    📚
                  </div>

                  <h2 className="mt-7 text-2xl font-extrabold sm:text-3xl">
                    Belajar dengan Makna
                  </h2>

                  <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/85">
                    Mendukung proses belajar dan perkembangan setiap anak.
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-white/20 pt-5 text-xs font-semibold text-white/80">
                  <span>Explore</span>
                  <span>Learn</span>
                  <span>Grow</span>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-5 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-lg sm:-left-9">
              <p className="text-xs text-gray-400">Pilihan pembelajaran</p>
              <p className="mt-1 font-bold text-[#35485E]">
                Online • Onsite • Home Visit
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================== */}
      {/* STATISTICS */}
      {/* ====================================== */}

      <section className="relative z-10 mx-auto -mt-2 max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-[#35485E]/5 sm:p-8">
          <div className="mb-7 text-center">
            <p className="text-xs font-bold tracking-[0.2em] text-[#529F93]">
              ILYON ACADEMY
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#35485E]">
              Ilyon dalam Angka
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Gambaran layanan dan sumber daya Ilyon Academy.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {STATISTICS.map((item) => {
              const value = statistics?.[item.key]?.total;

              return (
                <div key={item.key} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF5F3] text-2xl text-[#529F93]">
                    {item.icon}
                  </div>

                  <p className="mt-3 text-2xl font-extrabold text-[#35485E]">
                    {statisticsLoading && !statistics
                      ? "..."
                      : statistics
                        ? formatNumber(value)
                        : "—"}
                  </p>

                  <p className="mt-1 text-xs font-medium text-gray-500">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================== */}
      {/* INTRODUCTION */}
      {/* ====================================== */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#529F93]">
              MENGENAL ILYON
            </p>

            <h2 className="mt-4 text-3xl font-extrabold leading-tight text-[#35485E] sm:text-4xl">
              Ruang untuk Belajar,
              <span className="block text-[#529F93]">
                Berkembang, dan Bertumbuh.
              </span>
            </h2>

            <p className="mt-5 text-sm leading-8 text-gray-600 sm:text-base">
              Ilyon Academy hadir sebagai lembaga pembelajaran yang menyediakan
              berbagai pilihan program untuk mendukung kebutuhan pendidikan dan
              perkembangan peserta didik.
            </p>

            <p className="mt-4 text-sm leading-8 text-gray-600 sm:text-base">
              Kami percaya bahwa proses belajar setiap anak memiliki perjalanan
              yang berbeda. Karena itu, pengalaman belajar perlu disesuaikan
              dengan kebutuhan dan tujuan pembelajaran.
            </p>

            <Link
              to="/about"
              className="mt-7 inline-flex items-center gap-2 font-bold text-[#529F93] transition hover:gap-3"
            >
              Kenali Ilyon Academy lebih lanjut →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex min-h-48 flex-col justify-between rounded-3xl bg-[#EAF5F3] p-6">
              <span className="text-3xl text-[#529F93]">✦</span>
              <div>
                <h3 className="font-bold text-[#35485E]">Potensi</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Mendukung kemampuan dan potensi peserta didik.
                </p>
              </div>
            </div>

            <div className="mt-8 flex min-h-48 flex-col justify-between rounded-3xl bg-[#FFF5E3] p-6">
              <span className="text-3xl text-[#C18C36]">♡</span>
              <div>
                <h3 className="font-bold text-[#35485E]">Pendampingan</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Memperhatikan kebutuhan dalam proses belajar.
                </p>
              </div>
            </div>

            <div className="flex min-h-48 flex-col justify-between rounded-3xl bg-[#EEF0FA] p-6">
              <span className="text-3xl text-indigo-500">◎</span>
              <div>
                <h3 className="font-bold text-[#35485E]">Pengembangan</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Memberikan ruang untuk terus berkembang.
                </p>
              </div>
            </div>

            <div className="mt-8 flex min-h-48 flex-col justify-between rounded-3xl bg-[#FCEEF0] p-6">
              <span className="text-3xl text-pink-500">✧</span>
              <div>
                <h3 className="font-bold text-[#35485E]">Kesempatan</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Beragam pilihan layanan pembelajaran.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================== */}
      {/* PUBLIC PROGRAMS */}
      {/* ====================================== */}

      <PublicProgramsSection />

      {/* ====================================== */}
      {/* ADVANTAGES */}
      {/* ====================================== */}
      <section className="bg-[#F2F8F6] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold tracking-[0.2em] text-[#529F93]">
              MENGAPA ILYON ACADEMY
            </p>

            <h2 className="mt-3 text-3xl font-extrabold text-[#35485E] sm:text-4xl">
              Mendukung Perjalanan Belajar
            </h2>

            <p className="mt-4 text-sm leading-7 text-gray-500">
              Kami menyediakan pilihan dan dukungan pembelajaran untuk membantu
              peserta didik menjalani proses belajar.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ADVANTAGES.map((item) => (
              <div
                key={item.number}
                className="rounded-2xl border border-white bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF5F3] text-2xl text-[#529F93]">
                    {item.icon}
                  </div>

                  <span className="text-sm font-extrabold text-[#B9DCD6]">
                    {item.number}
                  </span>
                </div>

                <h3 className="mt-6 font-bold text-[#35485E]">{item.title}</h3>

                <p className="mt-3 text-sm leading-7 text-gray-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================== */}
      {/* LEARNING METHODS */}
      {/* ====================================== */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#529F93]">
              METODE PEMBELAJARAN
            </p>

            <h2 className="mt-3 text-3xl font-extrabold text-[#35485E]">
              Pilihan Cara Belajar
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-7 text-gray-500">
              Kenali pilihan metode pembelajaran yang tersedia di Ilyon Academy.
            </p>
          </div>

          <Link
            to="/programs"
            className="font-bold text-[#529F93] transition hover:text-[#35485E]"
          >
            Lihat program →
          </Link>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {LEARNING_METHODS.map((method) => (
            <div
              key={method.title}
              className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${method.color}`}
              >
                {method.icon}
              </div>

              <h3 className="mt-6 text-xl font-extrabold text-[#35485E]">
                {method.title}
              </h3>

              <p className="mt-1 text-sm font-semibold text-[#529F93]">
                {method.subtitle}
              </p>

              <p className="mt-4 text-sm leading-7 text-gray-500">
                {method.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================== */}
      {/* PROGRAM CTA */}
      {/* ====================================== */}

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#35485E] to-[#49667B] px-7 py-12 text-white sm:px-12 sm:py-16">
          <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full border-[40px] border-white/5" />
          <div className="absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-[#70B8AE]/10" />

          <div className="relative max-w-2xl">
            <p className="text-xs font-bold tracking-[0.2em] text-[#9BD2CA]">
              MULAI PERJALANAN BELAJAR
            </p>

            <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
              Temukan Program yang Sesuai dengan Kebutuhan Belajar.
            </h2>

            <p className="mt-5 text-sm leading-7 text-white/75 sm:text-base">
              Jelajahi berbagai pilihan program dan layanan pembelajaran yang
              tersedia di Ilyon Academy.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/programs"
                className="rounded-xl bg-[#70B8AE] px-6 py-3.5 text-sm font-bold text-[#26394D] transition hover:bg-[#8BCBC2]"
              >
                Lihat Program Belajar →
              </Link>

              <Link
                to="/contact"
                className="rounded-xl border border-white/30 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Hubungi Ilyon
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================== */}
      {/* RECRUITMENT CTA */}
      {/* ====================================== */}

      <section className="border-t border-gray-100 bg-white py-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#529F93]">
              BERGABUNG BERSAMA KAMI
            </p>

            <h2 className="mt-3 text-2xl font-extrabold text-[#35485E]">
              Tumbuh dan Berkembang Bersama Ilyon Academy
            </h2>

            <p className="mt-2 text-sm leading-7 text-gray-500">
              Lihat kesempatan untuk berkontribusi sebagai bagian dari tim Ilyon
              Academy.
            </p>
          </div>

          <Link
            to="/recruitment"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#529F93] px-6 py-3.5 text-sm font-bold text-[#529F93] transition hover:bg-[#EAF5F3]"
          >
            Lihat Kesempatan Karier →
          </Link>
        </div>
      </section>
    </div>
  );
}
