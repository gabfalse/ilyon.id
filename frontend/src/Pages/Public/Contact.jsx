import { Link } from "react-router-dom";

const CONTACTS = [
  {
    title: "WhatsApp",
    subtitle: "Hubungi kami melalui WhatsApp",
    value: "0851-6265-1533",
    description: "Untuk pertanyaan program, pendaftaran, dan konsultasi.",
    href: "https://wa.me/6285162651533",
    action: "Chat WhatsApp",
    icon: "💬",
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Email",
    subtitle: "Kirimkan pesan kepada kami",
    value: "ilyonacademy@gmail.com",
    description: "Untuk pertanyaan, kerja sama, dan informasi lainnya.",
    href: "mailto:ilyonacademy@gmail.com",
    action: "Kirim Email",
    icon: "✉️",
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "TikTok",
    subtitle: "Ikuti media sosial kami",
    value: "@ilyonacademy",
    description: "Temukan informasi dan aktivitas terbaru Ilyon Academy.",
    href: "https://www.tiktok.com/@ilyonacademy",
    action: "Kunjungi TikTok",
    icon: "♪",
    color: "bg-gray-100 text-gray-800",
  },
];

export default function Contact() {
  return (
    <main className="min-h-screen bg-[#F8FAFA]">
      {/* HERO */}
      <section className="relative overflow-hidden bg-[#35485E] px-4 py-20 text-white sm:py-24">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#529F93]/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-[#529F93]/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl text-center">
          <p className="text-xs font-bold tracking-[0.25em] text-[#A9D8CF]">
            CONTACT ILYON ACADEMY
          </p>

          <h1 className="mt-5 text-3xl font-extrabold sm:text-5xl">
            Hubungi Kami
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-gray-200 sm:text-base">
            Kami siap membantu menjawab pertanyaan dan memberikan informasi
            mengenai program pembelajaran Ilyon Academy.
          </p>
        </div>
      </section>

      {/* CONTACT CARDS */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold tracking-[0.2em] text-[#529F93]">
              GET IN TOUCH
            </p>

            <h2 className="mt-3 text-2xl font-extrabold text-[#35485E] sm:text-3xl">
              Kami Siap Terhubung dengan Anda
            </h2>

            <p className="mt-4 text-sm leading-7 text-gray-500">
              Silakan pilih kanal komunikasi yang paling nyaman untuk
              menghubungi tim Ilyon Academy.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {CONTACTS.map((contact) => (
              <article
                key={contact.title}
                className="group flex flex-col rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${contact.color}`}
                >
                  {contact.icon}
                </div>

                <h3 className="mt-6 text-xl font-extrabold text-[#35485E]">
                  {contact.title}
                </h3>

                <p className="mt-2 text-sm text-gray-400">{contact.subtitle}</p>

                <p className="mt-5 break-words text-base font-bold text-[#529F93]">
                  {contact.value}
                </p>

                <p className="mt-3 flex-1 text-sm leading-7 text-gray-500">
                  {contact.description}
                </p>

                <a
                  href={contact.href}
                  target={
                    contact.title === "WhatsApp" || contact.title === "TikTok"
                      ? "_blank"
                      : undefined
                  }
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-[#529F93] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#438B80]"
                >
                  {contact.action} →
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-5xl rounded-3xl bg-[#EAF5F3] px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-extrabold text-[#35485E]">
            Mari Bertumbuh dan Belajar Bersama
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-600">
            Kenali berbagai program pembelajaran yang tersedia di Ilyon Academy
            dan temukan pilihan yang sesuai dengan kebutuhan belajar.
          </p>

          <Link
            to="/programs"
            className="mt-7 inline-flex items-center justify-center rounded-xl bg-[#529F93] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#438B80]"
          >
            Jelajahi Program →
          </Link>
        </div>
      </section>
    </main>
  );
}
