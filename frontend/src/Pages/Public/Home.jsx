import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Building2,
  BriefcaseBusiness,
  Check,
  GraduationCap,
  Heart,
  House,
  Layers3,
  Laptop,
  Lightbulb,
  MapPin,
  Monitor,
  Shapes,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";

import DashboardPublicService from "../../Services/DashboardPublicService";
import PublicProgramsSection from "../../Components/PublicProgramsSection";

// ==========================================
// STATISTICS
// ==========================================

const STATISTICS = [
  { key: "students", label: "Siswa Terdaftar", icon: Users },
  { key: "branches", label: "Cabang & Unit", icon: Building2 },
  { key: "tutors", label: "Tutor", icon: GraduationCap },
  { key: "staff", label: "Tim Staff", icon: BriefcaseBusiness },
  { key: "programs", label: "Program Belajar", icon: BookOpen },
  { key: "offerings", label: "Pilihan Layanan", icon: Layers3 },
];

// ==========================================
// ADVANTAGES
// ==========================================

const ADVANTAGES = [
  {
    number: "01",
    icon: Lightbulb,
    title: "Pembelajaran Terarah",
    description:
      "Pembelajaran disusun dengan memperhatikan kebutuhan dan tahap perkembangan peserta didik.",
  },
  {
    number: "02",
    icon: House,
    title: "Pilihan Metode Fleksibel",
    description:
      "Tersedia pilihan pembelajaran online, onsite, dan home visit sesuai layanan yang tersedia.",
  },
  {
    number: "03",
    icon: UsersRound,
    title: "Dukungan Tenaga Pengajar",
    description:
      "Didukung tutor dan tim yang berperan dalam mendampingi proses pembelajaran.",
  },
  {
    number: "04",
    icon: Heart,
    title: "Beragam Pilihan Program",
    description:
      "Berbagai kategori pembelajaran untuk mendukung kebutuhan belajar peserta didik.",
  },
];

// ==========================================
// LEARNING METHODS
// ==========================================

const LEARNING_METHODS = [
  {
    title: "Online",
    subtitle: "Belajar dari mana saja",
    icon: Monitor,
    description:
      "Pembelajaran melalui media digital untuk memberikan fleksibilitas tempat belajar.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Onsite",
    subtitle: "Belajar di lokasi",
    icon: MapPin,
    description:
      "Pembelajaran secara langsung di lokasi cabang atau unit Ilyon Academy.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Home Visit",
    subtitle: "Belajar di rumah",
    icon: House,
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
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#70B8AE]/15 blur-3xl sm:h-80 sm:w-80" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-[#F2D9A9]/25 blur-3xl sm:h-80 sm:w-80" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-24">
          {/* HERO TEXT */}
          <div>
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#529F93]/20 bg-white/80 px-3 py-2 text-[10px] font-bold tracking-wide text-[#529F93] sm:px-4 sm:text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#70B8AE]" />
              SELAMAT DATANG DI ILYON ACADEMY
            </div>

            <h1 className="mt-5 text-[2.35rem] font-extrabold leading-[1.15] tracking-tight text-[#35485E] sm:mt-6 sm:text-5xl lg:text-6xl">
              Setiap Anak Punya
              <span className="block text-[#529F93]">Potensi untuk</span>
              Bertumbuh.
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-[#647386] sm:mt-6 sm:text-lg sm:leading-8">
              Temukan pengalaman belajar yang mendukung kebutuhan, kemampuan,
              dan perjalanan perkembangan anak bersama Ilyon Academy.
            </p>

            {/* CTA */}
            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link
                to="/programs"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#529F93] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#529F93]/20 transition hover:-translate-y-0.5 hover:bg-[#438B80] sm:w-auto"
              >
                Jelajahi Program
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/about"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#529F93]/30 bg-white px-6 py-3.5 text-sm font-bold text-[#529F93] transition hover:bg-[#EAF5F3] sm:w-auto"
              >
                Tentang Ilyon
              </Link>
            </div>

            {/* BENEFITS */}
            <div className="mt-7 flex flex-col gap-3 text-xs text-[#647386] sm:mt-9 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:text-sm">
              <span className="flex items-center gap-2">
                <Check size={16} className="shrink-0 text-[#529F93]" />
                Pilihan program belajar
              </span>

              <span className="flex items-center gap-2">
                <Check size={16} className="shrink-0 text-[#529F93]" />
                Pilihan metode pembelajaran
              </span>
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="relative mx-auto mt-2 w-full max-w-md sm:mt-0 sm:max-w-xl">
            <div className="absolute -left-3 top-8 h-16 w-16 rotate-12 rounded-2xl bg-[#F1DDAF]/70 sm:-left-5 sm:h-24 sm:w-24 sm:rounded-3xl" />
            <div className="absolute -right-3 bottom-8 h-20 w-20 rounded-full bg-[#70B8AE]/25 sm:-right-4 sm:h-28 sm:w-28" />

            <div className="relative rounded-[1.5rem] border border-white bg-white p-2.5 shadow-2xl shadow-[#35485E]/10 sm:rounded-[2rem] sm:p-3">
              <div className="flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[1.1rem] bg-gradient-to-br from-[#529F93] to-[#79BDB3] p-5 text-white sm:min-h-[400px] sm:rounded-[1.5rem] sm:p-9">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-white/70 sm:text-xs">
                      ILYON ACADEMY
                    </p>

                    <p className="mt-2 text-xs font-medium text-white/90 sm:text-sm">
                      Learning & Growing Together
                    </p>
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 sm:h-14 sm:w-14 sm:rounded-2xl">
                    <Sparkles size={25} />
                  </div>
                </div>

                <div className="py-6 text-center sm:py-7">
                  <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-white/30 bg-white/15 shadow-inner sm:h-44 sm:w-44">
                    <BookOpen
                      size={58}
                      strokeWidth={1.4}
                      className="sm:hidden"
                    />
                    <BookOpen
                      size={88}
                      strokeWidth={1.3}
                      className="hidden sm:block"
                    />
                  </div>

                  <h2 className="mt-6 text-xl font-extrabold sm:mt-7 sm:text-3xl">
                    Belajar dengan Makna
                  </h2>

                  <p className="mx-auto mt-2 max-w-xs text-xs leading-6 text-white/85 sm:mt-3 sm:text-sm">
                    Mendukung proses belajar dan perkembangan setiap anak.
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-white/20 pt-4 text-[10px] font-semibold text-white/80 sm:pt-5 sm:text-xs">
                  <span>Explore</span>
                  <span>Learn</span>
                  <span>Grow</span>
                </div>
              </div>
            </div>

            {/* FLOATING INFO */}
            <div className="absolute -bottom-4 left-3 max-w-[90%] rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-lg sm:-bottom-5 sm:-left-9 sm:rounded-2xl sm:px-4 sm:py-3">
              <p className="text-[10px] text-gray-400 sm:text-xs">
                Pilihan pembelajaran
              </p>

              <p className="mt-1 text-xs font-bold text-[#35485E] sm:text-sm">
                Online • Onsite • Home Visit
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================== */}
      {/* STATISTICS */}
      {/* ====================================== */}

      <section className="relative z-10 mx-auto -mt-1 max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xl shadow-[#35485E]/5 sm:rounded-3xl sm:p-8">
          <div className="mb-6 text-center sm:mb-7">
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#529F93] sm:text-xs">
              ILYON ACADEMY
            </p>

            <h2 className="mt-2 text-xl font-extrabold text-[#35485E] sm:text-2xl">
              Ilyon dalam Angka
            </h2>

            <p className="mt-2 text-xs text-gray-500 sm:text-sm">
              Gambaran layanan dan sumber daya Ilyon Academy.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-6 lg:grid-cols-6">
            {STATISTICS.map((item) => {
              const Icon = item.icon;
              const value = statistics?.[item.key]?.total;

              return (
                <div key={item.key} className="text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF5F3] text-[#529F93] sm:h-12 sm:w-12 sm:rounded-2xl">
                    <Icon size={21} strokeWidth={1.8} />
                  </div>

                  <p className="mt-3 text-xl font-extrabold text-[#35485E] sm:text-2xl">
                    {statisticsLoading && !statistics
                      ? "..."
                      : statistics
                        ? formatNumber(value)
                        : "—"}
                  </p>

                  <p className="mt-1 text-[11px] font-medium leading-5 text-gray-500 sm:text-xs">
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

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid items-center gap-9 sm:gap-12 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#529F93] sm:text-xs">
              MENGENAL ILYON
            </p>

            <h2 className="mt-3 text-2xl font-extrabold leading-tight text-[#35485E] sm:mt-4 sm:text-4xl">
              Ruang untuk Belajar,
              <span className="block text-[#529F93]">
                Berkembang, dan Bertumbuh.
              </span>
            </h2>

            <p className="mt-4 text-sm leading-7 text-gray-600 sm:mt-5 sm:text-base sm:leading-8">
              Ilyon Academy hadir sebagai lembaga pembelajaran yang menyediakan
              berbagai pilihan program untuk mendukung kebutuhan pendidikan dan
              perkembangan peserta didik.
            </p>

            <p className="mt-3 text-sm leading-7 text-gray-600 sm:mt-4 sm:text-base sm:leading-8">
              Kami percaya bahwa proses belajar setiap anak memiliki perjalanan
              yang berbeda. Karena itu, pengalaman belajar perlu disesuaikan
              dengan kebutuhan dan tujuan pembelajaran.
            </p>

            <Link
              to="/about"
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#529F93] transition hover:gap-3 sm:mt-7"
            >
              Kenali Ilyon Academy lebih lanjut
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex min-h-40 flex-col justify-between rounded-2xl bg-[#EAF5F3] p-4 sm:min-h-48 sm:rounded-3xl sm:p-6">
              <Sparkles size={26} className="text-[#529F93]" />

              <div>
                <h3 className="text-sm font-bold text-[#35485E] sm:text-base">
                  Potensi
                </h3>

                <p className="mt-2 text-xs leading-6 text-gray-500 sm:text-sm">
                  Mendukung kemampuan dan potensi peserta didik.
                </p>
              </div>
            </div>

            <div className="mt-5 flex min-h-40 flex-col justify-between rounded-2xl bg-[#FFF5E3] p-4 sm:mt-8 sm:min-h-48 sm:rounded-3xl sm:p-6">
              <Heart size={26} className="text-[#C18C36]" />

              <div>
                <h3 className="text-sm font-bold text-[#35485E] sm:text-base">
                  Pendampingan
                </h3>

                <p className="mt-2 text-xs leading-6 text-gray-500 sm:text-sm">
                  Memperhatikan kebutuhan dalam proses belajar.
                </p>
              </div>
            </div>

            <div className="flex min-h-40 flex-col justify-between rounded-2xl bg-[#EEF0FA] p-4 sm:min-h-48 sm:rounded-3xl sm:p-6">
              <Layers3 size={26} className="text-indigo-500" />

              <div>
                <h3 className="text-sm font-bold text-[#35485E] sm:text-base">
                  Pengembangan
                </h3>

                <p className="mt-2 text-xs leading-6 text-gray-500 sm:text-sm">
                  Memberikan ruang untuk terus berkembang.
                </p>
              </div>
            </div>

            <div className="mt-5 flex min-h-40 flex-col justify-between rounded-2xl bg-[#FCEEF0] p-4 sm:mt-8 sm:min-h-48 sm:rounded-3xl sm:p-6">
              <Shapes size={26} className="text-pink-500" />

              <div>
                <h3 className="text-sm font-bold text-[#35485E] sm:text-base">
                  Kesempatan
                </h3>

                <p className="mt-2 text-xs leading-6 text-gray-500 sm:text-sm">
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

      <section className="bg-[#F2F8F6] py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#529F93] sm:text-xs">
              MENGAPA ILYON ACADEMY
            </p>

            <h2 className="mt-3 text-2xl font-extrabold text-[#35485E] sm:text-4xl">
              Mendukung Perjalanan Belajar
            </h2>

            <p className="mt-3 text-xs leading-7 text-gray-500 sm:text-sm">
              Kami menyediakan pilihan dan dukungan pembelajaran untuk membantu
              peserta didik menjalani proses belajar.
            </p>
          </div>

          <div className="mt-9 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {ADVANTAGES.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.number}
                  className="rounded-2xl border border-white bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF5F3] text-[#529F93] sm:h-12 sm:w-12 sm:rounded-2xl">
                      <Icon size={22} />
                    </div>

                    <span className="text-sm font-extrabold text-[#B9DCD6]">
                      {item.number}
                    </span>
                  </div>

                  <h3 className="mt-5 font-bold text-[#35485E] sm:mt-6">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs leading-7 text-gray-500 sm:mt-3 sm:text-sm">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================== */}
      {/* LEARNING METHODS */}
      {/* ====================================== */}

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#529F93] sm:text-xs">
              METODE PEMBELAJARAN
            </p>

            <h2 className="mt-3 text-2xl font-extrabold text-[#35485E] sm:text-3xl">
              Pilihan Cara Belajar
            </h2>

            <p className="mt-3 max-w-xl text-xs leading-7 text-gray-500 sm:text-sm">
              Kenali pilihan metode pembelajaran yang tersedia di Ilyon Academy.
            </p>
          </div>

          <Link
            to="/programs"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#529F93] transition hover:text-[#35485E]"
          >
            Lihat program
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="mt-7 grid gap-4 sm:mt-9 sm:grid-cols-2 sm:gap-5 md:grid-cols-3">
          {LEARNING_METHODS.map((method) => {
            const Icon = method.icon;

            return (
              <div
                key={method.title}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:rounded-3xl sm:p-7"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl sm:h-14 sm:w-14 sm:rounded-2xl ${method.color}`}
                >
                  <Icon size={24} />
                </div>

                <h3 className="mt-5 text-lg font-extrabold text-[#35485E] sm:mt-6 sm:text-xl">
                  {method.title}
                </h3>

                <p className="mt-1 text-sm font-semibold text-[#529F93]">
                  {method.subtitle}
                </p>

                <p className="mt-3 text-xs leading-7 text-gray-500 sm:mt-4 sm:text-sm">
                  {method.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ====================================== */}
      {/* PROGRAM CTA */}
      {/* ====================================== */}

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#35485E] to-[#49667B] px-5 py-9 text-white sm:rounded-[2rem] sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-28 h-56 w-56 rounded-full border-[30px] border-white/5 sm:h-72 sm:w-72 sm:border-[40px]" />
          <div className="pointer-events-none absolute -bottom-28 right-10 h-48 w-48 rounded-full bg-[#70B8AE]/10 sm:right-40 sm:h-64 sm:w-64" />

          <div className="relative max-w-2xl">
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#9BD2CA] sm:text-xs">
              MULAI PERJALANAN BELAJAR
            </p>

            <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:mt-4 sm:text-4xl">
              Temukan Program yang Sesuai dengan Kebutuhan Belajar.
            </h2>

            <p className="mt-4 text-xs leading-7 text-white/75 sm:mt-5 sm:text-base">
              Jelajahi berbagai pilihan program dan layanan pembelajaran yang
              tersedia di Ilyon Academy.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link
                to="/programs"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#70B8AE] px-6 py-3.5 text-sm font-bold text-[#26394D] transition hover:bg-[#8BCBC2] sm:w-auto"
              >
                Lihat Program Belajar
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/contact"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/30 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10 sm:w-auto"
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

      <section className="border-t border-gray-100 bg-white py-11 sm:py-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#529F93] sm:text-xs">
              BERGABUNG BERSAMA KAMI
            </p>

            <h2 className="mt-3 text-xl font-extrabold text-[#35485E] sm:text-2xl">
              Tumbuh dan Berkembang Bersama Ilyon Academy
            </h2>

            <p className="mt-2 text-xs leading-7 text-gray-500 sm:text-sm">
              Lihat kesempatan untuk berkontribusi sebagai bagian dari tim Ilyon
              Academy.
            </p>
          </div>

          <Link
            to="/recruitment"
            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[#529F93] px-6 py-3.5 text-sm font-bold text-[#529F93] transition hover:bg-[#EAF5F3] sm:w-auto"
          >
            Lihat Kesempatan Karier
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}
