import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../Contexts/AuthContext";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  const { verifyEmailOtp, resendEmailOtp } = useAuth();

  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  // Countdown otomatis
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => {
      setCooldown((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  };

  const handleOtpChange = (value) => {
    setOtp(value.replace(/\D/g, "").slice(0, 6));
    setError("");
    setMessage("");
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Masukkan kode OTP 6 digit.");
      return;
    }

    try {
      setLoading(true);

      const result = await verifyEmailOtp(otp);

      setMessage(
        result.message || "Email berhasil diverifikasi. Silakan login.",
      );

      setTimeout(() => {
        navigate("/auth/login", { replace: true });
      }, 1500);
    } catch (err) {
      setError(err.message || "Verifikasi email gagal.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending || loading) return;

    setError("");
    setMessage("");

    try {
      setResending(true);

      const result = await resendEmailOtp();

      setMessage(result.message || "Kode OTP baru berhasil dikirim ke email.");

      // Mulai ulang cooldown setelah server berhasil mengirim OTP.
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err.message || "Gagal mengirim ulang kode OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">✉️</div>

          <h1 className="text-2xl font-bold text-gray-800">Verifikasi Email</h1>

          <p className="text-sm text-gray-500 mt-2">
            Masukkan kode OTP 6 digit yang dikirim ke alamat email kamu.
          </p>

          {email && (
            <p className="font-semibold text-gray-700 mt-3 break-all">
              {email}
            </p>
          )}
        </div>

        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Kode OTP
            </label>

            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(event) => handleOtpChange(event.target.value)}
              placeholder="000000"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-xl transition"
          >
            {loading ? "Memverifikasi..." : "Verifikasi Email"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-gray-500">Belum menerima kode OTP?</p>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || loading || cooldown > 0}
            className="text-blue-600 hover:text-blue-800 font-semibold text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {resending
              ? "Mengirim ulang..."
              : cooldown > 0
                ? `Kirim Ulang OTP (${formatTime(cooldown)})`
                : "Kirim Ulang OTP"}
          </button>

          {cooldown > 0 && (
            <p className="text-xs text-gray-400">
              Kamu dapat meminta kode baru dalam {formatTime(cooldown)}.
            </p>
          )}

          <div>
            <Link
              to="/auth/login"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Kembali ke halaman login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
