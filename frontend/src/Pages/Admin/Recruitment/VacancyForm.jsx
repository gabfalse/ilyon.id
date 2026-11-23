import { useEffect, useState } from "react";
import {
  createRecruitmentVacancy,
  updateRecruitmentVacancy,
} from "../../../Services/RecruitmentService";

const INITIAL_FORM = {
  title: "",
  branchId: "",
  employmentType: "full_time",
  location: "",
  description: "",
  responsibilities: "",
  requirements: "",
  openings: 1,
  closesAt: "",
};

const EMPLOYMENT_OPTIONS = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Kontrak" },
  { value: "internship", label: "Magang" },
];

export default function VacancyForm({ vacancy = null, onClose, onSuccess }) {
  const isEdit = Boolean(vacancy?.id);

  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!vacancy) {
      setForm(INITIAL_FORM);
      return;
    }

    setForm({
      title: vacancy.title || "",
      branchId: vacancy.branchId || "",
      employmentType: vacancy.employmentType || "full_time",
      location: vacancy.location || "",
      description: vacancy.description || "",
      responsibilities: vacancy.responsibilities || "",
      requirements: vacancy.requirements || "",
      openings: vacancy.openings ?? 1,
      closesAt: vacancy.closesAt
        ? new Date(vacancy.closesAt).toISOString().slice(0, 16)
        : "",
    });
  }, [vacancy]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: name === "openings" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const payload = {
        title: form.title.trim(),
        branchId: form.branchId.trim() || null,
        employmentType: form.employmentType,
        location: form.location.trim(),
        description: form.description.trim(),
        responsibilities: form.responsibilities.trim(),
        requirements: form.requirements.trim(),
        openings: form.openings,
        closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : null,
      };

      if (isEdit) {
        await updateRecruitmentVacancy(vacancy.id, payload);
      } else {
        await createRecruitmentVacancy(payload);
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.message || "Gagal menyimpan lowongan.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#529F93] focus:ring-2 focus:ring-[#529F93]/10";

  const labelClass = "mb-2 block text-sm font-semibold text-[#35485E]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-[#35485E]">
              {isEdit ? "Edit Lowongan" : "Tambah Lowongan"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Lengkapi informasi lowongan pekerjaan.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-3 py-2 text-xl text-gray-400 hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-6">
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* JUDUL */}
          <div>
            <label className={labelClass}>Judul Lowongan *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className={inputClass}
              placeholder="Contoh: Tutor Matematika"
              required
              maxLength={150}
            />
          </div>

          {/* TIPE DAN LOKASI */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Tipe Pekerjaan *</label>
              <select
                name="employmentType"
                value={form.employmentType}
                onChange={handleChange}
                className={inputClass}
                required
              >
                {EMPLOYMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Lokasi *</label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                className={inputClass}
                placeholder="Contoh: Depok / Remote"
                required
                maxLength={150}
              />
            </div>
          </div>

          {/* JUMLAH DAN CABANG */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Jumlah Kebutuhan *</label>
              <input
                type="number"
                name="openings"
                value={form.openings}
                onChange={handleChange}
                className={inputClass}
                min="1"
                max="1000"
                required
              />
            </div>

            <div>
              <label className={labelClass}>ID Cabang (Opsional)</label>
              <input
                name="branchId"
                value={form.branchId}
                onChange={handleChange}
                className={inputClass}
                placeholder="Kosongkan untuk semua cabang"
              />
            </div>
          </div>

          {/* DESKRIPSI */}
          <div>
            <label className={labelClass}>Deskripsi Pekerjaan *</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className={inputClass}
              rows={4}
              placeholder="Jelaskan gambaran umum pekerjaan..."
              required
            />
          </div>

          {/* TANGGUNG JAWAB */}
          <div>
            <label className={labelClass}>Tanggung Jawab *</label>
            <textarea
              name="responsibilities"
              value={form.responsibilities}
              onChange={handleChange}
              className={inputClass}
              rows={4}
              placeholder="Jelaskan tanggung jawab pekerjaan..."
              required
            />
          </div>

          {/* PERSYARATAN */}
          <div>
            <label className={labelClass}>Persyaratan *</label>
            <textarea
              name="requirements"
              value={form.requirements}
              onChange={handleChange}
              className={inputClass}
              rows={4}
              placeholder="Jelaskan kualifikasi dan persyaratan..."
              required
            />
          </div>

          {/* BATAS PENDAFTARAN */}
          <div>
            <label className={labelClass}>Batas Akhir Pendaftaran</label>
            <input
              type="datetime-local"
              name="closesAt"
              value={form.closesAt}
              onChange={handleChange}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              Kosongkan jika tidak ada batas waktu.
            </p>
          </div>

          {/* FOOTER */}
          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#529F93] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#438D82] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Menyimpan..."
                : isEdit
                  ? "Simpan Perubahan"
                  : "Simpan sebagai Draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
