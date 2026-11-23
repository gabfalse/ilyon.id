import { useCallback, useEffect, useState } from "react";

import RecruitmentApplications from "./RecruitmentApplications";

import {
  getRecruitmentVacancies,
  updateRecruitmentVacancyStatus,
  deleteRecruitmentVacancy,
  sendRecruitmentTestEmail,
} from "../../../Services/RecruitmentService";

import VacancyDetail from "./VacancyDetail";
import VacancyForm from "./VacancyForm";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Dipublikasikan" },
  { value: "closed", label: "Ditutup" },
  { value: "archived", label: "Diarsipkan" },
];

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-700",
  archived: "bg-yellow-100 text-yellow-700",
};

const STATUS_LABELS = {
  draft: "Draft",
  published: "Dipublikasikan",
  closed: "Ditutup",
  archived: "Diarsipkan",
};

const EMPLOYMENT_LABELS = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Kontrak",
  internship: "Magang",
};

export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState("vacancies");

  const [vacancies, setVacancies] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState("");
  const [testEmailError, setTestEmailError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState(null);
  const [selectedDetailId, setSelectedDetailId] = useState(null);

  // ==========================================
  // LOAD VACANCIES
  // ==========================================

  const loadVacancies = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError("");

        const result = await getRecruitmentVacancies({
          page,
          limit: 10,
          search,
          status,
        });

        setVacancies(result?.items || []);

        setPagination(
          result?.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        );
      } catch (err) {
        setError(err.message || "Gagal mengambil daftar lowongan.");
      } finally {
        setLoading(false);
      }
    },
    [search, status],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadVacancies(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [loadVacancies]);

  // ==========================================
  // PAGINATION
  // ==========================================

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.totalPages) return;

    loadVacancies(page);
  };

  // ==========================================
  // VACANCY ACTIONS
  // ==========================================

  const handleAdd = () => {
    setSelectedVacancy(null);
    setShowForm(true);
  };

  const handleDetail = (vacancy) => {
    setSelectedDetailId(vacancy.id);
  };

  const handleEdit = (vacancy) => {
    setSelectedVacancy(vacancy);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    loadVacancies(pagination.page);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedVacancy(null);
  };

  // ==========================================
  // TEST EMAIL
  // ==========================================

  const handleTestEmail = async () => {
    const confirmed = window.confirm(
      "Kirim email pengujian Resend ke alamat email akun super admin yang sedang login?",
    );

    if (!confirmed) return;

    try {
      setTestEmailLoading(true);
      setTestEmailMessage("");
      setTestEmailError("");

      const result = await sendRecruitmentTestEmail();

      setTestEmailMessage(
        `${result.message} Tujuan: ${result.data?.recipient || "-"}`,
      );
    } catch (err) {
      setTestEmailError(err.message || "Gagal mengirim email tes.");
    } finally {
      setTestEmailLoading(false);
    }
  };

  // ==========================================
  // CHANGE VACANCY STATUS
  // ==========================================

  // ==========================================
  // CHANGE VACANCY STATUS
  // ==========================================

  const handleStatusChange = async (vacancy, nextStatus) => {
    const statusLabel = STATUS_LABELS[nextStatus];

    let confirmationMessage = `Apakah Anda yakin ingin mengubah status lowongan "${vacancy.title}" menjadi ${statusLabel}?`;

    if (nextStatus === "archived") {
      confirmationMessage =
        `Arsipkan lowongan "${vacancy.title}"?\n\n` +
        "Lowongan tidak lagi dianggap aktif, tetapi data lamaran dan riwayat pelamar tetap tersimpan.";
    }

    if (vacancy.status === "archived" && nextStatus === "draft") {
      confirmationMessage =
        `Buka kembali lowongan "${vacancy.title}"?\n\n` +
        "Status lowongan akan dikembalikan menjadi Draft.";
    }

    const confirmed = window.confirm(confirmationMessage);

    if (!confirmed) return;

    try {
      setError("");

      await updateRecruitmentVacancyStatus(vacancy.id, nextStatus);

      await loadVacancies(pagination.page);
    } catch (err) {
      setError(err.message || "Gagal mengubah status lowongan.");
    }
  };

  // ==========================================
  // DELETE VACANCY
  // ==========================================

  const handleDelete = async (vacancy) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus lowongan "${vacancy.title}"?\n\nData lowongan yang berhasil dihapus tidak dapat dikembalikan.`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await deleteRecruitmentVacancy(vacancy.id);

      const nextPage =
        vacancies.length === 1 && pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      await loadVacancies(nextPage);
    } catch (err) {
      setError(err.message || "Gagal menghapus lowongan.");
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#35485E]">
            Manajemen Rekrutmen
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Kelola lowongan pekerjaan dan kebutuhan tenaga kerja Ilyon Academy.
          </p>
        </div>

        {activeTab === "vacancies" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={testEmailLoading}
              className="rounded-xl border border-[#529F93] px-5 py-3 text-sm font-semibold text-[#529F93] transition hover:bg-[#529F93]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testEmailLoading ? "Mengirim..." : "Tes Email Resend"}
            </button>

            <button
              type="button"
              onClick={handleAdd}
              className="rounded-xl bg-[#529F93] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#438D82]"
            >
              + Tambah Lowongan
            </button>
          </div>
        )}
      </div>

      {/* RECRUITMENT TABS */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("vacancies")}
          className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "vacancies"
              ? "border-[#529F93] text-[#529F93]"
              : "border-transparent text-gray-500 hover:text-[#35485E]"
          }`}
        >
          Manajemen Lowongan
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("applications")}
          className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "applications"
              ? "border-[#529F93] text-[#529F93]"
              : "border-transparent text-gray-500 hover:text-[#35485E]"
          }`}
        >
          Daftar Lamaran
        </button>
      </div>

      {/* ====================================== */}
      {/* TAB: VACANCIES */}
      {/* ====================================== */}

      {activeTab === "vacancies" && (
        <div className="space-y-6">
          {/* EMAIL TEST FEEDBACK */}
          {testEmailMessage && (
            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
              {testEmailMessage}
            </div>
          )}

          {testEmailError && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {testEmailError}
            </div>
          )}

          {/* SUMMARY */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Lowongan</p>

              <p className="mt-2 text-3xl font-bold text-[#35485E]">
                {pagination.total}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Lowongan Ditampilkan</p>

              <p className="mt-2 text-3xl font-bold text-[#529F93]">
                {vacancies.length}
              </p>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {/* FILTER */}
            <div className="flex flex-col gap-3 border-b border-gray-100 p-5 md:flex-row">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari judul atau lokasi lowongan..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#529F93] md:flex-1"
              />

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#529F93]"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* ERROR */}
            {error && (
              <div className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* TABLE CONTENT */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#FCFAF5] text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Lowongan</th>
                    <th className="px-5 py-4 font-semibold">Kode</th>
                    <th className="px-5 py-4 font-semibold">Tipe Pekerjaan</th>
                    <th className="px-5 py-4 font-semibold">Lokasi</th>
                    <th className="px-5 py-4 font-semibold">Kuota</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-5 py-12 text-center text-gray-500"
                      >
                        Memuat data lowongan...
                      </td>
                    </tr>
                  ) : vacancies.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-12 text-center">
                        <p className="font-medium text-gray-600">
                          Belum ada lowongan pekerjaan.
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          Lowongan yang dibuat akan muncul di sini.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    vacancies.map((vacancy) => (
                      <tr
                        key={vacancy.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[#35485E]">
                            {vacancy.title || "-"}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {vacancy.branchName || "Semua Cabang"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {vacancy.vacancyCode || "-"}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {EMPLOYMENT_LABELS[vacancy.employmentType] || "-"}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {vacancy.location || "-"}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {vacancy.openings ?? 0}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              STATUS_STYLES[vacancy.status] ||
                              "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {STATUS_LABELS[vacancy.status] ||
                              vacancy.status ||
                              "-"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* DETAIL */}
                            <button
                              type="button"
                              onClick={() => handleDetail(vacancy)}
                              className="rounded-lg px-3 py-2 text-xs font-semibold text-[#35485E] transition hover:bg-gray-100"
                            >
                              Detail
                            </button>

                            {/* EDIT */}
                            <button
                              type="button"
                              onClick={() => handleEdit(vacancy)}
                              className="rounded-lg px-3 py-2 text-xs font-semibold text-[#529F93] transition hover:bg-[#529F93]/10"
                            >
                              Edit
                            </button>

                            {/* DELETE */}
                            <button
                              type="button"
                              onClick={() => handleDelete(vacancy)}
                              className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              Hapus
                            </button>

                            {/* DRAFT */}
                            {vacancy.status === "draft" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStatusChange(vacancy, "published")
                                  }
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-50"
                                >
                                  Terbitkan
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStatusChange(vacancy, "archived")
                                  }
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-yellow-700 transition hover:bg-yellow-50"
                                >
                                  Arsipkan
                                </button>
                              </>
                            )}

                            {/* PUBLISHED */}
                            {vacancy.status === "published" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(vacancy, "closed")
                                }
                                className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                              >
                                Tutup
                              </button>
                            )}

                            {/* CLOSED */}
                            {vacancy.status === "closed" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStatusChange(vacancy, "published")
                                  }
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-50"
                                >
                                  Buka Kembali
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStatusChange(vacancy, "archived")
                                  }
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-yellow-700 transition hover:bg-yellow-50"
                                >
                                  Arsipkan
                                </button>
                              </>
                            )}

                            {/* ARCHIVED */}
                            {vacancy.status === "archived" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(vacancy, "draft")
                                }
                                className="rounded-lg px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-50"
                              >
                                Buka Kembali
                              </button>
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
            <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center">
              <p className="text-xs text-gray-500">
                Total {pagination.total} lowongan
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={loading || pagination.page <= 1}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sebelumnya
                </button>

                <span className="px-2 text-xs text-gray-500">
                  Halaman {pagination.page} dari {pagination.totalPages || 1}
                </span>

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={loading || pagination.page >= pagination.totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </div>

          {/* FORM MODAL */}
          {showForm && (
            <VacancyForm
              vacancy={selectedVacancy}
              onClose={handleCloseForm}
              onSuccess={handleFormSuccess}
            />
          )}

          {/* DETAIL MODAL */}
          {selectedDetailId && (
            <VacancyDetail
              vacancyId={selectedDetailId}
              onClose={() => setSelectedDetailId(null)}
            />
          )}
        </div>
      )}

      {/* ====================================== */}
      {/* TAB: APPLICATIONS */}
      {/* ====================================== */}

      {activeTab === "applications" && <RecruitmentApplications />}
    </div>
  );
}
