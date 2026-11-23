import { useState } from "react";
import { createStaff, updateStaff } from "../../../Services/StaffService";

const statusOptions = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "on_leave", label: "Cuti" },
  { value: "resigned", label: "Mengundurkan diri" },
];

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#70B8AE] focus:ring-2 focus:ring-[#70B8AE]/20";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  staffCode: "",
  jobTitle: "",
  employmentStatus: "active",
  branchId: "",
  joinDate: "",
  assignedFrom: "",
  notes: "",
};

function getInitialForm(staff) {
  if (!staff) return initialForm;

  return {
    fullName: staff.fullName || "",
    email: staff.email || "",
    phone: staff.phone || "",
    password: "",
    staffCode: staff.staffCode || "",
    jobTitle: staff.jobTitle || "",
    employmentStatus: staff.employmentStatus || "active",
    branchId: "",
    joinDate: staff.joinDate ? String(staff.joinDate).slice(0, 10) : "",
    assignedFrom: "",
    notes: staff.notes || "",
  };
}

export default function StaffFormModal({
  branches = [],
  staff = null,
  onClose,
  onCreated,
  onUpdated,
}) {
  const isEditing = Boolean(staff);

  const [form, setForm] = useState(() => getInitialForm(staff));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.email.trim() && !form.phone.trim()) {
      setError("Email atau nomor telepon wajib diisi.");
      return;
    }

    // ==========================================
    // MODE EDIT STAFF
    // ==========================================

    if (isEditing) {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        staffCode: form.staffCode.trim() || null,
        jobTitle: form.jobTitle.trim() || null,
        employmentStatus: form.employmentStatus,
        joinDate: form.joinDate || null,
        notes: form.notes.trim() || null,
      };

      try {
        setLoading(true);

        const result = await updateStaff(staff.id, payload);

        if (onUpdated) {
          onUpdated(result);
        }
      } catch (err) {
        setError(err.message || "Gagal memperbarui data Staff.");
      } finally {
        setLoading(false);
      }

      return;
    }

    // ==========================================
    // MODE TAMBAH STAFF
    // ==========================================

    if (!form.branchId) {
      setError("Silakan pilih cabang penugasan.");
      return;
    }

    if (!form.password || form.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      password: form.password,
      staffCode: form.staffCode.trim() || null,
      jobTitle: form.jobTitle.trim() || null,
      employmentStatus: form.employmentStatus,
      branchId: form.branchId,
      joinDate: form.joinDate || null,
      assignedFrom: form.assignedFrom || undefined,
      notes: form.notes.trim() || null,
    };

    try {
      setLoading(true);

      const result = await createStaff(payload);

      setForm(initialForm);

      if (onCreated) {
        onCreated(result);
      }
    } catch (err) {
      setError(err.message || "Gagal menambahkan Staff.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-[#35485E]">
              {isEditing ? "Edit Staff" : "Tambah Staff"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {isEditing
                ? "Perbarui informasi profil Staff."
                : "Buat profil Staff sekaligus akun login."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-3 py-2 text-xl text-gray-400 hover:bg-gray-100 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Informasi Staff */}
          <section>
            <h3 className="mb-4 font-semibold text-[#35485E]">
              Informasi Staff
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-600">
                  Nama Lengkap *
                </label>

                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={180}
                  className={inputClass}
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-600">
                  Kode Staff
                </label>

                <input
                  name="staffCode"
                  value={form.staffCode}
                  onChange={handleChange}
                  maxLength={40}
                  className={inputClass}
                  placeholder="Contoh: STF001"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-600">
                  Jabatan
                </label>

                <input
                  name="jobTitle"
                  value={form.jobTitle}
                  onChange={handleChange}
                  maxLength={120}
                  className={inputClass}
                  placeholder="Contoh: Admin Cabang"
                />
              </div>
            </div>
          </section>

          {/* Informasi Kontak */}
          <section>
            <h3 className="mb-4 font-semibold text-[#35485E]">
              Informasi Kontak
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-600">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  maxLength={180}
                  className={inputClass}
                  placeholder="nama@email.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-600">
                  Nomor Telepon
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  maxLength={40}
                  className={inputClass}
                  placeholder="08xxxxxxxxxx"
                />
              </div>

              <p className="text-xs text-gray-400 md:col-span-2">
                Email atau nomor telepon wajib diisi minimal salah satu.
              </p>
            </div>
          </section>

          {/* Akun Login - hanya saat tambah */}
          {!isEditing && (
            <section>
              <h3 className="mb-4 font-semibold text-[#35485E]">Akun Login</h3>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-600">
                  Password *
                </label>

                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  className={inputClass}
                  placeholder="Minimal 8 karakter"
                />
              </div>
            </section>
          )}

          {/* Penugasan - hanya saat tambah */}
          {!isEditing && (
            <section>
              <h3 className="mb-4 font-semibold text-[#35485E]">
                Penugasan Awal
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-600">
                    Cabang Penugasan Awal *
                  </label>

                  <select
                    name="branchId"
                    value={form.branchId}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="">Pilih Cabang</option>

                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.branchName}
                      </option>
                    ))}
                  </select>

                  {branches.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">
                      Tidak ada cabang aktif yang tersedia.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-600">
                    Tanggal Mulai Penugasan
                  </label>

                  <input
                    type="date"
                    name="assignedFrom"
                    value={form.assignedFrom}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Status dan Tanggal Bergabung */}
          <section>
            <h3 className="mb-4 font-semibold text-[#35485E]">
              Status Kepegawaian
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-600">
                  Status Kepegawaian *
                </label>

                <select
                  name="employmentStatus"
                  value={form.employmentStatus}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {statusOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-600">
                  Tanggal Bergabung
                </label>

                <input
                  type="date"
                  name="joinDate"
                  value={form.joinDate}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Catatan */}
          <section>
            <label className="mb-1.5 block text-sm font-medium text-gray-600">
              Catatan
            </label>

            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              maxLength={5000}
              className={inputClass}
              placeholder="Catatan tambahan mengenai Staff..."
            />
          </section>

          {/* Tombol */}
          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading || (!isEditing && branches.length === 0)}
              className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#438F83] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Menyimpan..."
                : isEditing
                  ? "Simpan Perubahan"
                  : "Simpan Staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
