import { useLayoutEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import Navbar from "../Components/Navbar";

const FOOTER_LINKS = [
  { label: "Beranda", path: "/" },
  { label: "Tentang Kami", path: "/about" },
  { label: "Program Belajar", path: "/programs" },
  // { label: "Cabang", path: "/branches" },
  // { label: "Artikel", path: "/articles" },
  { label: "Karier", path: "/recruitment" },
  { label: "FAQ", path: "/faq" },
  { label: "Kontak", path: "/contact" },
];

export default function PublicLayout() {
  const { pathname } = useLocation();

  // Kembalikan posisi layar ke atas setiap berpindah halaman
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-foreground">
      {/* NAVBAR */}
      <Navbar />

      {/* MAIN CONTENT */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-[#F8FAFA]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {/* BRAND */}
            <div>
              <Link to="/" className="inline-flex items-center gap-3">
                <img
                  src="/ilyon.png"
                  alt="Ilyon Academy"
                  className="h-13 w-13 mt-4 object-contain"
                />

                <span className="text-xl font-extrabold text-foreground">
                  Ilyon <span className="text-primary">Academy</span>
                </span>
              </Link>

              <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
                Ilyon Academy hadir untuk mendukung setiap anak mengenali
                potensi, mengembangkan kemampuan, dan bertumbuh melalui
                pengalaman belajar yang bermakna.
              </p>

              <p className="mt-4 text-xs font-semibold tracking-wider text-primary">
                LEARN • GROW • ACHIEVE
              </p>
            </div>

            {/* NAVIGATION */}
            <div>
              <h3 className="mb-4 text-sm font-extrabold text-foreground">
                Navigasi
              </h3>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {FOOTER_LINKS.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="text-sm text-muted-foreground transition hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div>
              <h3 className="mb-4 text-sm font-extrabold text-foreground">
                Bergabung Bersama Kami
              </h3>

              <p className="mb-5 text-sm leading-6 text-muted-foreground">
                Jadilah bagian dari perjalanan belajar dan perkembangan anak
                bersama Ilyon Academy.
              </p>

              <Link
                to="/recruitment"
                className="app-button-primary inline-flex"
              >
                Lihat Peluang Karier
              </Link>

              <div className="mt-4">
                <Link
                  to="/contact"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Hubungi Ilyon Academy
                </Link>
              </div>
            </div>
          </div>

          {/* COPYRIGHT */}
          <div className="mt-10 border-t border-border pt-6">
            <p className="text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} Ilyon Academy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
