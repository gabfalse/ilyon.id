
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center">
      <span className="text-7xl font-extrabold text-[#70B8AE]">
        404
      </span>

      <h1 className="mt-5 text-2xl font-bold text-foreground">
        Halaman Tidak Ditemukan
      </h1>

      <p className="mt-3 text-muted-foreground">
        Maaf, halaman yang kamu cari tidak tersedia.
      </p>

      <Link
        to="/"
        className="mt-7 rounded-xl bg-[#70B8AE] px-6 py-3 font-bold text-white transition hover:bg-[#529F93]"
      >
        Kembali ke Beranda
      </Link>
    </main>
  );
}
