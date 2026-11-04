
const programs = [
  {
    name: "Calistung",
    description: "Belajar membaca, menulis, dan berhitung dengan metode menyenangkan.",
    level: "PAUD - SD",
    color: "bg-[#E7F3F0]",
    iconColor: "text-[#529F93]",
    icon: "✏️",
  },
  {
    name: "Matematika",
    description: "Memahami konsep matematika dan melatih kemampuan memecahkan soal.",
    level: "PAUD - SMP",
    color: "bg-[#FFF4D9]",
    iconColor: "text-[#C49430]",
    icon: "🔢",
  },
  {
    name: "English",
    description: "Mengembangkan kemampuan bahasa Inggris melalui aktivitas interaktif.",
    level: "PAUD - SMP",
    color: "bg-[#EAF1F9]",
    iconColor: "text-[#6098C8]",
    icon: "🌎",
  },
  {
    name: "Mandarin & Jepang",
    description: "Mengenal bahasa asing dan membangun kemampuan komunikasi sejak dini.",
    level: "Anak - Remaja",
    color: "bg-[#F1EAF5]",
    iconColor: "text-[#9A7DB0]",
    icon: "🌸",
  },
];

const benefits = [
  {
    number: "01",
    title: "Belajar Sesuai Kemampuan",
    description:
      "Materi disesuaikan dengan kemampuan dan perkembangan masing-masing siswa.",
    color: "bg-[#E7F3F0]",
    icon: "🎯",
  },
  {
    number: "02",
    title: "Pendampingan Tutor",
    description:
      "Setiap siswa mendapatkan pendampingan dan arahan selama proses belajar.",
    color: "bg-[#F1EAF5]",
    icon: "👩‍🏫",
  },
  {
    number: "03",
    title: "Evaluasi Berkala",
    description:
      "Kemajuan belajar dipantau melalui latihan, penilaian, dan evaluasi.",
    color: "bg-[#FFF4D9]",
    icon: "📈",
  },
  {
    number: "04",
    title: "Laporan Perkembangan",
    description:
      "Orang tua dapat mengetahui aktivitas dan perkembangan belajar anak.",
    color: "bg-[#FBEAEA]",
    icon: "📖",
  },
];

const learningSteps = [
  {
    number: "1",
    title: "Kenali Kemampuan",
    description: "Kami mengenali kemampuan awal dan kebutuhan belajar siswa.",
  },
  {
    number: "2",
    title: "Belajar Bersama",
    description: "Siswa belajar dengan materi dan pendampingan yang sesuai.",
  },
  {
    number: "3",
    title: "Latihan & Evaluasi",
    description: "Kemampuan siswa dilatih dan dievaluasi secara berkala.",
  },
  {
    number: "4",
    title: "Pantau Perkembangan",
    description: "Perkembangan belajar dicatat agar orang tua dapat memantaunya.",
  },
];

function SectionHeading({ label, title, description }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <span className="mb-3 inline-flex rounded-full bg-[#E7F3F0] px-4 py-2 text-sm font-bold text-[#529F93]">
        {label}
      </span>
      <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="overflow-hidden bg-background">

      {/* HERO SECTION */}
      <section className="relative px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:px-12 lg:pb-28">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#70B8AE]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-0 h-72 w-72 rounded-full bg-[#9A7DB0]/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">

          {/* Hero Text */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#70B8AE]/30 bg-white px-4 py-2 text-sm font-semibold text-[#529F93] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#70B8AE]" />
              Tempat Belajar dan Berkembang
            </span>

            <h1 className="mt-7 text-4xl font-extrabold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Setiap Anak Punya Potensi,
              <span className="text-[#70B8AE]"> Saatnya Bersinar!</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              Bersama Ilyon Academy, temukan pengalaman belajar yang
              menyenangkan, terarah, dan sesuai dengan kemampuan setiap anak.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#pendaftaran"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#70B8AE] px-7 py-3.5 font-bold text-white shadow-lg shadow-[#70B8AE]/20 transition hover:-translate-y-1 hover:bg-[#529F93]"
              >
                Daftar Sekarang
                <span>→</span>
              </a>

              <a
                href="#program"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-7 py-3.5 font-bold text-foreground transition hover:border-[#70B8AE] hover:text-[#529F93]"
              >
                Lihat Program
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="text-[#70B8AE]">✓</span>
                Belajar sesuai kemampuan
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[#70B8AE]">✓</span>
                Pendampingan tutor
              </span>
            </div>
          </div>

          {/* Hero Illustration */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute inset-5 rounded-[3rem] bg-[#70B8AE]/15 rotate-6" />

            <div className="relative overflow-hidden rounded-[2.5rem] border border-white bg-white p-5 shadow-2xl shadow-[#35485E]/10 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Welcome to
                  </p>
                  <h3 className="text-xl font-extrabold text-foreground">
                    Ilyon
                  </h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F3F0] text-2xl">
                  🌱
                </div>
              </div>

              <div className="mt-7 rounded-3xl bg-[#FCFAF5] p-6 text-center">
                <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border-[8px] border-[#70B8AE]/20 bg-white text-6xl shadow-sm">
                  📚
                </div>
                <h3 className="mt-5 text-2xl font-extrabold text-foreground">
                  Belajar dengan Bahagia!
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Langkah kecil hari ini, prestasi besar di masa depan.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-[#E7F3F0] p-3 text-center">
                  <div className="text-2xl">✏️</div>
                  <p className="mt-2 text-xs font-bold text-[#529F93]">
                    Calistung
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FFF4D9] p-3 text-center">
                  <div className="text-2xl">🔢</div>
                  <p className="mt-2 text-xs font-bold text-[#C49430]">
                    Math
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F1EAF5] p-3 text-center">
                  <div className="text-2xl">🌎</div>
                  <p className="mt-2 text-xs font-bold text-[#9A7DB0]">
                    Language
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -left-5 top-24 hidden rounded-2xl bg-white p-4 shadow-xl sm:block">
              <span className="text-2xl">⭐</span>
              <p className="mt-1 text-xs font-bold text-foreground">
                Terus Berkembang!
              </p>
            </div>

            <div className="absolute -bottom-5 -right-3 hidden rounded-2xl bg-white p-4 shadow-xl sm:block">
              <span className="text-2xl">💡</span>
              <p className="mt-1 text-xs font-bold text-foreground">
                Temukan Potensi
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BRAND VALUES */}
      <section className="border-y border-border bg-white px-5 py-7 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-4 text-center sm:gap-x-16">
          <span className="text-lg font-extrabold tracking-wide text-[#E78282]">
            Belajar
          </span>
          <span className="hidden h-2 w-2 rounded-full bg-[#E78282] sm:block" />
          <span className="text-lg font-extrabold tracking-wide text-[#70B8AE]">
            Berkembang
          </span>
          <span className="hidden h-2 w-2 rounded-full bg-[#70B8AE] sm:block" />
          <span className="text-lg font-extrabold tracking-wide text-[#6098C8]">
            Berprestasi
          </span>
        </div>
      </section>

      {/* BENEFITS SECTION */}
      <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            label="Kenapa Ilyon Academy?"
            title="Belajar Lebih Terarah, Berkembang Lebih Percaya Diri"
            description="Kami percaya setiap anak memiliki kemampuan yang unik. Karena itu, pengalaman belajar harus disesuaikan dengan kebutuhan masing-masing."
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((item) => (
              <div
                key={item.number}
                className="group rounded-3xl border border-border bg-white p-6 transition duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#35485E]/5"
              >
                <div className="flex items-center justify-between">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${item.color}`}>
                    {item.icon}
                  </div>
                  <span className="text-sm font-bold text-muted-foreground/50">
                    {item.number}
                  </span>
                </div>

                <h3 className="mt-6 text-lg font-extrabold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRAM SECTION */}
      <section id="program" className="bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            label="Program Pembelajaran"
            title="Temukan Program Belajar yang Tepat"
            description="Berbagai pilihan program pembelajaran yang dirancang untuk membantu siswa mengembangkan kemampuan dan potensinya."
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {programs.map((program) => (
              <div
                key={program.name}
                className="group overflow-hidden rounded-3xl border border-border bg-white transition duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className={`flex h-44 items-center justify-center ${program.color}`}>
                  <span className="text-7xl transition duration-300 group-hover:scale-110">
                    {program.icon}
                  </span>
                </div>

                <div className="p-6">
                  <span className={`text-xs font-bold ${program.iconColor}`}>
                    {program.level}
                  </span>
                  <h3 className="mt-2 text-xl font-extrabold text-foreground">
                    {program.name}
                  </h3>
                  <p className="mt-3 min-h-20 text-sm leading-7 text-muted-foreground">
                    {program.description}
                  </p>

                  <a
                    href="#pendaftaran"
                    className={`mt-5 inline-flex items-center gap-2 text-sm font-bold ${program.iconColor} transition hover:gap-3`}
                  >
                    Pelajari lebih lanjut <span>→</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <a
              href="#pendaftaran"
              className="inline-flex items-center gap-2 rounded-xl border border-[#70B8AE] px-7 py-3 font-bold text-[#529F93] transition hover:bg-[#E7F3F0]"
            >
              Konsultasikan Program Belajar
              <span>→</span>
            </a>
          </div>
        </div>
      </section>

      {/* LEARNING PROCESS */}
      <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            label="Proses Pembelajaran"
            title="Setiap Langkah Punya Tujuan"
            description="Proses pembelajaran di Ilyon Academy dirancang agar perkembangan siswa dapat dipantau dan diarahkan dengan baik."
          />

          <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {learningSteps.map((step, index) => (
              <div key={step.number} className="relative text-center">
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E7F3F0] text-2xl font-extrabold text-[#529F93]">
                  {step.number}
                </div>

                <h3 className="mt-5 text-lg font-extrabold text-foreground">
                  {step.title}
                </h3>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-7 text-muted-foreground">
                  {step.description}
                </p>

                {index !== learningSteps.length - 1 && (
                  <div className="absolute right-[-18px] top-8 hidden text-2xl text-[#70B8AE] lg:block">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section id="pendaftaran" className="px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#70B8AE] px-7 py-14 text-center sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[40px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full border-[40px] border-white/10" />

          <div className="relative mx-auto max-w-2xl">
            <span className="text-5xl">🌟</span>
            <h2 className="mt-6 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Yuk, Mulai Perjalanan Belajar Bersama Ilyon Academy!
            </h2>
            <p className="mt-5 leading-8 text-white/90">
              Berikan kesempatan kepada anak untuk belajar, berkembang,
              dan menemukan potensi terbaiknya bersama kami.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <a
                href="/pendaftaran"
                className="rounded-xl bg-white px-7 py-3.5 font-bold text-[#529F93] shadow-lg transition hover:-translate-y-1"
              >
                Daftar Siswa Baru →
              </a>
              <a
                href="/program"
                className="rounded-xl border border-white/60 px-7 py-3.5 font-bold text-white transition hover:bg-white/10"
              >
                Lihat Program
              </a>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
