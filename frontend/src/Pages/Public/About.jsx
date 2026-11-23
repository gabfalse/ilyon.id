import { Link } from "react-router-dom";

const programs = [
  {
    number: "01",
    title: "Motorik dan Sensorik",
    description:
      "Kegiatan pembelajaran untuk mendukung perkembangan kemampuan motorik dan sensorik anak.",
  },
  {
    number: "02",
    title: "Preschool / Persiapan Sekolah",
    description:
      "Mempersiapkan anak mengenal lingkungan belajar dan membangun keterampilan dasar sebelum sekolah.",
  },
  {
    number: "03",
    title: "Calistung",
    description:
      "Pembelajaran membaca, menulis, dan berhitung dengan pendekatan yang disesuaikan dengan kebutuhan anak.",
  },
  {
    number: "04",
    title: "Mata Pelajaran SD",
    description:
      "Pendampingan belajar untuk berbagai mata pelajaran tingkat Sekolah Dasar.",
  },
  {
    number: "05",
    title: "Mata Pelajaran SMP",
    description:
      "Pendampingan akademik untuk membantu siswa memahami materi tingkat Sekolah Menengah Pertama.",
  },
  {
    number: "06",
    title: "Persiapan TKA",
    description:
      "Program pendampingan persiapan Tes Kemampuan Akademik untuk jenjang SD dan SMP.",
  },
  {
    number: "07",
    title: "Belajar Bahasa",
    description: "Program pembelajaran bahasa Inggris, Jepang, dan Mandarin.",
  },
  {
    number: "08",
    title: "Tahsin",
    description:
      "Pendampingan pembelajaran untuk meningkatkan kemampuan membaca Al-Qur'an.",
  },
];

const learningMethods = [
  {
    title: "Online",
    description:
      "Pembelajaran jarak jauh yang dapat diikuti dari lokasi masing-masing.",
    symbol: "01",
  },
  {
    title: "Onsite",
    description:
      "Pembelajaran secara langsung di lokasi belajar Ilyon Academy.",
    symbol: "02",
  },
  {
    title: "Home Visit",
    description: "Pembelajaran dengan kunjungan pengajar ke lokasi siswa.",
    symbol: "03",
  },
];

const learningModels = ["Private", "Small Group", "Group"];

export default function About() {
  const googleMapsUrl = "https://maps.app.goo.gl/3pBNvUvPht2wZMa56";

  const directionVideoUrl =
    "https://www.tiktok.com/@ilyonacademy/video/7701264086377467157";

  const whatsappUrl = "https://wa.me/6285162651533";

  const emailUrl = "mailto:ilyonacademy@gmail.com";

  const tiktokUrl = "https://www.tiktok.com/@ilyonacademy";

  return (
    <main className="min-h-screen bg-white text-[#35485E]">
      {/* ======================================
          HERO SECTION
      ====================================== */}
      <section className="relative overflow-hidden bg-[#35485E]">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#529F93]/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#529F93]/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 md:grid-cols-2 md:px-10 lg:py-32">
          <div>
            <span className="mb-6 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#B9E4DC]">
              Company Profile
            </span>

            <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
              Mengenal Lebih Dekat
              <span className="block text-[#91D3C5]">Ilyon Academy</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-white/75 md:text-lg">
              Ilyon Academy merupakan lembaga pendidikan dan pendampingan
              belajar yang menyediakan berbagai program pembelajaran untuk
              mendukung kebutuhan pendidikan peserta didik.
            </p>

            <p className="mt-4 max-w-xl text-base leading-8 text-white/75">
              Melalui pilihan program dan metode pembelajaran yang beragam,
              Ilyon Academy berupaya menghadirkan pengalaman belajar yang sesuai
              dengan kebutuhan setiap peserta didik.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/programs"
                className="rounded-xl bg-[#529F93] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#438B80]"
              >
                Lihat Program
              </Link>

              <Link
                to="/contact"
                className="rounded-xl border border-white/30 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Hubungi Kami
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-sm md:p-8">
              <div className="flex aspect-[5/4] flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#EAF5F3] to-[#CDE8E1] p-8 text-center">
                <div className="mb-5 flex h-32 w-32 items-center justify-center rounded-3xl bg-white shadow-xl">
                  <img
                    src="/ilyon.png"
                    alt="Logo Ilyon Academy"
                    className="h-50 w-50 mt-10 object-contain"
                  />
                </div>

                <h2 className="text-3xl font-extrabold tracking-wide text-[#35485E]">
                  ILYON
                </h2>

                <p className="mt-2 text-sm font-semibold tracking-[0.3em] text-[#529F93]">
                  ACADEMY
                </p>

                <div className="mt-7 h-1 w-16 rounded-full bg-[#529F93]" />

                <p className="mt-5 max-w-xs text-sm leading-6 text-[#52677A]">
                  Learning, Growing, and Achieving Together
                </p>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-5 rounded-2xl bg-white px-6 py-4 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Learning Center
              </p>
              <p className="mt-1 text-lg font-extrabold text-[#35485E]">
                Ilyon Academy
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================
          ABOUT OVERVIEW
      ====================================== */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#529F93]">
              About Ilyon
            </span>

            <h2 className="mt-4 text-3xl font-extrabold leading-tight md:text-4xl">
              Pendidikan yang Menyesuaikan Kebutuhan Belajar
            </h2>

            <div className="mt-6 h-1.5 w-20 rounded-full bg-[#529F93]" />
          </div>

          <div className="space-y-5 text-base leading-8 text-gray-600">
            <p>
              Ilyon Academy hadir sebagai tempat pendampingan belajar dengan
              pilihan program untuk berbagai kebutuhan pendidikan, mulai dari
              tahap perkembangan awal anak hingga pendampingan akademik tingkat
              sekolah.
            </p>

            <p>
              Kami menyediakan pilihan pembelajaran secara online, onsite,
              maupun home visit. Peserta didik juga dapat mengikuti model
              pembelajaran private, small group, atau group sesuai dengan
              program yang tersedia.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================
          PROGRAMS
      ====================================== */}
      <section className="bg-[#F5F9F8] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#529F93]">
              Our Programs
            </span>

            <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">
              Pilihan Program Pembelajaran
            </h2>

            <p className="mt-5 leading-8 text-gray-500">
              Beragam pilihan program untuk mendukung perjalanan belajar dan
              perkembangan kemampuan peserta didik.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {programs.map((program) => (
              <div
                key={program.number}
                className="group rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#529F93]/40 hover:shadow-xl"
              >
                <span className="text-sm font-extrabold tracking-widest text-[#529F93]">
                  {program.number}
                </span>

                <h3 className="mt-5 text-lg font-extrabold">{program.title}</h3>

                <p className="mt-3 text-sm leading-7 text-gray-500">
                  {program.description}
                </p>

                <div className="mt-6 h-1 w-10 rounded-full bg-[#529F93] transition-all group-hover:w-16" />
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/programs"
              className="inline-flex rounded-xl bg-[#35485E] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#29394D]"
            >
              Jelajahi Semua Program
            </Link>
          </div>
        </div>
      </section>

      {/* ======================================
          LEARNING METHODS
      ====================================== */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:py-24">
        <div className="text-center">
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#529F93]">
            Learning Methods
          </span>

          <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">
            Metode Pembelajaran
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-8 text-gray-500">
            Pilihan metode pembelajaran yang memberikan fleksibilitas dalam
            mengikuti kegiatan belajar.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {learningMethods.map((method) => (
            <div
              key={method.symbol}
              className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF5F3] text-lg font-extrabold text-[#529F93]">
                {method.symbol}
              </div>

              <h3 className="mt-7 text-2xl font-extrabold">{method.title}</h3>

              <p className="mt-4 leading-7 text-gray-500">
                {method.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl bg-[#35485E] p-8 text-center md:p-12">
          <h3 className="text-2xl font-extrabold text-white">
            Pilihan Model Pembelajaran
          </h3>

          <p className="mt-3 text-sm leading-7 text-white/70">
            Model pembelajaran disesuaikan dengan program dan ketersediaan
            kelas.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {learningModels.map((model) => (
              <span
                key={model}
                className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white"
              >
                {model}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================
          LOCATION
      ====================================== */}
      <section className="bg-[#F5F9F8] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#529F93]">
                Our Location
              </span>

              <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">
                Temukan Lokasi Ilyon Academy
              </h2>

              <p className="mt-6 leading-8 text-gray-600">
                Ilyon Academy menyediakan lokasi pembelajaran onsite. Untuk
                melihat titik lokasi dan mendapatkan petunjuk perjalanan,
                silakan gunakan Google Maps.
              </p>

              <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EAF5F3] text-xl">
                    📍
                  </div>

                  <div>
                    <h3 className="font-extrabold">Lokasi Ilyon Academy</h3>

                    <p className="mt-2 text-sm leading-7 text-gray-500">
                      Lihat titik lokasi melalui Google Maps. Informasi alamat
                      tertulis akan ditambahkan setelah data alamat resmi
                      dikonfirmasi.
                    </p>
                  </div>
                </div>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#35485E] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#29394D]"
                >
                  Buka Lokasi di Google Maps
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-3 shadow-lg">
              <iframe
                title="Lokasi Ilyon Academy di Google Maps"
                src="https://www.google.com/maps?q=Ilyon%20Academy&output=embed"
                width="100%"
                height="420"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />

              <p className="px-3 py-3 text-center text-xs text-gray-400">
                Peta pencarian lokasi Ilyon Academy. Gunakan tombol Google Maps
                untuk membuka tautan lokasi yang telah diberikan.
              </p>
            </div>
          </div>

          {/* Direction Video */}
          <div className="mt-12 rounded-3xl bg-[#EAF5F3] p-8 md:flex md:items-center md:justify-between md:gap-8 md:p-10">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#529F93]">
                How To Get Here
              </span>

              <h3 className="mt-3 text-2xl font-extrabold">
                Bingung Mencari Lokasi Kami?
              </h3>

              <p className="mt-3 max-w-2xl leading-7 text-gray-600">
                Tonton video petunjuk arah menuju tempat belajar Ilyon Academy
                melalui TikTok kami.
              </p>
            </div>

            <a
              href={directionVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex shrink-0 items-center justify-center rounded-xl bg-[#35485E] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#29394D] md:mt-0"
            >
              ▶ Tonton Video Petunjuk Arah
            </a>
          </div>
        </div>
      </section>

      {/* ======================================
          CONTACT
      ====================================== */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:py-24">
        <div className="rounded-[2rem] bg-[#35485E] px-7 py-14 text-center md:px-14">
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#91D3C5]">
            Get In Touch
          </span>

          <h2 className="mt-4 text-3xl font-extrabold text-white md:text-4xl">
            Mari Terhubung dengan Ilyon Academy
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-8 text-white/70">
            Ingin mengetahui informasi program pembelajaran atau memiliki
            pertanyaan lebih lanjut? Hubungi kami melalui kanal komunikasi
            berikut.
          </p>

          <div className="mt-10 grid gap-4 text-left md:grid-cols-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-white/10 bg-white/10 p-6 transition hover:bg-white/15"
            >
              <span className="text-2xl">💬</span>
              <h3 className="mt-4 font-extrabold text-white">WhatsApp</h3>
              <p className="mt-2 text-sm text-white/70">0851-6265-1533</p>
            </a>

            <a
              href={emailUrl}
              className="rounded-2xl border border-white/10 bg-white/10 p-6 transition hover:bg-white/15"
            >
              <span className="text-2xl">✉️</span>
              <h3 className="mt-4 font-extrabold text-white">Email</h3>
              <p className="mt-2 break-all text-sm text-white/70">
                ilyonacademy@gmail.com
              </p>
            </a>

            <a
              href={tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-white/10 bg-white/10 p-6 transition hover:bg-white/15"
            >
              <span className="text-2xl">♪</span>
              <h3 className="mt-4 font-extrabold text-white">TikTok</h3>
              <p className="mt-2 text-sm text-white/70">@ilyonacademy</p>
            </a>
          </div>

          <div className="mt-10">
            <Link
              to="/contact"
              className="inline-flex rounded-xl bg-[#529F93] px-8 py-4 text-sm font-extrabold text-white transition hover:bg-[#438B80]"
            >
              Hubungi Ilyon Academy
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
