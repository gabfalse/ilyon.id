const stats = [
  {
    title: "Total Cabang",
    value: "—",
    description: "Jumlah seluruh cabang",
    icon: "🏢",
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Siswa Aktif",
    value: "—",
    description: "Siswa yang sedang belajar",
    icon: "👨‍🎓",
    color: "bg-teal-50 text-teal-600",
  },
  {
    title: "Tutor Aktif",
    value: "—",
    description: "Tutor terdaftar",
    icon: "👩‍🏫",
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "Staff Aktif",
    value: "—",
    description: "Staff operasional terdaftar",
    icon: "👥",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Pendapatan Bulan Ini",
    value: "Rp 0",
    description: "Total pembayaran terverifikasi",
    icon: "💰",
    color: "bg-yellow-50 text-yellow-600",
  },
];

const activities = [
  {
    title: "Belum ada aktivitas",
    description: "Aktivitas terbaru akan ditampilkan di sini.",
    time: "—",
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-[#70B8AE]">Ilyon Academy</p>

        <h1 className="mt-1 text-2xl font-bold text-[#35485E]">
          Dashboard Admin Pusat
        </h1>

        <p className="mt-2 text-sm text-[#87919D]">
          Pantau aktivitas dan perkembangan seluruh cabang Ilyon Academy.
        </p>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[#87919D]">{item.title}</p>

                <h2 className="mt-3 text-2xl font-bold text-[#35485E]">
                  {item.value}
                </h2>
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${item.color}`}
              >
                {item.icon}
              </div>
            </div>

            <p className="mt-4 text-xs text-[#87919D]">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Konten utama */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Performa cabang */}
        <section className="rounded-2xl border border-[#E9ECEF] bg-white p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#35485E]">Performa Cabang</h2>

              <p className="mt-1 text-sm text-[#87919D]">
                Ringkasan perkembangan setiap cabang.
              </p>
            </div>

            <span className="rounded-lg bg-[#F1F3F5] px-3 py-2 text-xs text-[#87919D]">
              Semua Cabang
            </span>
          </div>

          <div className="mt-8 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[#E9ECEF] p-6 text-center">
            <span className="text-3xl">📊</span>

            <p className="mt-3 text-sm font-semibold text-[#35485E]">
              Data performa belum tersedia
            </p>

            <p className="mt-1 text-xs text-[#87919D]">
              Grafik akan muncul setelah data cabang terhubung.
            </p>
          </div>
        </section>

        {/* Aktivitas terbaru */}
        <section className="rounded-2xl border border-[#E9ECEF] bg-white p-6">
          <h2 className="font-bold text-[#35485E]">Aktivitas Terbaru</h2>

          <p className="mt-1 text-sm text-[#87919D]">
            Aktivitas sistem secara keseluruhan.
          </p>

          <div className="mt-6 space-y-5">
            {activities.map((activity, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F3F5]">
                  <span className="text-sm">🔔</span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#35485E]">
                    {activity.title}
                  </p>

                  <p className="mt-1 text-xs text-[#87919D]">
                    {activity.description}
                  </p>

                  <p className="mt-2 text-xs text-[#A0A8B2]">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Informasi sistem */}
      <section className="rounded-2xl bg-[#EAF5F3] p-6">
        <h2 className="font-bold text-[#35485E]">
          Selamat datang di Ilyon Academy
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-[#617477]">
          Dashboard Admin Pusat digunakan untuk mengelola seluruh cabang,
          memantau siswa, tutor, dan staff, mengawasi keuangan, serta melihat
          perkembangan operasional Ilyon Academy.
        </p>
      </section>
    </div>
  );
}
