import { useEffect, useMemo, useState } from "react";

import {
  getEnrollmentContracts,
  getEnrollmentContractById,
  createEnrollmentContract,
  updateEnrollmentContract,
  updateEnrollmentContractStatus,
  updateEnrollmentContractMember,
} from "../../../Services/EnrollmentContractService";

import { getEnrollments } from "../../../Services/EnrollmentService";
import { getBranches } from "../../../Services/BranchService";

// ==========================================
// INITIAL FORM
// ==========================================

const initialForm = {
  contractCode: "",
  startDate: "",
  endDate: "",
  totalPrice: "",
  status: "pending",
  notes: "",
  members: [
    {
      enrollmentId: "",
      contributionAmount: "",
      joinedAt: "",
      notes: "",
    },
  ],
};

// ==========================================
// STATUS OPTIONS
// ==========================================

const statusOptions = [
  { value: "pending", label: "Menunggu" },
  { value: "active", label: "Aktif" },
  { value: "paused", label: "Ditangguhkan" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

const memberStatusOptions = [
  { value: "active", label: "Aktif" },
  { value: "completed", label: "Selesai" },
  { value: "left", label: "Keluar" },
];

const statusStyle = {
  pending: "bg-yellow-50 text-yellow-700",
  active: "bg-green-50 text-green-700",
  paused: "bg-orange-50 text-orange-700",
  completed: "bg-blue-50 text-blue-700",
  cancelled: "bg-red-50 text-red-600",
};

const memberStatusStyle = {
  active: "bg-green-50 text-green-700",
  completed: "bg-blue-50 text-blue-700",
  left: "bg-gray-100 text-gray-600",
};

// ==========================================
// HELPER
// ==========================================

function formatStatus(status) {
  return statusOptions.find((item) => item.value === status)?.label || status;
}

function formatMemberStatus(status) {
  return (
    memberStatusOptions.find((item) => item.value === status)?.label || status
  );
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function unwrapData(result) {
  return result?.data ?? result;
}

function createEmptyMember() {
  return {
    enrollmentId: "",
    contributionAmount: "",
    joinedAt: "",
    notes: "",
  };
}

// ==========================================
// COMPONENT
// ==========================================

export default function EnrollmentContractPage() {
  // ----------------------------------------
  // CONTRACT LIST STATE
  // ----------------------------------------

  const [contracts, setContracts] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ----------------------------------------
  // ENROLLMENT OPTIONS
  // ----------------------------------------

  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentsError, setEnrollmentsError] = useState("");

  // ----------------------------------------
  // FORM STATE
  // ----------------------------------------

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");

  // ----------------------------------------
  // DETAIL STATE
  // ----------------------------------------

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [memberStatuses, setMemberStatuses] = useState({});
  const [memberSavingId, setMemberSavingId] = useState(null);

  // ==========================================
  // LOAD CONTRACTS
  // ==========================================

  async function loadContracts(page = 1) {
    try {
      setLoading(true);
      setError("");

      const result = await getEnrollmentContracts({
        search,
        status: statusFilter,
        branchId: branchFilter,
        page,
        limit: 10,
      });

      setContracts(result.data || []);

      setPagination(
        result.pagination || {
          page: 1,
          totalPages: 1,
          total: 0,
        },
      );
    } catch (err) {
      setError(err.message || "Gagal mengambil data kontrak.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContracts(1);
  }, [search, statusFilter, branchFilter]);

  // ==========================================
  // LOAD BRANCHES
  // ==========================================

  useEffect(() => {
    async function loadBranches() {
      try {
        const result = await getBranches({
          page: 1,
          limit: 100,
        });

        setBranches(result.data || []);
      } catch (err) {
        console.error("Gagal mengambil cabang:", err);
      }
    }

    loadBranches();
  }, []);

  // ==========================================
  // LOAD ENROLLMENT OPTIONS
  // ==========================================

  async function loadEnrollmentOptions() {
    try {
      setEnrollmentsLoading(true);
      setEnrollmentsError("");

      const result = await getEnrollments({
        page: 1,
        limit: 100,
      });

      setEnrollments(result.data || []);
    } catch (err) {
      setEnrollmentsError(err.message || "Gagal mengambil pilihan Enrollment.");
    } finally {
      setEnrollmentsLoading(false);
    }
  }

  useEffect(() => {
    loadEnrollmentOptions();
  }, []);

  // ==========================================
  // SELECTED ENROLLMENT DATA
  // ==========================================

  const selectedEnrollments = useMemo(() => {
    return form.members.map((member) =>
      enrollments.find((item) => item.id === member.enrollmentId),
    );
  }, [form.members, enrollments]);

  const firstSelectedEnrollment = selectedEnrollments.find(Boolean);

  const eligibleEnrollments = useMemo(() => {
    if (!firstSelectedEnrollment) {
      return enrollments;
    }

    return enrollments.filter(
      (item) =>
        item.branchId === firstSelectedEnrollment.branchId &&
        item.offeringId === firstSelectedEnrollment.offeringId,
    );
  }, [enrollments, firstSelectedEnrollment]);

  const selectedEnrollmentIds = form.members
    .map((member) => member.enrollmentId)
    .filter(Boolean);

  const contributionTotal = form.members.reduce(
    (total, member) => total + Number(member.contributionAmount || 0),
    0,
  );

  const totalPrice = Number(form.totalPrice || 0);

  // ==========================================
  // CREATE MODAL
  // ==========================================

  function openCreateModal() {
    setEditingId(null);
    setForm(initialForm);
    setFormError("");
    setError("");
    setEnrollmentsError("");
    setModalOpen(true);

    loadEnrollmentOptions();
  }

  // ==========================================
  // EDIT MODAL
  // ==========================================

  async function openEditModal(contract) {
    try {
      setSaving(true);
      setFormError("");
      setError("");

      const result = await getEnrollmentContractById(contract.id);
      const detail = unwrapData(result);

      if (!detail) {
        throw new Error("Detail kontrak tidak ditemukan.");
      }

      setEditingId(contract.id);

      setForm({
        contractCode: detail.contractCode || "",
        startDate: detail.startDate || "",
        endDate: detail.endDate || "",
        totalPrice: String(detail.totalPrice ?? ""),
        status: detail.status || "pending",
        notes: detail.notes || "",
        members: [],
      });

      setModalOpen(true);
    } catch (err) {
      setError(err.message || "Gagal mengambil detail kontrak.");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // FORM CHANGE
  // ==========================================

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormError("");
  }

  function handleMemberChange(index, event) {
    const { name, value } = event.target;

    setForm((previous) => {
      const members = [...previous.members];

      members[index] = {
        ...members[index],
        [name]: value,
      };

      return {
        ...previous,
        members,
      };
    });

    setFormError("");
  }

  function addMember() {
    setForm((previous) => ({
      ...previous,
      members: [...previous.members, createEmptyMember()],
    }));
  }

  function removeMember(index) {
    setForm((previous) => ({
      ...previous,
      members: previous.members.filter(
        (_, memberIndex) => memberIndex !== index,
      ),
    }));
  }

  // ==========================================
  // VALIDATE CREATE FORM
  // ==========================================

  function validateCreateForm() {
    if (!form.contractCode.trim()) {
      throw new Error("Kode kontrak wajib diisi.");
    }

    if (!form.startDate) {
      throw new Error("Tanggal mulai kontrak wajib diisi.");
    }

    if (form.endDate && form.endDate < form.startDate) {
      throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
    }

    if (
      !Number.isFinite(totalPrice) ||
      totalPrice < 0 ||
      form.totalPrice === ""
    ) {
      throw new Error("Total harga kontrak tidak valid.");
    }

    if (form.members.length === 0) {
      throw new Error("Kontrak minimal harus memiliki satu anggota.");
    }

    for (const [index, member] of form.members.entries()) {
      if (!member.enrollmentId) {
        throw new Error(`Pilih Enrollment untuk anggota ke-${index + 1}.`);
      }

      if (
        member.contributionAmount === "" ||
        !Number.isFinite(Number(member.contributionAmount)) ||
        Number(member.contributionAmount) < 0
      ) {
        throw new Error(
          `Nominal kontribusi anggota ke-${index + 1} tidak valid.`,
        );
      }
    }

    if (new Set(selectedEnrollmentIds).size !== selectedEnrollmentIds.length) {
      throw new Error("Enrollment yang sama tidak boleh dipilih dua kali.");
    }

    if (contributionTotal !== totalPrice) {
      throw new Error(
        `Total kontribusi (${formatCurrency(
          contributionTotal,
        )}) harus sama dengan total harga kontrak (${formatCurrency(
          totalPrice,
        )}).`,
      );
    }

    if (!firstSelectedEnrollment) {
      throw new Error("Pilih minimal satu Enrollment.");
    }

    const allSameOffering = selectedEnrollments.every(
      (item) =>
        item &&
        item.branchId === firstSelectedEnrollment.branchId &&
        item.offeringId === firstSelectedEnrollment.offeringId,
    );

    if (!allSameOffering) {
      throw new Error(
        "Semua anggota harus berasal dari cabang dan Offering yang sama.",
      );
    }
  }

  // ==========================================
  // SAVE CONTRACT
  // ==========================================

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError("");
      setError("");
      setSuccess("");

      if (editingId) {
        if (form.endDate && form.endDate < form.startDate) {
          throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
        }

        await updateEnrollmentContract(editingId, {
          endDate: form.endDate || null,
          notes: form.notes.trim() || null,
        });

        setSuccess("Kontrak berhasil diperbarui.");
      } else {
        validateCreateForm();

        const payload = {
          contractCode: form.contractCode.trim(),
          startDate: form.startDate,
          endDate: form.endDate || null,
          totalPrice,
          status: form.status,
          notes: form.notes.trim() || null,
          members: form.members.map((member) => ({
            enrollmentId: member.enrollmentId,
            contributionAmount: Number(member.contributionAmount),
            joinedAt: member.joinedAt || null,
            notes: member.notes.trim() || null,
          })),
        };

        await createEnrollmentContract(payload);

        setSuccess("Kontrak berhasil dibuat.");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(initialForm);

      await loadContracts(editingId ? pagination.page : 1);
    } catch (err) {
      setFormError(err.message || "Gagal menyimpan kontrak.");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // UPDATE CONTRACT STATUS
  // ==========================================

  async function handleStatusChange(contract, newStatus) {
    if (newStatus === contract.status) return;

    const confirmed = window.confirm(
      `Yakin ingin mengubah status kontrak ${contract.contractCode} menjadi ${formatStatus(
        newStatus,
      )}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await updateEnrollmentContractStatus(contract.id, newStatus);

      setSuccess("Status kontrak berhasil diperbarui.");

      await loadContracts(pagination.page);

      if (selectedContract && selectedContract.id === contract.id) {
        await openDetail(contract.id);
      }
    } catch (err) {
      setError(err.message || "Gagal mengubah status kontrak.");
      await loadContracts(pagination.page);
    }
  }

  // ==========================================
  // CONTRACT DETAIL
  // ==========================================

  async function openDetail(contractId) {
    try {
      setDetailLoading(true);
      setDetailOpen(true);
      setSelectedContract(null);

      const result = await getEnrollmentContractById(contractId);
      const detail = unwrapData(result);

      if (!detail) {
        throw new Error("Detail kontrak tidak ditemukan.");
      }

      setSelectedContract(detail);

      const statusMap = {};

      (detail.members || []).forEach((member) => {
        statusMap[member.enrollmentId] = member.status;
      });

      setMemberStatuses(statusMap);
    } catch (err) {
      setError(err.message || "Gagal mengambil detail kontrak.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  // ==========================================
  // UPDATE MEMBER STATUS
  // ==========================================

  async function handleMemberStatusSave(member) {
    const nextStatus = memberStatuses[member.enrollmentId];

    if (!nextStatus || nextStatus === member.status) {
      return;
    }

    const confirmed = window.confirm(
      `Yakin ingin mengubah status anggota ${member.studentName} menjadi ${formatMemberStatus(
        nextStatus,
      )}?`,
    );

    if (!confirmed) {
      setMemberStatuses((previous) => ({
        ...previous,
        [member.enrollmentId]: member.status,
      }));

      return;
    }

    try {
      setMemberSavingId(member.enrollmentId);
      setError("");
      setSuccess("");

      const result = await updateEnrollmentContractMember(
        selectedContract.id,
        member.enrollmentId,
        {
          status: nextStatus,
        },
      );

      const updatedContract = unwrapData(result);

      if (updatedContract?.members) {
        setSelectedContract(updatedContract);

        const statusMap = {};

        updatedContract.members.forEach((item) => {
          statusMap[item.enrollmentId] = item.status;
        });

        setMemberStatuses(statusMap);
      } else {
        await openDetail(selectedContract.id);
      }

      setSuccess("Status anggota kontrak berhasil diperbarui.");
    } catch (err) {
      setError(err.message || "Gagal mengubah status anggota.");
      setMemberStatuses((previous) => ({
        ...previous,
        [member.enrollmentId]: member.status,
      }));
    } finally {
      setMemberSavingId(null);
    }
  }

  // ==========================================
  // CLOSE MODALS
  // ==========================================

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setFormError("");
  }

  function closeDetail() {
    setDetailOpen(false);
    setSelectedContract(null);
    setMemberStatuses({});
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  const activeCount = contracts.filter(
    (item) => item.status === "active",
  ).length;

  const pendingCount = contracts.filter(
    (item) => item.status === "pending",
  ).length;

  const otherCount = contracts.filter(
    (item) => !["active", "pending"].includes(item.status),
  ).length;

  // ==========================================
  // STYLE
  // ==========================================

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#70B8AE] focus:ring-2 focus:ring-[#70B8AE]/20";

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-[#70B8AE]">Ilyon Academy</p>

          <h1 className="mt-1 text-2xl font-bold text-[#35485E]">
            Manajemen Kontrak Enrollment
          </h1>

          <p className="mt-1 text-sm text-[#87919D]">
            Kelola kontrak pembelajaran dan anggota Enrollment.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-xl bg-[#529F93] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#438C81]"
        >
          + Tambah Kontrak
        </button>
      </div>

      {/* NOTIFICATION */}

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

      {/* STATISTICS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Total Kontrak</p>

          <p className="mt-3 text-2xl font-bold text-[#35485E]">
            {pagination.total}
          </p>

          <p className="mt-3 text-xs text-[#87919D]">Seluruh data kontrak</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Kontrak Aktif</p>

          <p className="mt-3 text-2xl font-bold text-green-600">
            {activeCount}
          </p>

          <p className="mt-3 text-xs text-[#87919D]">Pada halaman ini</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Menunggu</p>

          <p className="mt-3 text-2xl font-bold text-yellow-600">
            {pendingCount}
          </p>

          <p className="mt-3 text-xs text-[#87919D]">Pada halaman ini</p>
        </div>

        <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#87919D]">Status Lainnya</p>

          <p className="mt-3 text-2xl font-bold text-blue-600">{otherCount}</p>

          <p className="mt-3 text-xs text-[#87919D]">Pada halaman ini</p>
        </div>
      </div>

      {/* CONTRACT LIST */}

      <section className="overflow-hidden rounded-2xl border border-[#E9ECEF] bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <div>
            <h2 className="font-bold text-[#35485E]">Daftar Kontrak</h2>

            <p className="mt-1 text-sm text-[#87919D]">
              Semua kontrak berdasarkan cabang dan Offering.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari kode kontrak, siswa, Offering..."
              className={inputClass}
            />

            <select
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
              className={inputClass}
            >
              <option value="">Semua Cabang</option>

              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branchName}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
            >
              <option value="">Semua Status</option>

              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-4">Kode Kontrak</th>
                <th className="px-5 py-4">Cabang</th>
                <th className="px-5 py-4">Offering</th>
                <th className="px-5 py-4">Anggota</th>
                <th className="px-5 py-4">Total Harga</th>
                <th className="px-5 py-4">Mulai</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Memuat data kontrak...
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Belum ada data kontrak.
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => (
                  <tr key={contract.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {contract.contractCode}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {contract.programName}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {contract.branchName || "-"}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {contract.offeringName}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {contract.offeringCode}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {contract.memberCount || 0} anggota
                    </td>

                    <td className="px-5 py-4 font-semibold text-[#35485E]">
                      {formatCurrency(contract.totalPrice)}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatDate(contract.startDate)}
                    </td>

                    <td className="px-5 py-4">
                      <select
                        value={contract.status}
                        onChange={(event) =>
                          handleStatusChange(contract, event.target.value)
                        }
                        className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ${
                          statusStyle[contract.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {statusOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openDetail(contract.id)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#529F93] transition hover:bg-gray-50"
                        >
                          Detail
                        </button>

                        <button
                          disabled={["completed", "cancelled"].includes(
                            contract.status,
                          )}
                          onClick={() => openEditModal(contract)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#35485E] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Total {pagination.total} kontrak
          </p>

          <div className="flex items-center gap-3">
            <button
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadContracts(pagination.page - 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:opacity-40"
            >
              Sebelumnya
            </button>

            <span className="text-xs text-gray-500">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadContracts(pagination.page + 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      {/* ==========================================
          CREATE / EDIT MODAL
      ========================================== */}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  {editingId ? "Edit Kontrak" : "Tambah Kontrak"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editingId
                    ? "Perbarui tanggal selesai dan catatan kontrak."
                    : "Buat kontrak dari satu atau beberapa Enrollment."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {formError}
              </div>
            )}

            {editingId ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Kode Kontrak</p>

                  <p className="mt-1 font-semibold text-[#35485E]">
                    {form.contractCode}
                  </p>

                  <p className="mt-3 text-xs text-gray-500">Total Harga</p>

                  <p className="mt-1 font-semibold text-[#35485E]">
                    {formatCurrency(form.totalPrice)}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Tanggal Mulai</span>

                    <input
                      type="date"
                      value={form.startDate}
                      disabled
                      className={`${inputClass} bg-gray-50`}
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">Tanggal Selesai</span>

                    <input
                      type="date"
                      name="endDate"
                      value={form.endDate}
                      min={form.startDate || undefined}
                      onChange={handleFormChange}
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="font-semibold">Catatan</span>

                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleFormChange}
                      rows="3"
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#438C81] disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {enrollmentsError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {enrollmentsError}
                  </div>
                )}

                {enrollmentsLoading ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    Memuat pilihan Enrollment...
                  </div>
                ) : (
                  <>
                    {/* CONTRACT INFORMATION */}

                    <div>
                      <h3 className="mb-3 text-sm font-bold text-[#529F93]">
                        Informasi Kontrak
                      </h3>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1 text-sm">
                          <span className="font-semibold">Kode Kontrak *</span>

                          <input
                            name="contractCode"
                            value={form.contractCode}
                            onChange={handleFormChange}
                            required
                            maxLength={50}
                            placeholder="Contoh: CTR-2026-001"
                            className={inputClass}
                          />
                        </label>

                        <label className="space-y-1 text-sm">
                          <span className="font-semibold">Status Awal</span>

                          <select
                            name="status"
                            value={form.status}
                            onChange={handleFormChange}
                            className={inputClass}
                          >
                            {statusOptions.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1 text-sm">
                          <span className="font-semibold">Tanggal Mulai *</span>

                          <input
                            type="date"
                            name="startDate"
                            value={form.startDate}
                            onChange={handleFormChange}
                            required
                            className={inputClass}
                          />
                        </label>

                        <label className="space-y-1 text-sm">
                          <span className="font-semibold">Tanggal Selesai</span>

                          <input
                            type="date"
                            name="endDate"
                            value={form.endDate}
                            min={form.startDate || undefined}
                            onChange={handleFormChange}
                            className={inputClass}
                          />
                        </label>
                      </div>
                    </div>

                    {/* MEMBERS */}

                    <div className="border-t border-gray-100 pt-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-[#529F93]">
                            Anggota Kontrak
                          </h3>

                          <p className="mt-1 text-xs text-gray-500">
                            Semua anggota harus menggunakan cabang dan Offering
                            yang sama.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={addMember}
                          className="rounded-lg border border-[#529F93] px-3 py-2 text-xs font-semibold text-[#529F93] hover:bg-[#F3FAF8]"
                        >
                          + Tambah Anggota
                        </button>
                      </div>

                      {form.members.map((member, index) => {
                        const selected = enrollments.find(
                          (item) => item.id === member.enrollmentId,
                        );

                        const availableOptions = eligibleEnrollments.filter(
                          (item) =>
                            !selectedEnrollmentIds.includes(item.id) ||
                            item.id === member.enrollmentId,
                        );

                        return (
                          <div
                            key={index}
                            className="mb-4 rounded-xl border border-gray-200 p-4"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-sm font-semibold text-[#35485E]">
                                Anggota {index + 1}
                              </p>

                              {form.members.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeMember(index)}
                                  className="text-xs font-semibold text-red-500 hover:text-red-700"
                                >
                                  Hapus
                                </button>
                              )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                              <label className="space-y-1 text-sm sm:col-span-2">
                                <span className="font-semibold">
                                  Enrollment *
                                </span>

                                <select
                                  name="enrollmentId"
                                  value={member.enrollmentId}
                                  onChange={(event) =>
                                    handleMemberChange(index, event)
                                  }
                                  required
                                  className={inputClass}
                                >
                                  <option value="">Pilih Enrollment</option>

                                  {availableOptions.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.studentCode} - {item.studentName}
                                      {" | "}
                                      {item.offeringName}
                                      {" | "}
                                      {item.branchName}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              {selected && (
                                <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 sm:col-span-2">
                                  <p>
                                    Siswa:{" "}
                                    <strong>{selected.studentName}</strong>
                                  </p>

                                  <p className="mt-1">
                                    Cabang:{" "}
                                    <strong>{selected.branchName}</strong>
                                  </p>

                                  <p className="mt-1">
                                    Offering:{" "}
                                    <strong>{selected.offeringName}</strong>
                                  </p>
                                </div>
                              )}

                              <label className="space-y-1 text-sm">
                                <span className="font-semibold">
                                  Kontribusi (Rp) *
                                </span>

                                <input
                                  type="number"
                                  name="contributionAmount"
                                  value={member.contributionAmount}
                                  onChange={(event) =>
                                    handleMemberChange(index, event)
                                  }
                                  min="0"
                                  step="1"
                                  required
                                  placeholder="Nominal kontribusi"
                                  className={inputClass}
                                />
                              </label>

                              <label className="space-y-1 text-sm">
                                <span className="font-semibold">
                                  Tanggal Bergabung
                                </span>

                                <input
                                  type="date"
                                  name="joinedAt"
                                  value={member.joinedAt}
                                  onChange={(event) =>
                                    handleMemberChange(index, event)
                                  }
                                  className={inputClass}
                                />
                              </label>

                              <label className="space-y-1 text-sm sm:col-span-2">
                                <span className="font-semibold">
                                  Catatan Anggota
                                </span>

                                <input
                                  name="notes"
                                  value={member.notes}
                                  onChange={(event) =>
                                    handleMemberChange(index, event)
                                  }
                                  className={inputClass}
                                  placeholder="Catatan opsional"
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* PRICE SUMMARY */}

                    <div className="rounded-xl border border-[#D9ECE8] bg-[#F3FAF8] p-4">
                      <h3 className="text-sm font-bold text-[#35485E]">
                        Ringkasan Harga Kontrak
                      </h3>

                      <label className="mt-3 block space-y-1 text-sm">
                        <span className="font-semibold">
                          Total Harga Kontrak (Rp) *
                        </span>

                        <input
                          type="number"
                          name="totalPrice"
                          value={form.totalPrice}
                          onChange={handleFormChange}
                          min="0"
                          step="1"
                          required
                          placeholder="Masukkan total harga kontrak"
                          className={inputClass}
                        />
                      </label>

                      <div className="mt-4 space-y-2 border-t border-[#D9ECE8] pt-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-gray-600">
                            Total kontribusi anggota
                          </span>

                          <strong className="text-[#35485E]">
                            {formatCurrency(contributionTotal)}
                          </strong>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-gray-600">
                            Total harga kontrak
                          </span>

                          <strong className="text-[#35485E]">
                            {formatCurrency(totalPrice)}
                          </strong>
                        </div>

                        <div className="flex justify-between gap-3 border-t border-[#D9ECE8] pt-2">
                          <span className="font-semibold text-gray-700">
                            Selisih
                          </span>

                          <strong
                            className={
                              contributionTotal === totalPrice
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {formatCurrency(contributionTotal - totalPrice)}
                          </strong>
                        </div>

                        <p
                          className={`pt-1 text-xs font-semibold ${
                            contributionTotal === totalPrice
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {contributionTotal === totalPrice
                            ? "Total kontribusi sudah sesuai."
                            : "Total kontribusi harus sama persis dengan total harga kontrak."}
                        </p>
                      </div>
                    </div>

                    {/* NOTES */}

                    <label className="block space-y-1 text-sm">
                      <span className="font-semibold">Catatan Kontrak</span>

                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleFormChange}
                        rows="3"
                        className={inputClass}
                        placeholder="Catatan tambahan kontrak..."
                      />
                    </label>
                  </>
                )}

                {/* BUTTONS */}

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving || enrollmentsLoading || enrollments.length === 0
                    }
                    className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#438C81] disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan Kontrak"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          DETAIL CONTRACT MODAL
      ========================================== */}

      {detailOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  Detail Kontrak
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Informasi kontrak dan keanggotaan Enrollment.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetail}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {detailLoading || !selectedContract ? (
              <div className="py-12 text-center text-sm text-gray-400">
                Memuat detail kontrak...
              </div>
            ) : (
              <div className="space-y-6">
                {/* CONTRACT INFORMATION */}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500">Kode Kontrak</p>

                    <p className="mt-1 font-bold text-[#35485E]">
                      {selectedContract.contractCode}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500">Cabang</p>

                    <p className="mt-1 font-semibold text-[#35485E]">
                      {selectedContract.branchName}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500">Program</p>

                    <p className="mt-1 font-semibold text-[#35485E]">
                      {selectedContract.programName}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500">Offering</p>

                    <p className="mt-1 font-semibold text-[#35485E]">
                      {selectedContract.offeringName}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {selectedContract.offeringCode}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500">Jenis Layanan</p>

                    <p className="mt-1 font-semibold text-[#35485E]">
                      {selectedContract.deliveryType}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500">Metode Belajar</p>

                    <p className="mt-1 font-semibold text-[#35485E]">
                      {selectedContract.learningMethod}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500">Satuan Harga</p>

                    <p className="mt-1 font-semibold text-[#35485E]">
                      {selectedContract.pricingUnit === "per_student"
                        ? "Per Siswa"
                        : "Per Grup"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500">
                      Harga Dasar Offering
                    </p>

                    <p className="mt-1 font-semibold text-[#35485E]">
                      {formatCurrency(selectedContract.unitPrice)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500">Total Harga Kontrak</p>

                    <p className="mt-1 font-bold text-[#529F93]">
                      {formatCurrency(selectedContract.totalPrice)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500">Tanggal Mulai</p>

                    <p className="mt-1 font-semibold text-[#35485E]">
                      {formatDate(selectedContract.startDate)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500">Tanggal Selesai</p>

                    <p className="mt-1 font-semibold text-[#35485E]">
                      {formatDate(selectedContract.endDate)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500">Status Kontrak</p>

                    <span
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        statusStyle[selectedContract.status] ||
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {formatStatus(selectedContract.status)}
                    </span>
                  </div>
                </div>

                {selectedContract.notes && (
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold text-gray-500">
                      Catatan Kontrak
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                      {selectedContract.notes}
                    </p>
                  </div>
                )}

                {/* MEMBERS TABLE */}

                <div>
                  <div className="mb-3">
                    <h3 className="font-bold text-[#35485E]">
                      Anggota Kontrak
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Status anggota dapat diperbarui selama kontrak belum
                      selesai atau dibatalkan.
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full min-w-[850px] text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Siswa</th>
                          <th className="px-4 py-3">Enrollment</th>
                          <th className="px-4 py-3">Kontribusi</th>
                          <th className="px-4 py-3">Bergabung</th>
                          <th className="px-4 py-3">Keluar</th>
                          <th className="px-4 py-3">Status Anggota</th>
                          <th className="px-4 py-3">Aksi</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {(selectedContract.members || []).map((member) => {
                          const canUpdateMember = ![
                            "completed",
                            "cancelled",
                          ].includes(selectedContract.status);

                          return (
                            <tr key={member.id}>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-[#35485E]">
                                  {member.studentName}
                                </p>

                                <p className="mt-1 text-xs text-gray-400">
                                  {member.studentCode}
                                </p>
                              </td>

                              <td className="px-4 py-3 text-xs text-gray-500">
                                {member.enrollmentId}
                              </td>

                              <td className="px-4 py-3 font-semibold text-[#35485E]">
                                {formatCurrency(member.contributionAmount)}
                              </td>

                              <td className="px-4 py-3 text-gray-600">
                                {formatDate(member.joinedAt)}
                              </td>

                              <td className="px-4 py-3 text-gray-600">
                                {formatDate(member.leftAt)}
                              </td>

                              <td className="px-4 py-3">
                                <select
                                  value={
                                    memberStatuses[member.enrollmentId] ||
                                    member.status
                                  }
                                  disabled={!canUpdateMember}
                                  onChange={(event) =>
                                    setMemberStatuses((previous) => ({
                                      ...previous,
                                      [member.enrollmentId]: event.target.value,
                                    }))
                                  }
                                  className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ${
                                    memberStatusStyle[member.status] ||
                                    "bg-gray-100 text-gray-600"
                                  } disabled:opacity-60`}
                                >
                                  {memberStatusOptions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                      {item.label}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td className="px-4 py-3">
                                <button
                                  disabled={
                                    !canUpdateMember ||
                                    memberSavingId === member.enrollmentId ||
                                    (memberStatuses[member.enrollmentId] ||
                                      member.status) === member.status
                                  }
                                  onClick={() => handleMemberStatusSave(member)}
                                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#529F93] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {memberSavingId === member.enrollmentId
                                    ? "Menyimpan..."
                                    : "Simpan"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {(!selectedContract.members ||
                          selectedContract.members.length === 0) && (
                          <tr>
                            <td
                              colSpan="7"
                              className="px-4 py-8 text-center text-gray-400"
                            >
                              Belum ada anggota kontrak.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
