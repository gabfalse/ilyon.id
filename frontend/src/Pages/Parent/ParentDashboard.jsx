import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Contexts/AuthContext";
import { getMyParentDashboard } from "../../Services/ParentService";

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await getMyParentDashboard();

        if (isMounted) {
          setDashboard(response?.data || null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Gagal mengambil data dashboard orang tua.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const userName = dashboard?.fullName || user?.fullName || "Orang Tua";

  const children = dashboard?.children || [];
  const statistics = dashboard?.statistics || {};

  const statisticCards = [
    {
      label: "Anak Terdaftar",
      value: statistics.totalChildren ?? children.length,
      icon: "♙",
    },
    {
      label: "Program Aktif",
      value: statistics.activePrograms ?? "—",
      icon: "▤",
    },
    {
      label: "Jadwal Mendatang",
      value: statistics.upcomingSchedules ?? "—",
      icon: "▦",
    },
    {
      label: "Tagihan Belum Dibayar",
      value: statistics.unpaidInvoices ?? "—",
      icon: "◎",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#35485E]">
          Dashboard Orang Tua
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Selamat datang, {userName}. Pantau aktivitas dan perkembangan belajar
          anak Anda.
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate("/parent/data-anak")}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#70B8AE] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5CA69B]"
      >
        <span>＋</span>
        Kelola Data Anak
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statisticCards.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{item.label}</p>

              <span className="text-2xl text-[#70B8AE]">{item.icon}</span>
            </div>

            <p className="mt-4 text-3xl font-extrabold text-[#35485E]">
              {loading ? "..." : item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Data Anak */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#35485E]">Anak Saya</h2>

            <p className="mt-1 text-sm text-gray-500">
              Daftar anak yang terhubung dengan akun orang tua Anda.
            </p>
          </div>

          {!loading && (
            <span className="rounded-full bg-[#EAF6F4] px-3 py-1 text-sm font-semibold text-[#4D9D92]">
              {children.length} Anak
            </span>
          )}
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-gray-400">Memuat data anak...</p>
        ) : children.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-200 p-8 text-center">
            <div className="text-3xl text-gray-300">♙</div>

            <p className="mt-3 font-semibold text-[#35485E]">
              Belum Ada Anak Terhubung
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Anak yang sudah dihubungkan dengan akun Anda akan ditampilkan di
              sini.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {children.map((child) => (
              <div
                key={child.id}
                className="rounded-xl border border-gray-100 p-5 transition hover:border-[#70B8AE]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#35485E]">
                      {child.fullName}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      {child.studentCode || "Kode siswa belum tersedia"}
                    </p>
                  </div>

                  <span className="rounded-full bg-[#EAF6F4] px-3 py-1 text-xs font-semibold text-[#4D9D92]">
                    {child.status || "Terdaftar"}
                  </span>
                </div>

                <div className="mt-4 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500">Hubungan</p>

                  <p className="mt-1 text-sm font-medium text-[#35485E]">
                    {child.relationshipLabel || "Tidak disebutkan"}
                  </p>
                </div>

                {child.canViewProgress && (
                  <div className="mt-3 text-xs font-medium text-[#4D9D92]">
                    <span className="mr-1">✓</span>
                    Akses perkembangan belajar tersedia
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aktivitas */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#35485E]">Jadwal Belajar</h2>

          <p className="mt-2 text-sm text-gray-500">
            Informasi jadwal belajar anak akan ditampilkan setelah integrasi
            jadwal Parent tersedia.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#35485E]">
            Perkembangan Belajar
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Laporan perkembangan belajar akan ditampilkan setelah integrasi
            laporan Parent tersedia.
          </p>
        </div>
      </div>
    </div>
  );
}
