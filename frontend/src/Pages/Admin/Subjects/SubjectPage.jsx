import { useEffect, useState } from "react";

import {
  getSubjects,
  createSubject,
  updateSubject,
  updateSubjectStatus,
  getProgramSubjects,
  updateProgramSubjects,
} from "../../../Services/SubjectService";

import { getPrograms } from "../../../Services/ProgramService";

import { useAuth } from "../../../Contexts/AuthContext";

const initialForm = {
  subjectCode: "",
  subjectName: "",
  description: "",
};

export default function SubjectPage() {
  const { user } = useAuth();

  const isSuperAdmin = (user?.roles ?? []).some(
    (role) => role.roleCode === "super_admin" && role.isActive !== false,
  );

  const [subjects, setSubjects] = useState([]);
  const [programs, setPrograms] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  // ==========================================
  // STATE MAPPING PROGRAM - SUBJECT
  // ==========================================

  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(false);

  // ==========================================
  // LOAD DATA
  // ==========================================

  async function loadSubjects(page = 1) {
    try {
      setLoading(true);
      setError("");

      const result = await getSubjects({
        search,
        page,
        limit: 10,
      });

      setSubjects(result.data || []);
      setPagination(
        result.pagination || {
          page: 1,
          totalPages: 1,
          total: 0,
        },
      );
    } catch (err) {
      setError(err.message || "Gagal mengambil data mata pelajaran.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPrograms() {
    try {
      const result = await getPrograms({
        page: 1,
        limit: 100,
        isActive: true,
      });

      setPrograms(result.data || []);
    } catch (err) {
      setError(err.message || "Gagal mengambil data program.");
    }
  }

  useEffect(() => {
    loadSubjects(1);
  }, [search]);

  useEffect(() => {
    loadPrograms();
  }, []);

  // ==========================================
  // FORM SUBJECT
  // ==========================================

  function openCreateModal() {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(subject) {
    setEditingId(subject.id);

    setForm({
      subjectCode: subject.subjectCode || "",
      subjectName: subject.subjectName || "",
      description: subject.description || "",
    });

    setError("");
    setModalOpen(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        subjectCode: form.subjectCode.trim().toUpperCase(),
        subjectName: form.subjectName.trim(),
        description: form.description.trim() || null,
      };

      if (editingId) {
        await updateSubject(editingId, payload);
        setSuccess("Mata pelajaran berhasil diperbarui.");
      } else {
        await createSubject(payload);
        setSuccess("Mata pelajaran berhasil ditambahkan.");
      }

      setModalOpen(false);
      setForm(initialForm);
      setEditingId(null);

      await loadSubjects(editingId ? pagination.page : 1);
    } catch (err) {
      setError(err.message || "Gagal menyimpan mata pelajaran.");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // STATUS SUBJECT
  // ==========================================

  async function handleStatusChange(subject) {
    const action = subject.isActive ? "menonaktifkan" : "mengaktifkan";

    if (!window.confirm(`Yakin ingin ${action} mata pelajaran ini?`)) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await updateSubjectStatus(subject.id, !subject.isActive);

      setSuccess("Status mata pelajaran berhasil diperbarui.");

      await loadSubjects(pagination.page);
    } catch (err) {
      setError(err.message || "Gagal mengubah status mata pelajaran.");
    }
  }

  // ==========================================
  // PROGRAM SUBJECT MAPPING
  // ==========================================

  async function openMappingModal(program) {
    try {
      setSelectedProgram(program);
      setSelectedSubjects([]);
      setMappingModalOpen(true);
      setMappingLoading(true);
      setError("");

      const result = await getProgramSubjects(program.id);

      const mappedSubjects = result.data || [];

      setSelectedSubjects(
        mappedSubjects.map((subject) => ({
          subjectId: subject.id,
          isRequired: subject.isRequired ?? false,
        })),
      );
    } catch (err) {
      setError(err.message || "Gagal mengambil hubungan mata pelajaran.");
      setMappingModalOpen(false);
    } finally {
      setMappingLoading(false);
    }
  }

  function toggleSubject(subjectId) {
    setSelectedSubjects((previous) => {
      const exists = previous.some((item) => item.subjectId === subjectId);

      if (exists) {
        return previous.filter((item) => item.subjectId !== subjectId);
      }

      return [
        ...previous,
        {
          subjectId,
          isRequired: false,
        },
      ];
    });
  }

  function toggleRequired(subjectId) {
    setSelectedSubjects((previous) =>
      previous.map((item) =>
        item.subjectId === subjectId
          ? {
              ...item,
              isRequired: !item.isRequired,
            }
          : item,
      ),
    );
  }

  async function handleSaveMapping(event) {
    event.preventDefault();

    if (!selectedProgram) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await updateProgramSubjects(selectedProgram.id, selectedSubjects);

      setMappingModalOpen(false);
      setSelectedProgram(null);
      setSelectedSubjects([]);

      setSuccess(
        `Mata pelajaran program ${selectedProgram.programName} berhasil diperbarui.`,
      );
    } catch (err) {
      setError(err.message || "Gagal menyimpan hubungan mata pelajaran.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#70B8AE] focus:ring-2 focus:ring-[#70B8AE]/20";

  const activeCount = subjects.filter((subject) => subject.isActive).length;

  const inactiveCount = subjects.filter((subject) => !subject.isActive).length;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#35485E]">
            Manajemen Mata Pelajaran
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Kelola mata pelajaran dan hubungannya dengan program pembelajaran.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={openCreateModal}
            className="rounded-xl bg-[#529F93] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#438C81]"
          >
            + Tambah Mata Pelajaran
          </button>
        )}
      </div>

      {/* NOTIFIKASI */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* STATISTIK */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-sm text-gray-500">Total Mata Pelajaran</p>

          <p className="mt-2 text-2xl font-bold text-[#35485E]">
            {pagination.total}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-sm text-gray-500">Mata Pelajaran Aktif</p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-sm text-gray-500">Mata Pelajaran Nonaktif</p>

          <p className="mt-2 text-2xl font-bold text-red-500">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* TABEL SUBJECT */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 p-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode atau nama mata pelajaran..."
            className={`${inputClass} max-w-md`}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-4">Mata Pelajaran</th>
                <th className="px-5 py-4">Kode</th>
                <th className="px-5 py-4">Deskripsi</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Memuat data mata pelajaran...
                  </td>
                </tr>
              ) : subjects.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Tidak ada data mata pelajaran.
                  </td>
                </tr>
              ) : (
                subjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {subject.subjectName}
                      </p>
                    </td>

                    <td className="px-5 py-4">{subject.subjectCode}</td>

                    <td className="px-5 py-4">
                      <p className="max-w-xs truncate text-gray-500">
                        {subject.description || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          subject.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {subject.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => openEditModal(subject)}
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleStatusChange(subject)}
                              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                                subject.isActive
                                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                                  : "bg-green-50 text-green-700 hover:bg-green-100"
                              }`}
                            >
                              {subject.isActive ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
          <p className="text-xs text-gray-500">
            Total {pagination.total} mata pelajaran
          </p>

          <div className="flex items-center gap-3">
            <button
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadSubjects(pagination.page - 1)}
              className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"
            >
              Sebelumnya
            </button>

            <span className="text-xs text-gray-500">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadSubjects(pagination.page + 1)}
              className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* DAFTAR PROGRAM DAN MAPPING */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div>
          <h2 className="text-lg font-bold text-[#35485E]">
            Mata Pelajaran per Program
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Atur mata pelajaran yang tersedia pada masing-masing program.
          </p>
        </div>

        <div className="mt-4 divide-y divide-gray-100">
          {programs.length === 0 ? (
            <p className="py-5 text-center text-sm text-gray-400">
              Belum ada program aktif.
            </p>
          ) : (
            programs.map((program) => (
              <div
                key={program.id}
                className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-semibold text-[#35485E]">
                    {program.programName}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    {program.programCode}
                  </p>
                </div>

                {isSuperAdmin ? (
                  <button
                    onClick={() => openMappingModal(program)}
                    className="rounded-lg border border-[#529F93] px-4 py-2 text-xs font-semibold text-[#438C81] hover:bg-[#F5FAF9]"
                  >
                    Atur Mata Pelajaran
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">
                    Hanya dapat melihat
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL FORM SUBJECT */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  {editingId ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Lengkapi informasi mata pelajaran.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-1 text-sm">
                <span className="font-semibold">Kode Mata Pelajaran *</span>

                <input
                  name="subjectCode"
                  value={form.subjectCode}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={50}
                  disabled={Boolean(editingId)}
                  placeholder="Contoh: MATHEMATICS"
                  className={inputClass}
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-semibold">Nama Mata Pelajaran *</span>

                <input
                  name="subjectName"
                  value={form.subjectName}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={150}
                  placeholder="Nama mata pelajaran"
                  className={inputClass}
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-semibold">Deskripsi</span>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="3"
                  className={inputClass}
                />
              </label>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MAPPING PROGRAM - SUBJECT */}
      {mappingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  Atur Mata Pelajaran
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Program: {selectedProgram?.programName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMappingModalOpen(false)}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {mappingLoading ? (
              <p className="py-10 text-center text-sm text-gray-400">
                Memuat hubungan mata pelajaran...
              </p>
            ) : (
              <form onSubmit={handleSaveMapping} className="space-y-4">
                <div className="space-y-3">
                  {subjects.filter((subject) => subject.isActive).length ===
                  0 ? (
                    <p className="text-sm text-gray-400">
                      Belum ada mata pelajaran aktif.
                    </p>
                  ) : (
                    subjects
                      .filter((subject) => subject.isActive)
                      .map((subject) => {
                        const selected = selectedSubjects.find(
                          (item) => item.subjectId === subject.id,
                        );

                        return (
                          <div
                            key={subject.id}
                            className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <label className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={Boolean(selected)}
                                onChange={() => toggleSubject(subject.id)}
                                className="h-4 w-4 accent-[#529F93]"
                              />

                              <span>
                                <span className="block text-sm font-semibold text-[#35485E]">
                                  {subject.subjectName}
                                </span>

                                <span className="text-xs text-gray-400">
                                  {subject.subjectCode}
                                </span>
                              </span>
                            </label>

                            {selected && (
                              <label className="flex items-center gap-2 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={selected.isRequired}
                                  onChange={() => toggleRequired(subject.id)}
                                  className="h-4 w-4 accent-[#529F93]"
                                />
                                Mata pelajaran wajib
                              </label>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setMappingModalOpen(false)}
                    className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={saving || mappingLoading}
                    className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan Hubungan"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
