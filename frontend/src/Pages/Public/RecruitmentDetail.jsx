import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../Contexts/AuthContext";

import {
  getPublicRecruitmentVacancies,
  submitPublicRecruitmentApplication,
} from "../../Services/RecruitmentPublicService";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  educationLevel: "",
  educationMajor: "",
  experienceYears: 0,
  currentOccupation: "",
  coverLetter: "",
  portfolioUrl: "",
};

export default function RecruitmentDetail() {
  const { vacancyId } = useParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [vacancy, setVacancy] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [cv, setCv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadVacancy() {
      try {
        setLoading(true);
        setError("");

        const result = await getPublicRecruitmentVacancies();
        const items = Array.isArray(result) ? result : result?.items || [];

        const selected = items.find(
          (item) => String(item.id) === String(vacancyId),
        );

        if (active) setVacancy(selected || null);
      } catch (err) {
        if (active) {
          setError(err.message || "Gagal mengambil informasi lowongan.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadVacancy();

    return () => {
      active = false;
    };
  }, [vacancyId]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setCv(null);
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("CV harus menggunakan format PDF.");
      event.target.value = "";
      setCv(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran CV maksimal 5 MB.");
      event.target.value = "";
      setCv(null);
      return;
    }

    setError("");
    setCv(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!cv) {
      setError("Silakan unggah CV dalam format PDF.");
      return;
    }

    try {
      setSubmitting(true);

      const result = await submitPublicRecruitmentApplication(
        {
          ...form,
          vacancyId,
          experienceYears: Number(form.experienceYears),
        },
        cv,
      );

      setSuccess(result);
      setForm(initialForm);
      setCv(null);
    } catch (err) {
      setError(err.message || "Lamaran gagal dikirim.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyApplicationInfo() {
    if (!success) return;

    try {
      await navigator.clipboard.writeText(
        `Nomor lamaran: ${success.applicationNumber}\nToken pelacakan: ${success.trackingToken}`,
      );

      setCopyMessage("Informasi lamaran berhasil disalin.");
    } catch {
      setCopyMessage(
        "Gagal menyalin otomatis. Silakan salin nomor dan token secara manual.",
      );
    }
  }

  if (loading || authLoading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        Memuat lowongan...
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold">Lowongan tidak ditemukan</h1>

        <Link to="/recruitment" className="mt-4 inline-block text-blue-600">
          Kembali ke halaman karier
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8">
          <h1 className="text-2xl font-bold text-green-800">
            Lamaran berhasil dikirim!
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-gray-700">
            Simpan nomor lamaran dan token pelacakan berikut. Keduanya
            diperlukan untuk memeriksa perkembangan proses lamaran Anda. Jangan
            membagikan token ini kepada orang lain.
          </p>

          <div className="mt-6 space-y-4 rounded-xl bg-white p-5">
            <div>
              <p className="text-sm text-gray-500">Nomor Lamaran</p>
              <p className="mt-1 break-all font-semibold text-gray-800">
                {success.applicationNumber}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Token Pelacakan</p>
              <p className="mt-1 break-all font-mono font-semibold text-gray-800">
                {success.trackingToken}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyApplicationInfo}
            className="mt-5 rounded-lg bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
          >
            Salin Informasi Lamaran
          </button>

          {copyMessage && (
            <p className="mt-3 text-sm text-green-800">{copyMessage}</p>
          )}

          <div className="mt-6">
            <Link
              to="/recruitment/tracking"
              className="font-semibold text-blue-700 underline"
            >
              Lacak Status Lamaran
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <Link to="/recruitment" className="text-sm font-medium text-blue-700">
          ← Kembali ke daftar lowongan
        </Link>

        {/* INFORMASI LOWONGAN */}
        <div className="mt-6 rounded-2xl bg-white p-7 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Lowongan Ilyon Academy
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            {vacancy.title}
          </h1>

          <p className="mt-3 text-gray-600">
            {vacancy.branchName ||
              vacancy.location ||
              "Lokasi tidak ditentukan"}
            {" · "}
            {String(vacancy.employmentType || "").replaceAll("_", " ")}
          </p>

          {vacancy.description && (
            <div className="mt-6">
              <h2 className="font-semibold">Deskripsi Pekerjaan</h2>
              <p className="mt-2 whitespace-pre-line text-gray-600">
                {vacancy.description}
              </p>
            </div>
          )}

          {vacancy.responsibilities && (
            <div className="mt-6">
              <h2 className="font-semibold">Tanggung Jawab</h2>
              <p className="mt-2 whitespace-pre-line text-gray-600">
                {vacancy.responsibilities}
              </p>
            </div>
          )}

          {vacancy.requirements && (
            <div className="mt-6">
              <h2 className="font-semibold">Persyaratan</h2>
              <p className="mt-2 whitespace-pre-line text-gray-600">
                {vacancy.requirements}
              </p>
            </div>
          )}
        </div>

        {/* FORMULIR LAMARAN */}

        {!isAuthenticated ? (
          <div className="mt-8 rounded-2xl border border-blue-100 bg-white p-7 shadow-sm">
            <div className="mx-auto max-w-xl py-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-blue-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0A17.9 17.9 0 0 1 12 21.75a17.9 17.9 0 0 1-7.5-1.65Z"
                  />
                </svg>
              </div>

              <h2 className="mt-5 text-2xl font-bold text-gray-900">
                Login untuk Melamar
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                Silakan login terlebih dahulu untuk mengirim lamaran pekerjaan
                di Ilyon Academy. Anda tetap dapat melihat informasi lowongan
                tanpa harus login.
              </p>

              <Link
                to="/auth/login"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-700 px-7 py-3 font-semibold text-white transition hover:bg-blue-800"
              >
                Login untuk Melamar
              </Link>

              <p className="mt-4 text-sm text-gray-500">
                Belum memiliki akun?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-blue-700 hover:underline"
                >
                  Daftar sekarang
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-7 rounded-2xl bg-white p-7 shadow-sm"
          >
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Formulir Lamaran
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Silakan lengkapi informasi diri Anda dengan benar.
                {/* Kolom
                bertanda <span className="font-semibold text-red-600">*</span>{" "}
                wajib diisi, sedangkan kolom bertanda{" "}
                <span className="font-medium text-gray-500">Opsional</span>{" "}
                boleh dikosongkan. */}
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* DATA PRIBADI */}
            <section>
              <h3 className="mb-4 border-b border-gray-100 pb-3 font-semibold text-gray-800">
                A. Informasi Pribadi
              </h3>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Nama Lengkap"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Nama lengkap"
                  helper="Masukkan nama lengkap sesuai identitas."
                  required
                />

                <Field
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email aktif"
                  helper="Gunakan email aktif yang dapat dihubungi."
                  required
                />

                <Field
                  label="Nomor Telepon"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Nomor telepon"
                  helper="Masukkan nomor telepon atau WhatsApp aktif."
                  required
                />

                <Field
                  label="Kota"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Nama kota"
                  helper="Nama kota tempat tinggal Anda."
                  required
                />

                <Field
                  label="Provinsi"
                  name="province"
                  value={form.province}
                  onChange={handleChange}
                  placeholder="Nama provinsi"
                  helper="Nama provinsi tempat tinggal Anda."
                  required
                />
              </div>

              <div className="mt-5">
                <FieldTextarea
                  label="Alamat Lengkap"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Alamat tempat tinggal"
                  helper="Masukkan alamat tempat tinggal saat ini."
                  rows={3}
                  required
                />
              </div>
            </section>

            {/* PENDIDIKAN DAN PENGALAMAN */}
            <section>
              <h3 className="mb-4 border-b border-gray-100 pb-3 font-semibold text-gray-800">
                B. Pendidikan dan Pengalaman
              </h3>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Pendidikan Terakhir"
                  name="educationLevel"
                  value={form.educationLevel}
                  onChange={handleChange}
                  placeholder="Contoh: SMA/SMK, D3, S1, atau S2"
                  helper="Tuliskan jenjang pendidikan terakhir."
                  required
                />

                <Field
                  label="Jurusan"
                  name="educationMajor"
                  value={form.educationMajor}
                  onChange={handleChange}
                  placeholder="Nama jurusan"
                  helper="Tuliskan jurusan atau bidang studi."
                  required
                />

                <Field
                  label="Pengalaman Kerja (Tahun)"
                  name="experienceYears"
                  type="number"
                  min="0"
                  max="80"
                  value={form.experienceYears}
                  onChange={handleChange}
                  placeholder="Contoh: 2"
                  helper="Isi 0 jika belum memiliki pengalaman kerja."
                  required
                />

                <Field
                  label="Status Saat Ini"
                  name="currentOccupation"
                  value={form.currentOccupation}
                  onChange={handleChange}
                  placeholder="Contoh: Mahasiswa atau bekerja"
                  helper="Jelaskan kegiatan atau pekerjaan Anda saat ini."
                  required
                />
              </div>
            </section>

            {/* INFORMASI TAMBAHAN */}
            <section>
              <h3 className="mb-4 border-b border-gray-100 pb-3 font-semibold text-gray-800">
                C. Informasi Tambahan
              </h3>

              <Field
                label="URL Portofolio"
                name="portfolioUrl"
                type="url"
                value={form.portfolioUrl}
                onChange={handleChange}
                placeholder="https://portofolioanda.com"
                helper="Cantumkan tautan portofolio jika tersedia."
                required
              />

              <div className="mt-5">
                <FieldTextarea
                  label="Apakah anda memiiki kendaraan pribadi?"
                  name="coverLetter"
                  value={form.coverLetter}
                  onChange={handleChange}
                  placeholder="Ya atau tidak"
                  helper=""
                  rows={5}
                  required
                />
              </div>
            </section>

            {/* CV */}
            <section>
              <h3 className="mb-4 border-b border-gray-100 pb-3 font-semibold text-gray-800">
                D. Dokumen Lamaran
              </h3>

              <label className="mb-2 block text-sm font-semibold text-gray-800">
                CV / Resume (PDF) <span className="text-red-600">*</span>
              </label>

              <p className="mb-3 text-xs leading-relaxed text-gray-500">
                Format wajib PDF dengan ukuran maksimal 5 MB.
              </p>

              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                required
                className="block w-full rounded-lg border border-gray-300 p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />

              {cv && (
                <div className="mt-3 rounded-lg bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-700">
                    File berhasil dipilih
                  </p>
                  <p className="mt-1 break-all text-xs text-green-700">
                    {cv.name}
                  </p>
                  <p className="mt-1 text-xs text-green-600">
                    {(cv.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}
            </section>

            {/* SUBMIT */}
            <div className="border-t border-gray-100 pt-6">
              <p className="mb-4 text-xs leading-relaxed text-gray-500">
                Pastikan informasi yang Anda masukkan sudah benar sebelum
                mengirim lamaran.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-blue-700 px-7 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {submitting ? "Mengirim Lamaran..." : "Kirim Lamaran"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

// ==========================================
// REUSABLE INPUT FIELD
// ==========================================

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  helper,
  required = false,
  optional = false,
  ...props
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-gray-800"
      >
        {label} {required && <span className="text-red-600">*</span>}
        {optional && (
          <span className="ml-1 text-xs font-normal text-gray-400">
            (Opsional)
          </span>
        )}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        {...props}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {helper && (
        <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{helper}</p>
      )}
    </div>
  );
}

// ==========================================
// REUSABLE TEXTAREA FIELD
// ==========================================

function FieldTextarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  helper,
  required = false,
  optional = false,
  rows = 3,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-gray-800"
      >
        {label} {required && <span className="text-red-600">*</span>}
        {optional && (
          <span className="ml-1 text-xs font-normal text-gray-400">
            (Opsional)
          </span>
        )}
      </label>

      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {helper && (
        <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{helper}</p>
      )}
    </div>
  );
}
