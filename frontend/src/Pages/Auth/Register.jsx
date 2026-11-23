import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../Contexts/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (fullName.length < 3 || fullName.length > 100) {
      setError("Nama lengkap harus terdiri dari 3–100 karakter.");
      return;
    }

    if (!email) {
      setError("Email wajib diisi.");
      return;
    }

    if (email.length > 180) {
      setError("Email maksimal 180 karakter.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Format email tidak valid.");
      return;
    }

    if (!/^\d{10,15}$/.test(phone)) {
      setError("Nomor HP harus terdiri dari 10–15 digit angka.");
      return;
    }

    if (form.password.length < 8 || form.password.length > 128) {
      setError("Password harus terdiri dari 8–128 karakter.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      await register({
        fullName,
        email,
        phone,
        password: form.password,
      });

      navigate("/auth/verify-email", {
        replace: true,
        state: { email },
      });
    } catch (err) {
      setError(err.message || "Registrasi gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E9ECEF] p-8">
      <div className="text-center mb-7">
        <h1 className="text-3xl font-extrabold text-[#529F93]">
          Ilyon Academy
        </h1>

        <p className="text-[#87919D] mt-2">
          Mulai perjalanan belajar bersama kami
        </p>

        <h2 className="text-xl font-bold text-[#35485E] mt-6">
          Daftar Akun Orang Tua
        </h2>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-5"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nama Lengkap */}
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-semibold text-[#35485E] mb-2"
          >
            Nama Lengkap
          </label>

          <input
            id="fullName"
            type="text"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            placeholder="Masukkan nama lengkap"
            autoComplete="name"
            minLength={3}
            maxLength={100}
            required
            disabled={loading}
            className="w-full px-4 py-3 border border-[#E9ECEF] rounded-xl outline-none focus:ring-2 focus:ring-[#70B8AE] disabled:bg-gray-100"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-[#35485E] mb-2"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="nama@email.com"
            autoComplete="email"
            maxLength={180}
            required
            disabled={loading}
            className="w-full px-4 py-3 border border-[#E9ECEF] rounded-xl outline-none focus:ring-2 focus:ring-[#70B8AE] disabled:bg-gray-100"
          />
        </div>

        {/* Nomor HP */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-semibold text-[#35485E] mb-2"
          >
            Nomor HP
          </label>

          <input
            id="phone"
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="08xxxxxxxxxx"
            autoComplete="tel"
            inputMode="numeric"
            maxLength={15}
            required
            disabled={loading}
            className="w-full px-4 py-3 border border-[#E9ECEF] rounded-xl outline-none focus:ring-2 focus:ring-[#70B8AE] disabled:bg-gray-100"
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
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            disabled={loading}
            className="w-full px-4 py-3 border border-[#E9ECEF] rounded-xl outline-none focus:ring-2 focus:ring-[#70B8AE] disabled:bg-gray-100"
          />
        </div>

        {/* Konfirmasi Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-semibold text-[#35485E] mb-2"
          >
            Konfirmasi Password
          </label>

          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Ulangi password"
            autoComplete="new-password"
            required
            disabled={loading}
            className="w-full px-4 py-3 border border-[#E9ECEF] rounded-xl outline-none focus:ring-2 focus:ring-[#70B8AE] disabled:bg-gray-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#70B8AE] hover:bg-[#529F93] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
        >
          {loading ? "Memproses..." : "Daftar Sekarang"}
        </button>
      </form>

      <div className="text-center mt-6 text-sm text-[#87919D]">
        Sudah memiliki akun?{" "}
        <Link
          to="/auth/login"
          className="text-[#529F93] font-bold hover:underline"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
