import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Contexts/AuthContext";

export default function AccountSettings() {
  const { user, switchAccountMode } = useAuth();
  const navigate = useNavigate();

  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [targetMode, setTargetMode] = useState(null);

  const activeMode = user?.activeMode || "normal";
  const isParentMode = activeMode === "parent";

  // ==========================================
  // SWITCH ACCOUNT MODE
  // ==========================================

  const handleSwitchMode = async (mode) => {
    if (switching || completed || mode === activeMode) return;

    const confirmed = window.confirm(
      mode === "parent" ? "Aktifkan Akun Orang Tua?" : "Kembali ke Akun Biasa?",
    );

    if (!confirmed) return;

    try {
      setSwitching(true);
      setError("");

      await switchAccountMode(mode);

      setTargetMode(mode);
      setCompleted(true);
    } catch (err) {
      setError(err.message || "Gagal mengganti mode akun.");
    } finally {
      setSwitching(false);
    }
  };

  // ==========================================
  // SUCCESS SCREEN
  // ==========================================

  if (completed) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#EAF5F3]">
            <svg
              className="h-10 w-10 text-[#529F93]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <h1 className="mt-6 text-2xl font-bold text-[#35485E]">
            Perubahan Akun Berhasil
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Mode akun Anda berhasil diperbarui menjadi{" "}
            <strong>
              {targetMode === "parent" ? "Akun Orang Tua" : "Akun Biasa"}
            </strong>
            .
          </p>

          <div className="mt-6 rounded-xl bg-[#F5F9F8] p-4">
            <p className="text-sm font-semibold text-[#35485E]">
              Perubahan sedang diterapkan.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Silakan kembali ke beranda untuk melanjutkan menggunakan mode akun
              yang baru.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="mt-7 w-full rounded-xl bg-[#70B8AE] px-5 py-3 font-semibold text-white transition hover:bg-[#529F93]"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // PROCESSING SCREEN
  // ==========================================

  if (switching) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#70B8AE]" />

          <h2 className="mt-6 text-xl font-bold text-[#35485E]">
            Perubahan Akun Sedang Diproses
          </h2>

          <p className="mt-3 text-sm text-gray-500">
            Mohon tunggu, sistem sedang memperbarui mode akun Anda.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ACCOUNT SETTINGS PAGE
  // ==========================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#35485E]">Pengaturan Akun</h1>

        <p className="mt-2 text-sm text-gray-500">
          Kelola mode dan pengaturan akun Ilyon Academy Anda.
        </p>
      </div>

      {/* ACCOUNT INFORMATION */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#35485E]">Informasi Akun</h2>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs text-gray-400">Nama Pengguna</p>
            <p className="mt-1 font-semibold text-[#35485E]">
              {user?.fullName || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">Email / Nomor Telepon</p>
            <p className="mt-1 font-semibold text-[#35485E]">
              {user?.email || user?.phone || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">Mode Akun Aktif</p>

            <span className="mt-2 inline-flex rounded-full bg-[#EAF5F3] px-3 py-1 text-sm font-semibold text-[#529F93]">
              {isParentMode ? "Akun Orang Tua" : "Akun Biasa"}
            </span>
          </div>
        </div>
      </section>

      {/* ACCOUNT MODE */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#35485E]">Mode Akun</h2>

        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Satu akun dapat digunakan sebagai akun pengguna biasa maupun akun
          orang tua. Anda dapat berpindah mode kapan saja.
        </p>

        <div className="mt-6 space-y-4">
          {/* PARENT MODE */}
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-bold text-[#35485E]">
                  Jadikan Akun Orang Tua
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Akses dashboard orang tua, data anak, dan pendaftaran siswa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSwitchMode("parent")}
                disabled={isParentMode || switching}
                className="shrink-0 rounded-xl bg-[#70B8AE] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#529F93] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isParentMode ? "Sedang Aktif" : "Aktifkan"}
              </button>
            </div>
          </div>

          {/* NORMAL MODE */}
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-bold text-[#35485E]">Jadikan Akun Biasa</h3>

                <p className="mt-1 text-sm text-gray-500">
                  Kembali menggunakan dashboard pengguna biasa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSwitchMode("normal")}
                disabled={!isParentMode || switching}
                className="shrink-0 rounded-xl border border-[#70B8AE] px-5 py-3 text-sm font-semibold text-[#529F93] transition hover:bg-[#EAF5F3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {!isParentMode ? "Sedang Aktif" : "Aktifkan"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
