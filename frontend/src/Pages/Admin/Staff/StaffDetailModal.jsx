import { useEffect, useState } from "react";

import {
  getStaffById,
  transferStaff,
  updateStaffStatus,
} from "../../../Services/StaffService";

import HrDocumentsSection from "../../../Components/Admin/HrDocumentsSection";

const statusLabels = {
  active: "Aktif",
  inactive: "Nonaktif",
  on_leave: "Cuti",
  resigned: "Mengundurkan diri",
};

const statusStyles = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-red-50 text-red-600",
  on_leave: "bg-yellow-50 text-yellow-700",
  resigned: "bg-gray-100 text-gray-600",
};

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#35485E]">{value || "-"}</p>
    </div>
  );
}

export default function StaffDetailModal({
  staffId,
  branches = [],
  onClose,
  onEdit,
  onTransferred,
  onStatusChanged,
}) {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showTransferForm, setShowTransferForm] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState("");
  const [reason, setReason] = useState("");

  const [transferring, setTransferring] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function loadDetail() {
    try {
      setLoading(true);
      setError("");

      const result = await getStaffById(staffId);
      setStaff(result.data);
    } catch (err) {
      setError(err.message || "Gagal mengambil detail Staff.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const result = await getStaffById(staffId);

        if (isMounted) {
          setStaff(result.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Gagal mengambil detail Staff.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [staffId]);

  const currentAssignment = staff?.branchAssignments?.find(
    (assignment) => assignment.isActive,
  );

  const availableBranches = branches.filter(
    (branch) => branch.id !== currentAssignment?.branchId,
  );

  const busy = transferring || updatingStatus;

  async function handleStatusChange() {
    if (!staff) return;

    const nextStatus = !staff.accountIsActive;

    const actionLabel = nextStatus ? "mengaktifkan kembali" : "menonaktifkan";

    const confirmed = window.confirm(
      `Apakah kamu yakin ingin ${actionLabel} akun Staff ${staff.fullName}?`,
    );

    if (!confirmed) return;

    try {
      setUpdatingStatus(true);
      setError("");
      setSuccess("");

      await updateStaffStatus(staff.id, nextStatus);

      const result = await getStaffById(staff.id);
      setStaff(result.data);

      setSuccess(
        nextStatus
          ? "Akun Staff berhasil diaktifkan kembali."
          : "Akun Staff berhasil dinonaktifkan.",
      );

      onStatusChanged?.(result.data);
    } catch (err) {
      setError(err.message || "Gagal mengubah status akun Staff.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleTransfer(event) {
    event.preventDefault();

    if (!staff || staff.employmentStatus !== "active") {
      setError("Hanya Staff aktif yang dapat dipindahkan.");
      return;
    }

    if (!targetBranchId) {
      setError("Silakan pilih cabang tujuan.");
      return;
    }

    const targetBranch = branches.find(
      (branch) => branch.id === targetBranchId,
    );

    if (!targetBranch) {
      setError("Cabang tujuan tidak valid.");
      return;
    }

    const confirmed = window.confirm(
      `Pindahkan ${staff.fullName} ke cabang ${targetBranch.branchName}?`,
    );

    if (!confirmed) return;

    try {
      setTransferring(true);
      setError("");
      setSuccess("");

      await transferStaff(staff.id, {
        branchId: targetBranchId,
        assignedFrom: getTodayDate(),
        reason: reason.trim() || null,
      });

      setSuccess("Staff berhasil dipindahkan ke cabang baru.");
      setShowTransferForm(false);
      setTargetBranchId("");
      setReason("");

      await loadDetail();

      onTransferred?.(staff);
    } catch (err) {
      setError(err.message || "Gagal memindahkan Staff.");
    } finally {
      setTransferring(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-[#35485E]">Detail Staff</h2>
            <p className="mt-1 text-sm text-gray-500">
              Informasi lengkap profil dan penugasan Staff.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg px-3 py-2 text-xl text-gray-400 hover:bg-gray-100 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 p-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Memuat detail Staff...
            </div>
          ) : error && !staff ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : staff ? (
            <>
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

              {/* Profil */}
              <section>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-xl font-bold text-[#35485E]">
                      {staff.fullName}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {staff.jobTitle || "Jabatan belum diisi"}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
                      statusStyles[staff.employmentStatus] ||
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {statusLabels[staff.employmentStatus] ||
                      staff.employmentStatus ||
                      "-"}
                  </span>
                </div>
              </section>

              {/* Informasi Staff */}
              <section className="rounded-xl border border-gray-100 p-5">
                <h3 className="mb-5 font-semibold text-[#35485E]">
                  Informasi Staff
                </h3>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <DetailItem label="Kode Staff" value={staff.staffCode} />
                  <DetailItem label="Jabatan" value={staff.jobTitle} />
                  <DetailItem label="Nama Lengkap" value={staff.fullName} />
                  <DetailItem
                    label="Tanggal Bergabung"
                    value={formatDate(staff.joinDate)}
                  />
                  <DetailItem
                    label="Tanggal Dibuat"
                    value={formatDate(staff.createdAt)}
                  />
                  <DetailItem
                    label="Terakhir Diperbarui"
                    value={formatDate(staff.updatedAt)}
                  />
                </div>
              </section>

              {/* Kontak */}
              <section className="rounded-xl border border-gray-100 p-5">
                <h3 className="mb-5 font-semibold text-[#35485E]">
                  Informasi Kontak
                </h3>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <DetailItem label="Email" value={staff.email} />
                  <DetailItem label="Nomor Telepon" value={staff.phone} />
                </div>
              </section>

              {/* Akun Login */}
              <section className="rounded-xl border border-gray-100 p-5">
                <h3 className="mb-4 font-semibold text-[#35485E]">
                  Informasi Akun Login
                </h3>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#35485E]">
                      Status Akun
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Status akses login Staff.
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      staff.accountIsActive
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {staff.accountIsActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
              </section>

              {/* Penugasan Cabang */}
              <section className="rounded-xl border border-gray-100 p-5">
                <h3 className="mb-5 font-semibold text-[#35485E]">
                  Riwayat Penugasan Cabang
                </h3>

                {staff.branchAssignments?.length > 0 ? (
                  <div className="space-y-4">
                    {staff.branchAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="rounded-xl border border-gray-100 p-4"
                      >
                        <div className="flex flex-col justify-between gap-2 sm:flex-row">
                          <div>
                            <p className="font-semibold text-[#35485E]">
                              {assignment.branchName}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                              {assignment.branchCode || "-"}
                            </p>
                          </div>

                          <span
                            className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                              assignment.isActive
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {assignment.isActive
                              ? "Penugasan Berjalan"
                              : "Riwayat"}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <DetailItem
                            label="Mulai Penugasan"
                            value={formatDate(assignment.assignedFrom)}
                          />
                          <DetailItem
                            label="Akhir Penugasan"
                            value={formatDate(assignment.assignedUntil)}
                          />
                        </div>

                        {assignment.reason && (
                          <div className="mt-4">
                            <DetailItem
                              label="Alasan Perpindahan"
                              value={assignment.reason}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Belum ada riwayat penugasan cabang.
                  </p>
                )}
              </section>

              {/* Form Transfer */}
              {showTransferForm && (
                <form
                  onSubmit={handleTransfer}
                  className="space-y-4 rounded-xl border border-[#70B8AE]/40 bg-[#F7FBFA] p-5"
                >
                  <div>
                    <h3 className="font-semibold text-[#35485E]">
                      Transfer Staff Antar Cabang
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Cabang saat ini:{" "}
                      <strong>{currentAssignment?.branchName || "-"}</strong>
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="targetBranchId"
                      className="mb-2 block text-sm font-medium text-[#35485E]"
                    >
                      Cabang Tujuan
                    </label>

                    <select
                      id="targetBranchId"
                      value={targetBranchId}
                      onChange={(event) =>
                        setTargetBranchId(event.target.value)
                      }
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#70B8AE]"
                    >
                      <option value="">Pilih cabang tujuan</option>

                      {availableBranches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.branchName}
                        </option>
                      ))}
                    </select>

                    {availableBranches.length === 0 && (
                      <p className="mt-2 text-xs text-red-500">
                        Tidak ada cabang aktif lain yang tersedia.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#35485E]">
                      Tanggal Efektif
                    </label>

                    <input
                      type="date"
                      value={getTodayDate()}
                      readOnly
                      className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-600"
                    />

                    <p className="mt-1 text-xs text-gray-400">
                      Transfer berlaku mulai hari ini.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="transferReason"
                      className="mb-2 block text-sm font-medium text-[#35485E]"
                    >
                      Alasan Perpindahan
                    </label>

                    <textarea
                      id="transferReason"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      maxLength={1000}
                      rows={3}
                      placeholder="Tuliskan alasan perpindahan staff..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#70B8AE]"
                    />

                    <p className="mt-1 text-right text-xs text-gray-400">
                      {reason.length}/1000 karakter
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setShowTransferForm(false);
                        setError("");
                      }}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Batal
                    </button>

                    <button
                      type="submit"
                      disabled={
                        busy ||
                        !targetBranchId ||
                        availableBranches.length === 0
                      }
                      className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#438F83] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {transferring ? "Memproses..." : "Konfirmasi Transfer"}
                    </button>
                  </div>
                </form>
              )}

              {/* Dokumen HR - Komponen Reusable */}
              <HrDocumentsSection
                hrPersonProfileId={staff.hrPersonProfileId}
                personLabel="Staff"
              />

              {/* Catatan */}
              <section className="rounded-xl border border-gray-100 p-5">
                <h3 className="mb-3 font-semibold text-[#35485E]">Catatan</h3>

                <p className="whitespace-pre-wrap text-sm text-gray-600">
                  {staff.notes || "Tidak ada catatan."}
                </p>
              </section>

              {/* Tombol Aksi */}
              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:flex-wrap sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Tutup
                </button>

                {["active", "inactive"].includes(staff.employmentStatus) && (
                  <button
                    type="button"
                    onClick={handleStatusChange}
                    disabled={busy || showTransferForm}
                    className={`rounded-xl border px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                      staff.accountIsActive
                        ? "border-red-300 text-red-600 hover:bg-red-50"
                        : "border-green-300 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {updatingStatus
                      ? "Memproses..."
                      : staff.accountIsActive
                        ? "Nonaktifkan Staff"
                        : "Aktifkan Kembali"}
                  </button>
                )}

                {staff.employmentStatus === "active" && !showTransferForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setSuccess("");
                      setShowTransferForm(true);
                    }}
                    disabled={busy}
                    className="rounded-xl border border-[#529F93] px-5 py-2.5 text-sm font-semibold text-[#529F93] hover:bg-[#529F93]/10 disabled:opacity-50"
                  >
                    Transfer Cabang
                  </button>
                )}

                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(staff)}
                    disabled={busy}
                    className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#438F83] disabled:opacity-50"
                  >
                    Edit Staff
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
