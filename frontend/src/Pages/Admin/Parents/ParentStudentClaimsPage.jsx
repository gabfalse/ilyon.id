import { useEffect, useState } from "react";

import {
  getAdminParentStudentClaims,
  approveParentStudentClaim,
  rejectParentStudentClaim,
} from "../../../Services/ParentService";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#35485E] outline-none transition focus:border-[#529F93] focus:ring-2 focus:ring-[#529F93]/10";

const statusLabels = {
  pending: "Menunggu Konfirmasi",
  approved: "Disetujui",
  rejected: "Ditolak",
};

const statusStyles = {
  pending: "bg-orange-50 text-orange-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
};

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ParentStudentClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedClaim, setSelectedClaim] = useState(null);
  const [rejectNotes, setRejectNotes] = useState("");

  async function loadClaims() {
    try {
      setLoading(true);
      setError("");

      const result = await getAdminParentStudentClaims();

      setClaims(result.data || []);
    } catch (err) {
      setError(err.message || "Gagal mengambil daftar pengajuan anak.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
  }, []);

  const pendingCount = claims.filter(
    (item) => item.status === "pending",
  ).length;

  const approvedCount = claims.filter(
    (item) => item.status === "approved",
  ).length;

  const rejectedCount = claims.filter(
    (item) => item.status === "rejected",
  ).length;

  const filteredClaims =
    filter === "all" ? claims : claims.filter((item) => item.status === filter);

  async function handleApprove(claim) {
    const confirmed = window.confirm(
      `Setujui pengajuan ${claim.studentName} dari ${claim.parentName}?`,
    );

    if (!confirmed) return;

    try {
      setProcessingId(claim.id);
      setError("");
      setSuccess("");

      await approveParentStudentClaim(claim.id);

      setSelectedClaim(null);
      setSuccess(`Pengajuan ${claim.studentName} berhasil disetujui.`);

      await loadClaims();
    } catch (err) {
      setError(err.message || "Gagal menyetujui pengajuan.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(claim) {
    if (!rejectNotes.trim()) {
      setError("Catatan penolakan wajib diisi.");
      return;
    }

    const confirmed = window.confirm(`Tolak pengajuan ${claim.studentName}?`);

    if (!confirmed) return;

    try {
      setProcessingId(claim.id);
      setError("");
      setSuccess("");

      await rejectParentStudentClaim(claim.id, rejectNotes.trim());

      setSelectedClaim(null);
      setRejectNotes("");

      setSuccess(`Pengajuan ${claim.studentName} berhasil ditolak.`);

      await loadClaims();
    } catch (err) {
      setError(err.message || "Gagal menolak pengajuan.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-bold text-[#35485E]">
          Konfirmasi Pengajuan Anak
        </h1>

        <p className="mt-1 text-sm text-[#87919D]">
          Periksa, setujui, atau tolak pengajuan hubungan anak dari akun orang
          tua.
        </p>
      </div>

      {/* ALERT */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* STATISTIK */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Total Pengajuan</p>
          <p className="mt-3 text-2xl font-bold text-[#35485E]">
            {claims.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Menunggu Konfirmasi</p>
          <p className="mt-3 text-2xl font-bold text-orange-500">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Disetujui</p>
          <p className="mt-3 text-2xl font-bold text-green-600">
            {approvedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Ditolak</p>
          <p className="mt-3 text-2xl font-bold text-red-500">
            {rejectedCount}
          </p>
        </div>
      </div>

      {/* DAFTAR PENGAJUAN */}

      <section className="overflow-hidden rounded-2xl border border-[#E9ECEF] bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-[#35485E]">Daftar Pengajuan</h2>
              <p className="mt-1 text-sm text-[#87919D]">
                Pengajuan terbaru ditampilkan terlebih dahulu.
              </p>
            </div>

            <button
              type="button"
              onClick={loadClaims}
              disabled={loading}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#529F93] hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "Memuat..." : "↻ Refresh"}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { value: "all", label: "Semua" },
              { value: "pending", label: "Menunggu" },
              { value: "approved", label: "Disetujui" },
              { value: "rejected", label: "Ditolak" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  filter === item.value
                    ? "bg-[#529F93] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-4">Kode Pengajuan</th>
                <th className="px-5 py-4">Data Anak</th>
                <th className="px-5 py-4">Orang Tua</th>
                <th className="px-5 py-4">Cabang</th>
                <th className="px-5 py-4">Tanggal</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Memuat pengajuan...
                  </td>
                </tr>
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Tidak ada pengajuan pada kategori ini.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {claim.claimCode || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {claim.studentName}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {claim.requestedStudentId
                          ? "Menghubungkan siswa yang sudah ada"
                          : "Pendaftaran siswa baru"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {claim.parentName || "-"}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {claim.relationshipLabel || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {claim.branchName || "-"}
                    </td>

                    <td className="px-5 py-4 text-xs text-gray-500">
                      {formatDate(claim.createdAt)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          statusStyles[claim.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {statusLabels[claim.status] || claim.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClaim(claim);
                            setRejectNotes("");
                            setError("");
                          }}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#529F93] hover:bg-gray-50"
                        >
                          Detail
                        </button>

                        {claim.status === "pending" && (
                          <button
                            type="button"
                            disabled={processingId === claim.id}
                            onClick={() => handleApprove(claim)}
                            className="rounded-lg bg-[#529F93] px-3 py-2 text-xs font-semibold text-white hover:bg-[#438C81] disabled:opacity-50"
                          >
                            Setujui
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

        <div className="border-t border-gray-100 px-5 py-4 text-xs text-gray-500">
          Menampilkan {filteredClaims.length} dari {claims.length} pengajuan.
        </div>
      </section>

      {/* MODAL DETAIL */}

      {selectedClaim && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  Detail Pengajuan Anak
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Kode: {selectedClaim.claimCode || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                  Informasi Anak
                </h3>

                <div className="grid gap-4 rounded-xl border border-gray-100 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-400">Nama Anak</p>
                    <p className="mt-1 text-sm font-semibold text-[#35485E]">
                      {selectedClaim.studentName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Tanggal Lahir</p>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedClaim.birthDate
                        ? new Date(selectedClaim.birthDate).toLocaleDateString(
                            "id-ID",
                          )
                        : "-"}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-400">Jenis Pengajuan</p>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedClaim.requestedStudentId
                        ? `Menghubungkan siswa: ${selectedClaim.existingStudentName || selectedClaim.studentName}`
                        : "Mendaftarkan siswa baru"}
                    </p>
                  </div>

                  {selectedClaim.studentCode && (
                    <div>
                      <p className="text-xs text-gray-400">Kode Siswa</p>
                      <p className="mt-1 text-sm font-semibold text-[#35485E]">
                        {selectedClaim.studentCode}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                  Informasi Orang Tua
                </h3>

                <div className="grid gap-4 rounded-xl border border-gray-100 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-400">Nama Orang Tua</p>
                    <p className="mt-1 text-sm font-semibold text-[#35485E]">
                      {selectedClaim.parentName || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Hubungan</p>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedClaim.relationshipLabel || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Telepon</p>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedClaim.parentPhone || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">WhatsApp Pengajuan</p>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedClaim.whatsappNumber || "-"}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedClaim.parentEmail || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                  Informasi Pengajuan
                </h3>

                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs text-gray-400">Cabang</p>
                  <p className="mt-1 text-sm font-semibold text-[#35485E]">
                    {selectedClaim.branchName || "-"}
                  </p>

                  <p className="mt-4 text-xs text-gray-400">
                    Tanggal Pengajuan
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {formatDate(selectedClaim.createdAt)}
                  </p>

                  <p className="mt-4 text-xs text-gray-400">Status</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-3 py-1.5 text-xs font-semibold ${
                      statusStyles[selectedClaim.status] ||
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {statusLabels[selectedClaim.status] || selectedClaim.status}
                  </span>

                  {selectedClaim.reviewNotes && (
                    <>
                      <p className="mt-4 text-xs text-gray-400">
                        Catatan Review
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
                        {selectedClaim.reviewNotes}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {selectedClaim.status === "pending" && (
                <div className="space-y-4 border-t border-gray-100 pt-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#35485E]">
                      Catatan Penolakan
                    </label>
                    <textarea
                      value={rejectNotes}
                      onChange={(event) => setRejectNotes(event.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="Wajib diisi jika pengajuan ditolak..."
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col justify-end gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={processingId === selectedClaim.id}
                      onClick={() => handleReject(selectedClaim)}
                      className="rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {processingId === selectedClaim.id
                        ? "Memproses..."
                        : "Tolak Pengajuan"}
                    </button>

                    <button
                      type="button"
                      disabled={processingId === selectedClaim.id}
                      onClick={() => handleApprove(selectedClaim)}
                      className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#438C81] disabled:opacity-50"
                    >
                      {processingId === selectedClaim.id
                        ? "Memproses..."
                        : "Setujui Pengajuan"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setSelectedClaim(null)}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
