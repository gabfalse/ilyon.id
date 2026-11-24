import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../Contexts/AuthContext";
import DashboardPublicService from "../../Services/DashboardPublicService";

const QUICK_LINKS = [
  {
    title: "Program Belajar",
    description: "Kenali berbagai program pembelajaran Ilyon Academy.",
    path: "/programs",
    icon: "▤",
  },
  {
    title: "Pendaftaran Siswa",
    description: "Pelajari informasi dan proses pendaftaran siswa.",
    path: "/user/pengaturan-akun",
    icon: "♙",
  },
  {
    title: "Bergabung Bersama Ilyon",
    description:
      "Temukan kesempatan berkarier sebagai tutor maupun staff di Ilyon Academy.",
    path: "/recruitment",
    icon: "◎",
  },
];

// ==========================================
// STATISTIC CARDS
// ==========================================

const STATISTIC_CONFIG = [
  {
    key: "students",
    title: "Siswa",
    description: "Siswa terdaftar",
    icon: "♙",
    color: "bg-blue-50 text-blue-600",
  },
  // {
  //   key: "branches",
  //   title: "Cabang & Unit",
  //   description: "Termasuk kantor pusat",
  //   icon: "⌂",
  //   color: "bg-emerald-50 text-emerald-600",
  // },
  // {
  //   key: "tutors",
  //   title: "Tutor",
  //   description: "Tenaga pengajar",
  //   icon: "♧",
  //   color: "bg-violet-50 text-violet-600",
  // },
  // {
  //   key: "staff",
  //   title: "Staff",
  //   description: "Tim operasional",
  //   icon: "◎",
  //   color: "bg-orange-50 text-orange-600",
  // },
  {
    key: "programs",
    title: "Program",
    description: "Kategori pembelajaran",
    icon: "▤",
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    key: "offerings",
    title: "Program Offering",
    description: "Pilihan layanan belajar",
    icon: "▣",
    color: "bg-pink-50 text-pink-600",
  },
  // {
  //   key: "classes",
  //   title: "Kelas",
  //   description: "Kelas pembelajaran",
  //   icon: "▦",
  //   color: "bg-amber-50 text-amber-600",
  // },
];

// ==========================================
// NUMBER FORMATTER
// ==========================================

const formatNumber = (value) =>
  new Intl.NumberFormat("id-ID").format(Number(value) || 0);

// ==========================================
// USER DASHBOARD
// ==========================================

export default function UserDashboard() {
  const { user } = useAuth();

  const userName = user?.fullName || "Pengguna Ilyon";

  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // LOAD STATISTICS
  // ==========================================

  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await DashboardPublicService.getStatistics();

      setStatistics(result);
    } catch (err) {
      console.error("Dashboard statistics error:", err);

      setError(err.message || "Gagal mengambil statistik Ilyon Academy.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-8">
      {/* ====================================== */}
      {/* WELCOME BANNER */}
      {/* ====================================== */}

      <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#529F93] to-[#70B8AE] p-6 text-white sm:p-8">
        <p className="text-sm font-medium text-white/80">
          PORTAL PENGGUNA ILYON ACADEMY
        </p>

        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
          Selamat datang, {userName}!
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90 sm:text-base">
          Kenali Ilyon Academy, temukan program pembelajaran, dan akses berbagai
          informasi pendaftaran serta kesempatan bergabung bersama kami.
        </p>

        <Link
          to="/about"
          className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#529F93] transition hover:bg-[#F1F8F7]"
        >
          Mengenal Ilyon Academy
        </Link>
      </section>

      {/* ====================================== */}
      {/* STATISTICS */}
      {/* ====================================== */}

      <section>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#35485E]">
              Ilyon Academy dalam Angka
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Gambaran umum perkembangan dan layanan Ilyon Academy.
            </p>
          </div>

          <button
            type="button"
            onClick={loadStatistics}
            disabled={loading}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-[#70B8AE] hover:text-[#529F93] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className={loading ? "animate-spin" : ""}>↻</span>
            Perbarui data
          </button>
        </div>

        {/* LOADING */}

        {loading && !statistics && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {STATISTIC_CONFIG.map((item) => (
              <div
                key={item.key}
                className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5"
              >
                <div className="h-10 w-10 rounded-xl bg-gray-100" />
                <div className="mt-5 h-3 w-20 rounded bg-gray-100" />
                <div className="mt-3 h-7 w-16 rounded bg-gray-100" />
                <div className="mt-3 h-3 w-24 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        )}

        {/* ERROR */}

        {error && !statistics && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
            <p className="font-semibold text-red-700">
              Statistik belum dapat dimuat
            </p>

            <p className="mt-1 text-sm text-red-600">{error}</p>

            <button
              type="button"
              onClick={loadStatistics}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* STATISTIC CARDS */}

        {statistics && (
          <>
            {error && (
              <p className="mb-3 text-sm text-amber-600">
                Gagal memperbarui data. Menampilkan data terakhir yang berhasil
                dimuat.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {STATISTIC_CONFIG.map((item) => {
                const data = statistics[item.key] || {};

                return (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${item.color}`}
                    >
                      {item.icon}
                    </div>

                    <p className="mt-4 text-sm font-medium text-gray-500">
                      {item.title}
                    </p>

                    <p className="mt-1 text-3xl font-extrabold text-[#35485E]">
                      {formatNumber(data.total)}
                    </p>

                    <p className="mt-2 text-xs text-gray-400">
                      {item.description}
                    </p>

                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-500">
                        Aktif:{" "}
                        <span className="font-bold text-[#529F93]">
                          {formatNumber(data.active)}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Statistik ditampilkan berdasarkan data agregat database Ilyon
              Academy.
            </p>
          </>
        )}
      </section>

      {/* ====================================== */}
      {/* QUICK LINKS */}
      {/* ====================================== */}

      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold text-[#35485E]">
            Jelajahi Layanan Ilyon
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Pilih layanan yang ingin kamu ketahui.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="group rounded-2xl border border-gray-100 bg-white p-5 transition hover:-translate-y-1 hover:border-[#70B8AE] hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF5F3] text-xl text-[#529F93]">
                {item.icon}
              </div>

              <h3 className="mt-4 font-bold text-[#35485E] group-hover:text-[#529F93]">
                {item.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {item.description}
              </p>

              <p className="mt-4 text-sm font-semibold text-[#529F93]">
                Pelajari lebih lanjut
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ====================================== */}
      {/* INFORMATION */}
      {/* ====================================== */}

      <section className="rounded-2xl border border-[#F1E7D2] bg-[#FFF9EC] p-5 sm:p-6">
        <h2 className="font-bold text-[#35485E]">
          Satu akun untuk berbagai kebutuhan
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Gunakan portal ini untuk mengenal layanan Ilyon, mendapatkan informasi
          pendaftaran siswa, serta menemukan kesempatan bergabung bersama tim
          Ilyon Academy sebagai tutor maupun staff.
        </p>
      </section>
    </div>
  );
}
