import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const FAQ_DATA = [
  {
    category: "Tentang Ilyon",
    questions: [
      {
        question: "Apa itu Ilyon Academy?",
        answer:
          "Ilyon Academy merupakan lembaga pendidikan yang menyediakan layanan pembelajaran untuk mendukung perkembangan kemampuan akademik dan keterampilan peserta didik melalui program belajar yang disesuaikan dengan kebutuhan masing-masing.",
      },
      {
        question: "Siapa saja yang bisa mengikuti program Ilyon Academy?",
        answer:
          "Ilyon Academy menyediakan program untuk berbagai jenjang dan kebutuhan belajar, mulai dari anak usia dini, persiapan sekolah, siswa SD, SMP, hingga peserta yang ingin mengembangkan kemampuan bahasa dan tahsin.",
      },
      {
        question: "Di mana lokasi Ilyon Academy?",
        answer:
          "Ilyon Academy menyediakan layanan pembelajaran secara onsite dan home visit. Silakan hubungi tim Ilyon Academy untuk mendapatkan informasi lokasi dan ketersediaan layanan.",
      },
    ],
  },
  {
    category: "Program Belajar",
    questions: [
      {
        question: "Program belajar apa saja yang tersedia?",
        answer:
          "Program belajar Ilyon Academy meliputi Motorik dan Sensorik, Preschool atau Persiapan Sekolah, Calistung, Mata Pelajaran Umum SD, Mata Pelajaran Umum SMP, Persiapan TKA SD, Persiapan TKA SMP, Belajar Bahasa (Japanese, English, Mandarin), dan Tahsin.",
      },
      {
        question: "Apakah tersedia program untuk anak usia dini?",
        answer:
          "Ya. Ilyon Academy menyediakan program Motorik dan Sensorik serta Preschool atau Persiapan Sekolah untuk mendukung perkembangan dan kesiapan belajar anak.",
      },
      {
        question: "Apakah tersedia program belajar bahasa asing?",
        answer:
          "Ya. Tersedia program pembelajaran bahasa Japanese, English, dan Mandarin.",
      },
      {
        question: "Apakah peserta bisa memilih program sesuai kebutuhan?",
        answer:
          "Tentu. Program dapat dipilih berdasarkan jenjang, kebutuhan, dan tujuan belajar peserta. Tim Ilyon Academy dapat membantu memberikan informasi program yang sesuai.",
      },
    ],
  },
  {
    category: "Metode Pembelajaran",
    questions: [
      {
        question: "Apa saja pilihan metode pembelajaran?",
        answer:
          "Ilyon Academy menyediakan tiga pilihan layanan pembelajaran, yaitu Online, Onsite (belajar di lokasi), dan Home Visit (guru datang ke lokasi peserta).",
      },
      {
        question: "Apakah pembelajaran tersedia secara privat?",
        answer:
          "Ya. Pilihan model pembelajaran meliputi Private, Small Group, dan Group. Ketersediaannya dapat disesuaikan dengan program dan jadwal yang dipilih.",
      },
      {
        question: "Apa perbedaan Online, Onsite, dan Home Visit?",
        answer:
          "Online merupakan pembelajaran jarak jauh. Onsite adalah pembelajaran di lokasi Ilyon Academy. Home Visit merupakan layanan pembelajaran dengan pengajar datang ke lokasi peserta sesuai ketentuan layanan.",
      },
    ],
  },
  {
    category: "Pendaftaran",
    questions: [
      {
        question: "Bagaimana cara mendaftar di Ilyon Academy?",
        answer:
          "Calon peserta dapat menghubungi tim Ilyon Academy melalui WhatsApp atau halaman Kontak. Tim kami akan membantu memberikan informasi program, pilihan pembelajaran, dan proses pendaftaran.",
      },
      {
        question: "Apakah bisa berkonsultasi sebelum mendaftar?",
        answer:
          "Tentu. Calon peserta atau orang tua dapat berkonsultasi terlebih dahulu mengenai kebutuhan belajar, pilihan program, dan metode pembelajaran.",
      },
      {
        question: "Bagaimana cara mengetahui informasi biaya belajar?",
        answer:
          "Informasi biaya dapat diperoleh dengan menghubungi tim Ilyon Academy. Biaya dapat berbeda berdasarkan program, metode pembelajaran, dan pilihan kelas.",
      },
      {
        question: "Apakah bisa memilih jadwal belajar?",
        answer:
          "Jadwal pembelajaran dapat dikonsultasikan dengan tim Ilyon Academy. Ketersediaan jadwal akan disesuaikan dengan program dan pengajar.",
      },
    ],
  },
  {
    category: "Rekrutmen",
    questions: [
      {
        question:
          "Apakah Ilyon Academy membuka kesempatan bergabung sebagai pengajar?",
        answer:
          "Informasi kesempatan bergabung sebagai Tutor maupun Staff dapat dilihat melalui halaman Rekrutmen di website Ilyon Academy.",
      },
      {
        question: "Bagaimana cara melamar pekerjaan di Ilyon Academy?",
        answer:
          "Silakan kunjungi halaman Rekrutmen, pilih lowongan yang tersedia, kemudian ikuti petunjuk pengajuan lamaran pada halaman detail lowongan.",
      },
      {
        question: "Bagaimana cara memeriksa status lamaran?",
        answer:
          "Pelamar dapat menggunakan fitur pelacakan lamaran yang tersedia pada halaman Rekrutmen, sesuai informasi dan petunjuk yang diberikan saat pengajuan.",
      },
    ],
  },
];

const CATEGORIES = ["Semua", ...FAQ_DATA.map((item) => item.category)];

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [openQuestion, setOpenQuestion] = useState(null);

  const filteredData = useMemo(() => {
    return FAQ_DATA.filter(
      (group) =>
        activeCategory === "Semua" || group.category === activeCategory,
    )
      .map((group) => ({
        ...group,
        questions: group.questions.filter((item) => {
          const keyword = search.toLowerCase().trim();

          if (!keyword) return true;

          return (
            item.question.toLowerCase().includes(keyword) ||
            item.answer.toLowerCase().includes(keyword)
          );
        }),
      }))
      .filter((group) => group.questions.length > 0);
  }, [activeCategory, search]);

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setOpenQuestion(null);
  };

  const handleSearch = (value) => {
    setSearch(value);
    setOpenQuestion(null);
  };

  return (
    <div className="min-h-screen bg-[#FCFAF5]">
      {/* HERO */}
      <section className="relative overflow-hidden bg-[#35485E] px-5 py-20 text-white md:py-28">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#529F93]/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#F2BD4B]/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#CDE8E1]">
            Help Center
          </span>

          <h1 className="mt-7 text-4xl font-extrabold leading-tight md:text-6xl">
            Frequently Asked
            <span className="block text-[#F2BD4B]">Questions</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
            Temukan jawaban atas pertanyaan seputar Ilyon Academy, program
            belajar, metode pembelajaran, pendaftaran, dan informasi lainnya.
          </p>

          {/* SEARCH */}
          <div className="mx-auto mt-10 flex max-w-2xl items-center gap-3 rounded-2xl bg-white p-2 shadow-xl">
            <span className="pl-4 text-2xl text-[#529F93]">⌕</span>

            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cari pertanyaan yang ingin kamu ketahui..."
              className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-[#35485E] outline-none placeholder:text-gray-400"
            />

            {search && (
              <button
                onClick={() => handleSearch("")}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[#529F93] hover:bg-[#EAF5F3]"
              >
                Hapus
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FAQ CONTENT */}
      <section className="px-5 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          {/* INTRO */}
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#529F93]">
              Pusat Informasi
            </p>

            <h2 className="mt-3 text-3xl font-extrabold text-[#35485E] md:text-4xl">
              Ada yang ingin kamu tanyakan?
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-500">
              Pilih kategori pertanyaan atau gunakan kolom pencarian untuk
              menemukan informasi yang kamu butuhkan.
            </p>
          </div>

          {/* CATEGORY FILTER */}
          <div className="mb-10 flex flex-wrap justify-center gap-3">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                  activeCategory === category
                    ? "bg-[#529F93] text-white shadow-lg shadow-[#529F93]/20"
                    : "border border-gray-200 bg-white text-gray-500 hover:border-[#529F93] hover:text-[#529F93]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* QUESTIONS */}
          <div className="space-y-10">
            {filteredData.length > 0 ? (
              filteredData.map((group) => (
                <div key={group.category}>
                  <div className="mb-5 flex items-center gap-3">
                    <div className="h-8 w-1.5 rounded-full bg-[#529F93]" />

                    <h3 className="text-xl font-extrabold text-[#35485E]">
                      {group.category}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {group.questions.map((item, index) => {
                      const questionId = `${group.category}-${index}`;

                      const isOpen = openQuestion === questionId;

                      return (
                        <div
                          key={questionId}
                          className={`overflow-hidden rounded-2xl border bg-white transition ${
                            isOpen
                              ? "border-[#529F93]/40 shadow-lg shadow-[#529F93]/5"
                              : "border-gray-100 shadow-sm hover:border-[#529F93]/30"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenQuestion(isOpen ? null : questionId)
                            }
                            aria-expanded={isOpen}
                            className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left md:px-7"
                          >
                            <span className="flex items-center gap-4">
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${
                                  isOpen
                                    ? "bg-[#529F93] text-white"
                                    : "bg-[#EAF5F3] text-[#529F93]"
                                }`}
                              >
                                Q
                              </span>

                              <span className="text-sm font-bold leading-6 text-[#35485E] md:text-base">
                                {item.question}
                              </span>
                            </span>

                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl transition ${
                                isOpen
                                  ? "rotate-180 bg-[#529F93] text-white"
                                  : "bg-[#F3F6F5] text-[#529F93]"
                              }`}
                            >
                              ⌄
                            </span>
                          </button>

                          {isOpen && (
                            <div className="px-5 pb-6 pl-[4.5rem] md:px-7 md:pl-[5.5rem]">
                              <div className="border-t border-gray-100 pt-5">
                                <p className="text-sm leading-7 text-gray-500">
                                  {item.answer}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF5F3] text-3xl text-[#529F93]">
                  ?
                </div>

                <h3 className="mt-5 text-xl font-extrabold text-[#35485E]">
                  Pertanyaan tidak ditemukan
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Coba gunakan kata kunci lain atau pilih kategori pertanyaan
                  yang berbeda.
                </p>

                <button
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("Semua");
                  }}
                  className="mt-6 rounded-xl bg-[#529F93] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#438D82]"
                >
                  Tampilkan Semua FAQ
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#35485E] px-6 py-12 text-center text-white md:px-12 md:py-16">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl">
            ?
          </div>

          <h2 className="mt-6 text-3xl font-extrabold md:text-4xl">
            Masih punya pertanyaan?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/70">
            Tim Ilyon Academy siap membantu memberikan informasi lebih lanjut
            mengenai program dan layanan pembelajaran.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="https://wa.me/6285162651533"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-[#529F93] px-7 py-4 text-sm font-bold text-white transition hover:bg-[#438D82]"
            >
              Hubungi via WhatsApp
            </a>

            <Link
              to="/contact"
              className="rounded-xl border border-white/30 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Halaman Kontak
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
