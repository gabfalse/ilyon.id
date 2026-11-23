import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getMyParentStudentClaims,
  getMyParentDashboard,
} from "../../Services/ParentService";

export default function DataAnak() {
  const navigate = useNavigate();

  const [claims, setClaims] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadClaims() {
    try {
      setLoading(true);
      setError("");

      const [claimsResponse, dashboardResponse] = await Promise.all([
        getMyParentStudentClaims(),
        getMyParentDashboard(),
      ]);

      setClaims(Array.isArray(claimsResponse?.data) ? claimsResponse.data : []);

      setDashboard(dashboardResponse?.data || null);
    } catch (err) {
      setError(err.message || "Gagal mengambil data anak.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
  }, []);

  const linkedChildren = dashboard?.children || [];

  const pendingClaims = claims.filter((claim) => claim.status === "pending");

  const rejectedClaims = claims.filter((claim) => claim.status === "rejected");

  function getStatus(status) {
    const config = {
      pending: {
        label: "Menunggu Persetujuan",
        style: "bg-amber-50 text-amber-700",
      },
      approved: {
        label: "Disetujui",
        style: "bg-green-50 text-green-700",
      },
      rejected: {
        label: "Ditolak",
        style: "bg-red-50 text-red-700",
      },
    };

    return (
      config[status] || {
        label: status || "Tidak diketahui",
        style: "bg-gray-100 text-gray-600",
      }
    );
  }

  function renderClaim(claim) {
    const status = getStatus(claim.status);

    return (
      <div key={claim.id} className="rounded-xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-[#35485E]">
              {claim.approvedStudentName ||
                claim.studentName ||
                "Pengajuan Siswa"}
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              {claim.branchName || "Unit tidak tersedia"}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${status.style}`}
          >
            {status.label}
          </span>
        </div>

        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Kode Klaim</p>
          <p className="mt-1 font-bold tracking-wider text-[#35485E]">
            {claim.claimCode || "-"}
          </p>
        </div>

        {claim.studentCode && (
          <p className="mt-3 text-sm text-gray-600">
            Kode Siswa: <strong>{claim.studentCode}</strong>
          </p>
        )}

        {claim.reviewNotes && (
          <div className="mt-3 rounded-lg bg-red-50 p-3">
            <p className="text-xs font-bold text-red-700">Catatan Admin</p>
            <p className="mt-1 text-sm text-red-600">{claim.reviewNotes}</p>
          </div>
        )}

        <p className="mt-3 text-xs text-gray-400">
          Diajukan:{" "}
          {claim.createdAt
            ? new Date(claim.createdAt).toLocaleString("id-ID")
            : "-"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#35485E]">Data Anak</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola anak yang terhubung dengan akun Parent.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/parent/pendaftaran-anak")}
          className="rounded-xl bg-[#70B8AE] px-5 py-3 font-bold text-white hover:bg-[#5CA69B]"
        >
          + Daftarkan Anak
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Anak Terhubung</p>
          <p className="mt-2 text-3xl font-extrabold text-[#35485E]">
            {linkedChildren.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Menunggu Persetujuan</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">
            {pendingClaims.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Pengajuan Ditolak</p>
          <p className="mt-2 text-3xl font-extrabold text-red-600">
            {rejectedClaims.length}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#35485E]">Anak Terhubung</h2>

          <button
            type="button"
            onClick={loadClaims}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Memuat..." : "↻ Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="mt-5 text-sm text-gray-500">Memuat data anak...</p>
        ) : linkedChildren.length === 0 ? (
          <p className="mt-5 rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
            Belum ada anak yang terhubung melalui pengajuan.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {linkedChildren.map((child) => (
              <div
                key={child.id}
                className="rounded-xl border border-gray-100 p-5 transition hover:border-[#70B8AE]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#35485E]">
                      {child.fullName}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      {child.studentCode || "Kode siswa belum tersedia"}
                    </p>
                  </div>

                  <span className="rounded-full bg-[#EAF6F4] px-3 py-1 text-xs font-semibold text-[#4D9D92]">
                    {child.status || "Terdaftar"}
                  </span>
                </div>

                <div className="mt-4 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500">Hubungan</p>

                  <p className="mt-1 text-sm font-medium text-[#35485E]">
                    {child.relationshipLabel || "Tidak disebutkan"}
                  </p>
                </div>

                {child.canViewProgress && (
                  <div className="mt-3 text-xs font-medium text-[#4D9D92]">
                    ✓ Akses perkembangan belajar tersedia
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#35485E]">Riwayat Pengajuan</h2>

        {loading ? (
          <p className="mt-5 text-sm text-gray-500">
            Memuat riwayat pengajuan...
          </p>
        ) : claims.length === 0 ? (
          <p className="mt-5 rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
            Belum ada riwayat pengajuan anak.
          </p>
        ) : (
          <div className="mt-5 space-y-3">{claims.map(renderClaim)}</div>
        )}
      </section>
    </div>
  );
}
