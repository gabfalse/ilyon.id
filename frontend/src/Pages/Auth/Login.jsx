import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../Contexts/AuthContext";
import { getDashboardPath } from "../../Utils/Auth";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loginMethod, setLoginMethod] = useState("phone");

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleMethodChange(method) {
    setLoginMethod(method);

    setForm({
      identifier: "",
      password: "",
    });

    setError("");
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    const identifier = form.identifier.trim();

    if (!identifier) {
      setError(
        loginMethod === "phone"
          ? "Nomor HP wajib diisi."
          : "Email wajib diisi.",
      );
      return;
    }

    if (loginMethod === "phone" && !/^\d{10,15}$/.test(identifier)) {
      setError("Nomor HP harus terdiri dari 10–15 digit angka.");
      return;
    }

    setLoading(true);

    try {
      const user = await login({
        identifier:
          loginMethod === "email" ? identifier.toLowerCase() : identifier,
        password: form.password,
      });

      if (!user) {
        throw new Error(
          "Login berhasil, tetapi data pengguna tidak ditemukan.",
        );
      }

      const dashboardPath = getDashboardPath(user);

      navigate(dashboardPath, { replace: true });
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E9ECEF] p-8">
      {/* Logo dan Judul */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-[#529F93]">
          Ilyon Academy
        </h1>

        <p className="text-[#87919D] mt-2">Selamat datang kembali!</p>

        <h2 className="text-xl font-bold text-[#35485E] mt-6">Login Akun</h2>
      </div>

      {/* Pilihan Metode Login */}
      <div className="grid grid-cols-2 bg-[#F3F6F7] rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => handleMethodChange("phone")}
          disabled={loading}
          className={`py-3 rounded-lg text-sm font-semibold transition-colors ${
            loginMethod === "phone"
              ? "bg-white text-[#529F93] shadow-sm"
              : "text-[#87919D] hover:text-[#35485E]"
          }`}
        >
          Nomor HP
        </button>

        <button
          type="button"
          onClick={() => handleMethodChange("email")}
          disabled={loading}
          className={`py-3 rounded-lg text-sm font-semibold transition-colors ${
            loginMethod === "email"
              ? "bg-white text-[#529F93] shadow-sm"
              : "text-[#87919D] hover:text-[#35485E]"
          }`}
        >
          Email
        </button>
      </div>

      {/* Pesan Error */}
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-5"
        >
          {error}
        </div>
      )}

      {/* Form Login */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identifier */}
        <div>
          <label
            htmlFor="identifier"
            className="block text-sm font-semibold text-[#35485E] mb-2"
          >
            {loginMethod === "phone" ? "Nomor HP" : "Email"}
          </label>

          <input
            id="identifier"
            type={loginMethod === "phone" ? "tel" : "email"}
            name="identifier"
            value={form.identifier}
            onChange={handleChange}
            placeholder={
              loginMethod === "phone" ? "08xxxxxxxxxx" : "nama@email.com"
            }
            autoComplete="username"
            inputMode={loginMethod === "phone" ? "numeric" : "email"}
            maxLength={loginMethod === "phone" ? 15 : 180}
            required
            disabled={loading}
            className="w-full px-4 py-3 border border-[#E9ECEF] rounded-xl outline-none focus:ring-2 focus:ring-[#70B8AE] focus:border-transparent disabled:bg-gray-100"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-[#35485E] mb-2"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Masukkan password"
            autoComplete="current-password"
            required
            disabled={loading}
            className="w-full px-4 py-3 border border-[#E9ECEF] rounded-xl outline-none focus:ring-2 focus:ring-[#70B8AE] focus:border-transparent disabled:bg-gray-100"
          />
        </div>

        {/* Lupa Password */}
        <div className="text-right">
          <Link
            to="/auth/forgot-password"
            className="text-sm text-[#529F93] hover:underline"
          >
            Lupa password?
          </Link>
        </div>

        {/* Tombol Login */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#70B8AE] hover:bg-[#529F93] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
        >
          {loading ? "Memproses..." : "Login"}
        </button>
      </form>

      {/* Link Register */}
      <div className="text-center mt-6 text-sm text-[#87919D]">
        Belum memiliki akun?{" "}
        <Link
          to="/auth/register"
          className="text-[#529F93] font-bold hover:underline"
        >
          Daftar sekarang
        </Link>
      </div>
    </div>
  );
}
