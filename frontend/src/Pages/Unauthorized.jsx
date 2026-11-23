// src/Pages/Unauthorized.jsx

import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCFAF5] px-4">
      <div className="app-card max-w-md w-full p-8 text-center">
        <h1 className="text-5xl font-extrabold text-[#E78282]">
          403
        </h1>

        <h2 className="text-xl font-bold text-[#35485E] mt-4">
          Akses Ditolak
        </h2>

        <p className="text-[#87919D] mt-2">
          Maaf, akun Anda tidak memiliki izin untuk
          mengakses halaman ini.
        </p>

        <Link
          to="/"
          className="app-button-primary inline-block mt-6"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}