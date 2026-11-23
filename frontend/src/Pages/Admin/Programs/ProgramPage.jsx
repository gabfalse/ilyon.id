import { useEffect, useState } from "react";

import {
  getPrograms,
  createProgram,
  updateProgram,
  updateProgramStatus,
  getProgramOfferings,
  createProgramOffering,
  updateProgramOffering,
  updateProgramOfferingStatus,
  getProgramSubjects,
  getAvailableProgramSubjects,
  addProgramSubject,
  updateProgramSubject,
  deleteProgramSubject,
} from "../../../Services/ProgramService";

// ==========================================
// FORM AWAL PROGRAM
// ==========================================

const initialForm = {
  programCode: "",
  programName: "",
  description: "",
  defaultDurationMinutes: "",
  defaultPrice: "0",
  minStudents: "",
  maxStudents: "",
  isActive: true,
};

// ==========================================
// FORM AWAL OFFERING
// ==========================================

const initialOfferingForm = {
  offeringCode: "",
  offeringName: "",
  deliveryType: "onsite",
  learningMethod: "private",
  billingPeriod: "per_session",
  price: "0",
  pricingUnit: "per_student",
  meetingQuota: "",
  isUnlimited: false,
  minStudents: "",
  maxStudents: "",
  sessionDurationMinutes: "",
  isFlexibleDuration: false,
  description: "",
  isActive: true,
};

// ==========================================
// FORM AWAL PROGRAM SUBJECT
// ==========================================

const initialSubjectForm = {
  subjectId: "",
  isRequired: false,
};

// ==========================================
// LABEL
// ==========================================

const deliveryLabels = {
  online: "Online",
  onsite: "Onsite",
  visit: "Home Visit",
};

const methodLabels = {
  regular: "Regular",
  private: "Private",
  small_group: "Small Group",
  clinic: "Clinic",
};

const billingLabels = {
  per_session: "Per Sesi",
  weekly: "Mingguan",
  monthly: "Bulanan",
  package: "Paket",
  custom: "Kustom",
};

const pricingLabels = {
  per_student: "Per Siswa",
  per_group: "Per Grup",
};

// ==========================================
// COMPONENT
// ==========================================

export default function ProgramPage() {
  // ----------------------------------------
  // PROGRAM STATE
  // ----------------------------------------

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

  // ----------------------------------------
  // OFFERING STATE
  // ----------------------------------------

  const [selectedProgram, setSelectedProgram] = useState(null);

  const [offerings, setOfferings] = useState([]);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [offeringsError, setOfferingsError] = useState("");

  const [offeringModalOpen, setOfferingModalOpen] = useState(false);
  const [offeringFormModalOpen, setOfferingFormModalOpen] = useState(false);

  const [offeringEditingId, setOfferingEditingId] = useState(null);
  const [offeringForm, setOfferingForm] = useState(initialOfferingForm);

  const [offeringSaving, setOfferingSaving] = useState(false);
  const [offeringFormError, setOfferingFormError] = useState("");

  // ----------------------------------------
  // PROGRAM SUBJECT STATE
  // ----------------------------------------

  const [subjectProgram, setSubjectProgram] = useState(null);

  const [programSubjects, setProgramSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);

  const [subjectLoading, setSubjectLoading] = useState(false);
  const [availableSubjectsLoading, setAvailableSubjectsLoading] =
    useState(false);

  const [subjectSaving, setSubjectSaving] = useState(false);
  const [subjectActionId, setSubjectActionId] = useState(null);

  const [subjectError, setSubjectError] = useState("");
  const [subjectSuccess, setSubjectSuccess] = useState("");

  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectForm, setSubjectForm] = useState(initialSubjectForm);

  // ==========================================
  // LOAD PROGRAMS
  // ==========================================

  async function loadPrograms(page = 1) {
    try {
      setLoading(true);
      setError("");

      const result = await getPrograms({
        search,
        page,
        limit: 10,
      });

      setPrograms(result.data || []);

      setPagination(
        result.pagination || {
          page: 1,
          totalPages: 1,
          total: 0,
        },
      );
    } catch (err) {
      setError(err.message || "Gagal mengambil data program.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrograms(1);
  }, [search]);

  // ==========================================
  // PROGRAM FORM
  // ==========================================

  function openCreateModal() {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(program) {
    setEditingId(program.id);

    setForm({
      programCode: program.programCode || "",
      programName: program.programName || "",
      description: program.description || "",
      defaultDurationMinutes: program.defaultDurationMinutes ?? "",
      defaultPrice: String(program.defaultPrice ?? 0),
      minStudents: program.minStudents ?? "",
      maxStudents: program.maxStudents ?? "",
      isActive: program.isActive ?? true,
    });

    setError("");
    setModalOpen(true);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        programCode: form.programCode.trim().toUpperCase(),
        programName: form.programName.trim(),
        description: form.description.trim() || null,

        defaultDurationMinutes:
          form.defaultDurationMinutes === ""
            ? null
            : Number(form.defaultDurationMinutes),

        defaultPrice: Number(form.defaultPrice || 0),

        minStudents: form.minStudents === "" ? null : Number(form.minStudents),

        maxStudents: form.maxStudents === "" ? null : Number(form.maxStudents),

        isActive: form.isActive,
      };

      if (
        payload.minStudents !== null &&
        payload.maxStudents !== null &&
        payload.minStudents > payload.maxStudents
      ) {
        throw new Error("Minimal siswa tidak boleh melebihi maksimal siswa.");
      }

      if (editingId) {
        await updateProgram(editingId, payload);
        setSuccess("Data program berhasil diperbarui.");
      } else {
        await createProgram(payload);
        setSuccess("Program berhasil ditambahkan.");
      }

      setModalOpen(false);
      setForm(initialForm);
      setEditingId(null);

      await loadPrograms(editingId ? pagination.page : 1);
    } catch (err) {
      setError(err.message || "Gagal menyimpan data program.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(program) {
    const action = program.isActive ? "menonaktifkan" : "mengaktifkan";

    if (!window.confirm(`Yakin ingin ${action} program ini?`)) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await updateProgramStatus(program.id, !program.isActive);

      setSuccess("Status program berhasil diperbarui.");

      await loadPrograms(pagination.page);
    } catch (err) {
      setError(err.message || "Gagal mengubah status program.");
    }
  }

  // ==========================================
  // OFFERING: LOAD DATA
  // ==========================================

  async function openOfferings(program) {
    setSelectedProgram(program);
    setOfferings([]);
    setOfferingsError("");
    setOfferingModalOpen(true);
    setOfferingFormModalOpen(false);

    try {
      setOfferingsLoading(true);

      const result = await getProgramOfferings(program.id, {
        page: 1,
        limit: 100,
      });

      setOfferings(result.data || []);
    } catch (err) {
      setOfferingsError(
        err.message || "Gagal mengambil data offering program.",
      );
    } finally {
      setOfferingsLoading(false);
    }
  }

  async function refreshOfferings() {
    if (!selectedProgram) return;

    const result = await getProgramOfferings(selectedProgram.id, {
      page: 1,
      limit: 100,
    });

    setOfferings(result.data || []);
  }

  // ==========================================
  // OFFERING: FORM
  // ==========================================

  function getOfferingDefaults(program) {
    return {
      ...initialOfferingForm,
      deliveryType: "onsite",
      sessionDurationMinutes: String(program?.defaultDurationMinutes ?? ""),
    };
  }

  function openCreateOffering() {
    setOfferingEditingId(null);

    setOfferingForm(getOfferingDefaults(selectedProgram));
    setOfferingFormError("");

    setOfferingFormModalOpen(true);
  }

  function openEditOffering(offering) {
    setOfferingEditingId(offering.id);

    setOfferingForm({
      offeringCode: offering.offeringCode || "",
      offeringName: offering.offeringName || "",

      deliveryType: offering.deliveryType || "onsite",
      learningMethod: offering.learningMethod || "private",

      billingPeriod: offering.billingPeriod || "per_session",

      price: String(offering.price ?? 0),

      pricingUnit: offering.pricingUnit || "per_student",

      meetingQuota: offering.meetingQuota ?? "",
      isUnlimited: offering.isUnlimited ?? false,

      minStudents: offering.minStudents ?? "",
      maxStudents: offering.maxStudents ?? "",

      sessionDurationMinutes: offering.sessionDurationMinutes ?? "",
      isFlexibleDuration: offering.isFlexibleDuration ?? false,

      description: offering.description || "",
      isActive: offering.isActive ?? true,
    });

    setOfferingFormError("");
    setOfferingFormModalOpen(true);
  }

  // ==========================================
  // OFFERING: HANDLE CHANGE
  // ==========================================

  function handleOfferingChange(event) {
    const { name, value, type, checked } = event.target;

    setOfferingForm((previous) => {
      const next = {
        ...previous,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "isUnlimited" && checked) {
        next.meetingQuota = "";
      }

      if (name === "isFlexibleDuration" && checked) {
        next.sessionDurationMinutes = "";
      }

      // Tidak ada perubahan otomatis pada kombinasi:
      // deliveryType, learningMethod, pricingUnit,
      // billingPeriod, minStudents, dan maxStudents.

      return next;
    });
  }

  // ==========================================
  // OFFERING: VALIDATION
  // ==========================================

  function validateOffering(payload) {
    const validDeliveryTypes = ["online", "onsite", "visit"];

    const validLearningMethods = [
      "regular",
      "private",
      "small_group",
      "clinic",
    ];

    const validPricingUnits = ["per_student", "per_group"];

    const validBillingPeriods = [
      "per_session",
      "weekly",
      "monthly",
      "package",
      "custom",
    ];

    if (!validDeliveryTypes.includes(payload.deliveryType)) {
      throw new Error("Jenis layanan tidak valid.");
    }

    if (!validLearningMethods.includes(payload.learningMethod)) {
      throw new Error("Metode belajar tidak valid.");
    }

    if (!validPricingUnits.includes(payload.pricingUnit)) {
      throw new Error("Satuan harga tidak valid.");
    }

    if (!validBillingPeriods.includes(payload.billingPeriod)) {
      throw new Error("Periode tagihan tidak valid.");
    }

    if (
      payload.minStudents !== null &&
      (!Number.isInteger(payload.minStudents) || payload.minStudents < 1)
    ) {
      throw new Error("Minimal siswa harus berupa bilangan bulat minimal 1.");
    }

    if (
      payload.maxStudents !== null &&
      (!Number.isInteger(payload.maxStudents) || payload.maxStudents < 1)
    ) {
      throw new Error("Maksimal siswa harus berupa bilangan bulat minimal 1.");
    }

    if (
      payload.minStudents !== null &&
      payload.maxStudents !== null &&
      payload.minStudents > payload.maxStudents
    ) {
      throw new Error("Minimal siswa tidak boleh melebihi maksimal siswa.");
    }
  }

  // ==========================================
  // OFFERING: SAVE
  // ==========================================

  async function handleOfferingSubmit(event) {
    event.preventDefault();

    if (!selectedProgram) return;

    try {
      setOfferingSaving(true);
      setOfferingFormError("");

      const payload = {
        offeringCode: offeringForm.offeringCode.trim().toUpperCase(),

        offeringName: offeringForm.offeringName.trim(),

        deliveryType: offeringForm.deliveryType,

        learningMethod: offeringForm.learningMethod,

        billingPeriod: offeringForm.billingPeriod,

        price: Number(offeringForm.price || 0),

        pricingUnit: offeringForm.pricingUnit,

        meetingQuota: offeringForm.isUnlimited
          ? null
          : offeringForm.meetingQuota === ""
            ? null
            : Number(offeringForm.meetingQuota),

        isUnlimited: offeringForm.isUnlimited,

        minStudents:
          offeringForm.minStudents === ""
            ? null
            : Number(offeringForm.minStudents),

        maxStudents:
          offeringForm.maxStudents === ""
            ? null
            : Number(offeringForm.maxStudents),

        sessionDurationMinutes: offeringForm.isFlexibleDuration
          ? null
          : offeringForm.sessionDurationMinutes === ""
            ? null
            : Number(offeringForm.sessionDurationMinutes),

        isFlexibleDuration: offeringForm.isFlexibleDuration,

        description: offeringForm.description.trim() || null,

        isActive: offeringForm.isActive,
      };

      validateOffering(payload);

      if (offeringEditingId) {
        await updateProgramOffering(offeringEditingId, payload);
      } else {
        await createProgramOffering(selectedProgram.id, payload);
      }

      await refreshOfferings();

      setOfferingForm(initialOfferingForm);
      setOfferingEditingId(null);
      setOfferingFormModalOpen(false);
      setOfferingFormError("");
    } catch (err) {
      setOfferingFormError(err.message || "Gagal menyimpan offering.");
    } finally {
      setOfferingSaving(false);
    }
  }

  // ==========================================
  // OFFERING: STATUS
  // ==========================================

  async function handleOfferingStatusChange(offering) {
    const action = offering.isActive ? "menonaktifkan" : "mengaktifkan";

    if (!window.confirm(`Yakin ingin ${action} offering ini?`)) {
      return;
    }

    try {
      setOfferingsError("");

      await updateProgramOfferingStatus(offering.id, !offering.isActive);

      await refreshOfferings();
    } catch (err) {
      setOfferingsError(err.message || "Gagal mengubah status offering.");
    }
  }

  // ==========================================
  // PROGRAM SUBJECT: LOAD DATA
  // ==========================================

  async function loadProgramSubjects(programId) {
    const result = await getProgramSubjects(programId);

    setProgramSubjects(result.data || []);
  }

  async function loadAvailableSubjects(programId, searchValue = "") {
    try {
      setAvailableSubjectsLoading(true);
      setSubjectError("");

      const result = await getAvailableProgramSubjects(programId, {
        search: searchValue,
      });

      setAvailableSubjects(result.data || []);
    } catch (err) {
      setSubjectError(err.message || "Gagal mengambil Subject yang tersedia.");
    } finally {
      setAvailableSubjectsLoading(false);
    }
  }

  // ==========================================
  // PROGRAM SUBJECT: OPEN MODAL
  // ==========================================

  async function openProgramSubjects(program) {
    setSubjectProgram(program);

    setProgramSubjects([]);
    setAvailableSubjects([]);

    setSubjectSearch("");
    setSubjectForm(initialSubjectForm);

    setSubjectError("");
    setSubjectSuccess("");

    setSubjectModalOpen(true);

    try {
      setSubjectLoading(true);

      const result = await getProgramSubjects(program.id);

      setProgramSubjects(result.data || []);
    } catch (err) {
      setSubjectError(err.message || "Gagal mengambil Subject Program.");
    } finally {
      setSubjectLoading(false);
    }
  }

  function closeProgramSubjects() {
    setSubjectModalOpen(false);
    setSubjectProgram(null);

    setProgramSubjects([]);
    setAvailableSubjects([]);

    setSubjectSearch("");
    setSubjectForm(initialSubjectForm);

    setSubjectError("");
    setSubjectSuccess("");
  }

  // ==========================================
  // PROGRAM SUBJECT: LOAD AVAILABLE SUBJECTS
  // ==========================================

  useEffect(() => {
    if (!subjectModalOpen || !subjectProgram?.id) {
      return;
    }

    let cancelled = false;

    async function loadAvailable() {
      try {
        setAvailableSubjectsLoading(true);
        setSubjectError("");

        const result = await getAvailableProgramSubjects(subjectProgram.id, {
          search: subjectSearch,
        });

        if (!cancelled) {
          setAvailableSubjects(result.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setSubjectError(
            err.message || "Gagal mengambil Subject yang tersedia.",
          );
        }
      } finally {
        if (!cancelled) {
          setAvailableSubjectsLoading(false);
        }
      }
    }

    loadAvailable();

    return () => {
      cancelled = true;
    };
  }, [subjectModalOpen, subjectProgram?.id, subjectSearch]);

  // ==========================================
  // PROGRAM SUBJECT: FORM
  // ==========================================

  function handleSubjectFormChange(event) {
    const { name, value, type, checked } = event.target;

    setSubjectForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  // ==========================================
  // PROGRAM SUBJECT: ADD
  // ==========================================

  async function handleAddProgramSubject(event) {
    event.preventDefault();

    if (!subjectProgram) return;

    if (!subjectForm.subjectId) {
      setSubjectError("Pilih Subject terlebih dahulu.");
      return;
    }

    try {
      setSubjectSaving(true);
      setSubjectError("");
      setSubjectSuccess("");

      await addProgramSubject(subjectProgram.id, {
        subjectId: subjectForm.subjectId,
        isRequired: subjectForm.isRequired,
      });

      setSubjectSuccess("Subject berhasil ditambahkan ke Program.");

      setSubjectForm(initialSubjectForm);

      await Promise.all([
        loadProgramSubjects(subjectProgram.id),
        loadAvailableSubjects(subjectProgram.id, subjectSearch),
      ]);
    } catch (err) {
      setSubjectError(err.message || "Gagal menambahkan Subject.");
    } finally {
      setSubjectSaving(false);
    }
  }

  // ==========================================
  // PROGRAM SUBJECT: UPDATE REQUIRED STATUS
  // ==========================================

  async function handleSubjectRequiredChange(subject, isRequired) {
    if (!subjectProgram) return;

    try {
      setSubjectActionId(subject.subjectId);
      setSubjectError("");
      setSubjectSuccess("");

      await updateProgramSubject(
        subjectProgram.id,
        subject.subjectId,
        isRequired,
      );

      await loadProgramSubjects(subjectProgram.id);

      setSubjectSuccess(
        isRequired
          ? "Subject berhasil diatur sebagai wajib."
          : "Subject berhasil diatur sebagai pilihan.",
      );
    } catch (err) {
      setSubjectError(err.message || "Gagal mengubah status Subject.");
    } finally {
      setSubjectActionId(null);
    }
  }

  // ==========================================
  // PROGRAM SUBJECT: REMOVE
  // ==========================================

  async function handleDeleteProgramSubject(subject) {
    if (!subjectProgram) return;

    const confirmed = window.confirm(
      `Lepaskan Subject "${subject.subjectName}" dari Program "${subjectProgram.programName}"?\n\nData Subject utama tidak akan dihapus.`,
    );

    if (!confirmed) return;

    try {
      setSubjectActionId(subject.subjectId);
      setSubjectError("");
      setSubjectSuccess("");

      await deleteProgramSubject(subjectProgram.id, subject.subjectId);

      setSubjectSuccess("Subject berhasil dilepaskan dari Program.");

      await Promise.all([
        loadProgramSubjects(subjectProgram.id),
        loadAvailableSubjects(subjectProgram.id, subjectSearch),
      ]);
    } catch (err) {
      setSubjectError(err.message || "Gagal melepaskan Subject dari Program.");
    } finally {
      setSubjectActionId(null);
    }
  }

  // ==========================================
  // STYLE
  // ==========================================

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#70B8AE] focus:ring-2 focus:ring-[#70B8AE]/20";

  const activeCount = programs.filter((program) => program.isActive).length;

  const inactiveCount = programs.filter((program) => !program.isActive).length;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#35485E]">
            Manajemen Program
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Kelola kategori dan program pembelajaran Ilyon Academy.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-xl bg-[#529F93] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#438C81]"
        >
          + Tambah Program
        </button>
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
          <p className="text-sm text-gray-500">Total Program</p>
          <p className="mt-2 text-2xl font-bold text-[#35485E]">
            {pagination.total}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-sm text-gray-500">Program Aktif</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-sm text-gray-500">Program Nonaktif</p>
          <p className="mt-2 text-2xl font-bold text-red-500">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* TABEL PROGRAM */}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 p-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode atau nama program..."
            className={`${inputClass} max-w-md`}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-4">Program</th>
                <th className="px-5 py-4">Kode</th>
                <th className="px-5 py-4">Harga Default</th>
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
                    Memuat data program...
                  </td>
                </tr>
              ) : programs.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Tidak ada data program.
                  </td>
                </tr>
              ) : (
                programs.map((program) => (
                  <tr key={program.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#35485E]">
                        {program.programName}
                      </p>

                      {program.description && (
                        <p className="mt-1 max-w-xs truncate text-xs text-gray-400">
                          {program.description}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">{program.programCode}</td>

                    <td className="px-5 py-4">
                      {Number(program.defaultPrice || 0).toLocaleString(
                        "id-ID",
                        {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        },
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          program.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {program.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openProgramSubjects(program)}
                          className="rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                        >
                          Kelola Subject
                        </button>

                        <button
                          onClick={() => openOfferings(program)}
                          className="rounded-lg bg-[#EAF5F3] px-3 py-2 text-xs font-semibold text-[#438C81] hover:bg-[#DDF0EC]"
                        >
                          Kelola Offering
                        </button>

                        <button
                          onClick={() => openEditModal(program)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleStatusChange(program)}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                            program.isActive
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                        >
                          {program.isActive ? "Nonaktifkan" : "Aktifkan"}
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

        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
          <p className="text-xs text-gray-500">
            Total {pagination.total} program
          </p>

          <div className="flex items-center gap-3">
            <button
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadPrograms(pagination.page - 1)}
              className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"
            >
              Sebelumnya
            </button>

            <span className="text-xs text-gray-500">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadPrograms(pagination.page + 1)}
              className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL FORM PROGRAM
      ========================================== */}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  {editingId ? "Edit Program" : "Tambah Program"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Lengkapi informasi program berikut.
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
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Kode Program *</span>
                  <input
                    name="programCode"
                    value={form.programCode}
                    onChange={handleChange}
                    required
                    minLength={2}
                    maxLength={50}
                    disabled={Boolean(editingId)}
                    placeholder="Contoh: CALISTUNG"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Nama Program *</span>
                  <input
                    name="programName"
                    value={form.programName}
                    onChange={handleChange}
                    required
                    minLength={2}
                    maxLength={150}
                    placeholder="Nama program"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Durasi Default (Menit)</span>
                  <input
                    type="number"
                    name="defaultDurationMinutes"
                    value={form.defaultDurationMinutes}
                    onChange={handleChange}
                    min="1"
                    placeholder="Contoh: 60"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Harga Default (Rp)</span>
                  <input
                    type="number"
                    name="defaultPrice"
                    value={form.defaultPrice}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Minimal Siswa</span>
                  <input
                    type="number"
                    name="minStudents"
                    value={form.minStudents}
                    onChange={handleChange}
                    min="1"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Maksimal Siswa</span>
                  <input
                    type="number"
                    name="maxStudents"
                    value={form.maxStudents}
                    onChange={handleChange}
                    min="1"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="font-semibold">Deskripsi</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="3"
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 accent-[#529F93]"
                />
                Program aktif
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
                  {saving ? "Menyimpan..." : "Simpan Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL PROGRAM - SUBJECT MAPPING
      ========================================== */}

      {subjectModalOpen && subjectProgram && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6">
            {/* HEADER */}

            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  Kelola Subject Program
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {subjectProgram.programName} ({subjectProgram.programCode})
                </p>
              </div>

              <button
                type="button"
                onClick={closeProgramSubjects}
                className="self-start rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 sm:self-auto"
              >
                Tutup
              </button>
            </div>

            {/* NOTIFIKASI */}

            {subjectError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {subjectError}
              </div>
            )}

            {subjectSuccess && (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {subjectSuccess}
              </div>
            )}

            {/* FORM TAMBAH SUBJECT */}

            <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <h3 className="mb-1 font-semibold text-[#35485E]">
                Tambahkan Subject
              </h3>

              <p className="mb-4 text-xs text-gray-500">
                Pilih Subject aktif yang belum terhubung dengan Program ini.
              </p>

              <form
                onSubmit={handleAddProgramSubject}
                className="grid gap-4 md:grid-cols-[1fr_auto_auto]"
              >
                <div className="space-y-1">
                  <label className="text-sm font-semibold">Pilih Subject</label>

                  <select
                    name="subjectId"
                    value={subjectForm.subjectId}
                    onChange={handleSubjectFormChange}
                    className={inputClass}
                    disabled={
                      availableSubjectsLoading || availableSubjects.length === 0
                    }
                    required
                  >
                    <option value="">
                      {availableSubjectsLoading
                        ? "Memuat Subject..."
                        : availableSubjects.length === 0
                          ? "Tidak ada Subject tersedia"
                          : "Pilih Subject"}
                    </option>

                    {availableSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.subjectCode} - {subject.subjectName}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input
                    type="checkbox"
                    name="isRequired"
                    checked={subjectForm.isRequired}
                    onChange={handleSubjectFormChange}
                    className="h-4 w-4 accent-[#529F93]"
                  />
                  Subject wajib
                </label>

                <button
                  type="submit"
                  disabled={
                    subjectSaving ||
                    !subjectForm.subjectId ||
                    availableSubjectsLoading
                  }
                  className="self-end rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#438C81] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {subjectSaving ? "Menambahkan..." : "+ Tambahkan"}
                </button>
              </form>
            </div>

            {/* DAFTAR SUBJECT */}

            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold text-[#35485E]">
                  Subject Terhubung
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  {programSubjects.length} Subject terhubung dengan Program ini.
                </p>
              </div>

              <input
                type="search"
                value={subjectSearch}
                onChange={(event) => setSubjectSearch(event.target.value)}
                placeholder="Cari Subject yang tersedia..."
                className={`${inputClass} sm:max-w-xs`}
              />
            </div>

            {subjectLoading ? (
              <div className="py-12 text-center text-sm text-gray-400">
                Memuat Subject Program...
              </div>
            ) : programSubjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
                <p className="font-semibold text-[#35485E]">
                  Belum ada Subject terhubung
                </p>

                <p className="mt-1 text-sm text-gray-400">
                  Pilih Subject dari daftar di atas untuk menghubungkannya
                  dengan Program ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Kode</th>
                      <th className="px-4 py-3">Status Subject</th>
                      <th className="px-4 py-3">Status Subject Utama</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {programSubjects.map((subject) => {
                      const rowBusy = subjectActionId === subject.subjectId;

                      return (
                        <tr
                          key={subject.subjectId}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[#35485E]">
                              {subject.subjectName}
                            </p>

                            {subject.description && (
                              <p className="mt-1 max-w-xs truncate text-xs text-gray-400">
                                {subject.description}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-3">{subject.subjectCode}</td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                subject.isRequired
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {subject.isRequired ? "Wajib" : "Pilihan"}
                            </span>
                          </td>

                          <td className="px-4 py-3">
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

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-3">
                              <label className="flex items-center gap-2 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={Boolean(subject.isRequired)}
                                  disabled={rowBusy}
                                  onChange={(event) =>
                                    handleSubjectRequiredChange(
                                      subject,
                                      event.target.checked,
                                    )
                                  }
                                  className="h-4 w-4 accent-[#529F93]"
                                />
                                Wajib
                              </label>

                              <button
                                type="button"
                                disabled={rowBusy}
                                onClick={() =>
                                  handleDeleteProgramSubject(subject)
                                }
                                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                              >
                                {rowBusy ? "Memproses..." : "Lepaskan"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={closeProgramSubjects}
                className="rounded-xl border px-5 py-2.5 text-sm font-semibold hover:bg-gray-50"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL DAFTAR OFFERING
      ========================================== */}

      {offeringModalOpen && selectedProgram && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  Offering Program
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {selectedProgram.programName} ({selectedProgram.programCode})
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={openCreateOffering}
                  className="rounded-xl bg-[#529F93] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#438C81]"
                >
                  + Tambah Offering
                </button>

                <button
                  onClick={() => {
                    setOfferingModalOpen(false);
                    setSelectedProgram(null);
                    setOfferingFormModalOpen(false);
                  }}
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                >
                  Tutup
                </button>
              </div>
            </div>

            {offeringsError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {offeringsError}
              </div>
            )}

            {offeringsLoading ? (
              <div className="py-12 text-center text-sm text-gray-400">
                Memuat data offering...
              </div>
            ) : offerings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
                <p className="font-semibold text-[#35485E]">
                  Belum ada offering
                </p>

                <p className="mt-1 text-sm text-gray-400">
                  Tambahkan pilihan layanan untuk program ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Offering</th>
                      <th className="px-4 py-3">Layanan</th>
                      <th className="px-4 py-3">Metode</th>
                      <th className="px-4 py-3">Harga</th>
                      <th className="px-4 py-3">Kuota</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {offerings.map((offering) => (
                      <tr key={offering.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#35485E]">
                            {offering.offeringName}
                          </p>

                          <p className="text-xs text-gray-400">
                            {offering.offeringCode}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          {deliveryLabels[offering.deliveryType] ||
                            offering.deliveryType}
                        </td>

                        <td className="px-4 py-3">
                          {methodLabels[offering.learningMethod] ||
                            offering.learningMethod}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-semibold">
                            {Number(offering.price || 0).toLocaleString(
                              "id-ID",
                              {
                                style: "currency",
                                currency: "IDR",
                                maximumFractionDigits: 0,
                              },
                            )}
                          </p>

                          <p className="text-xs text-gray-400">
                            {pricingLabels[offering.pricingUnit] ||
                              offering.pricingUnit}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          {offering.isUnlimited
                            ? "Tidak terbatas"
                            : (offering.meetingQuota ?? "-")}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              offering.isActive
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {offering.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditOffering(offering)}
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                handleOfferingStatusChange(offering)
                              }
                              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                                offering.isActive
                                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                                  : "bg-green-50 text-green-700 hover:bg-green-100"
                              }`}
                            >
                              {offering.isActive ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL FORM OFFERING
      ========================================== */}

      {offeringFormModalOpen && selectedProgram && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#35485E]">
                  {offeringEditingId ? "Edit Offering" : "Tambah Offering"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {selectedProgram.programName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOfferingFormModalOpen(false)}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {offeringFormError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {offeringFormError}
              </div>
            )}

            <form onSubmit={handleOfferingSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* KODE */}

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Kode Offering *</span>

                  <input
                    name="offeringCode"
                    value={offeringForm.offeringCode}
                    onChange={handleOfferingChange}
                    required
                    minLength={2}
                    maxLength={50}
                    placeholder="Contoh: CALISTUNG_ONSITE_PRIVATE"
                    className={inputClass}
                  />
                </label>

                {/* NAMA */}

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Nama Offering *</span>

                  <input
                    name="offeringName"
                    value={offeringForm.offeringName}
                    onChange={handleOfferingChange}
                    required
                    minLength={2}
                    maxLength={150}
                    placeholder="Contoh: Calistung Private Onsite"
                    className={inputClass}
                  />
                </label>

                {/* DELIVERY */}

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Jenis Layanan *</span>

                  <select
                    name="deliveryType"
                    value={offeringForm.deliveryType}
                    onChange={handleOfferingChange}
                    className={inputClass}
                    required
                  >
                    {Object.entries(deliveryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* METHOD */}

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Metode Belajar *</span>

                  <select
                    name="learningMethod"
                    value={offeringForm.learningMethod}
                    onChange={handleOfferingChange}
                    className={inputClass}
                    required
                  >
                    {Object.entries(methodLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* BILLING */}

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Periode Tagihan *</span>

                  <select
                    name="billingPeriod"
                    value={offeringForm.billingPeriod}
                    onChange={handleOfferingChange}
                    className={inputClass}
                    required
                  >
                    {Object.entries(billingLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* PRICE */}

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Harga (Rp) *</span>

                  <input
                    type="number"
                    name="price"
                    value={offeringForm.price}
                    onChange={handleOfferingChange}
                    min="0"
                    step="1"
                    required
                    className={inputClass}
                  />
                </label>

                {/* PRICING UNIT */}

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Satuan Harga *</span>

                  <select
                    name="pricingUnit"
                    value={offeringForm.pricingUnit}
                    onChange={handleOfferingChange}
                    className={inputClass}
                    required
                  >
                    {Object.entries(pricingLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* QUOTA */}

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Kuota Pertemuan</span>

                  <input
                    type="number"
                    name="meetingQuota"
                    value={offeringForm.meetingQuota}
                    onChange={handleOfferingChange}
                    min="1"
                    disabled={offeringForm.isUnlimited}
                    placeholder="Contoh: 8"
                    className={inputClass}
                  />
                </label>

                {/* DURATION */}

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Durasi Sesi (Menit)</span>

                  <input
                    type="number"
                    name="sessionDurationMinutes"
                    value={offeringForm.sessionDurationMinutes}
                    onChange={handleOfferingChange}
                    min="1"
                    disabled={offeringForm.isFlexibleDuration}
                    placeholder="Contoh: 60"
                    className={inputClass}
                  />
                </label>

                {/* MIN STUDENTS */}

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Minimal Siswa</span>

                  <input
                    type="number"
                    name="minStudents"
                    value={offeringForm.minStudents}
                    onChange={handleOfferingChange}
                    min="1"
                    className={inputClass}
                  />
                </label>

                {/* MAX STUDENTS */}

                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Maksimal Siswa</span>

                  <input
                    type="number"
                    name="maxStudents"
                    value={offeringForm.maxStudents}
                    onChange={handleOfferingChange}
                    min="1"
                    className={inputClass}
                  />
                </label>

                {/* DESCRIPTION */}

                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="font-semibold">Deskripsi</span>

                  <textarea
                    name="description"
                    value={offeringForm.description}
                    onChange={handleOfferingChange}
                    rows="3"
                    className={inputClass}
                    placeholder="Keterangan tambahan offering..."
                  />
                </label>
              </div>

              {/* OPTIONS */}

              <div className="space-y-3 rounded-xl bg-gray-50 p-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isUnlimited"
                    checked={offeringForm.isUnlimited}
                    onChange={handleOfferingChange}
                    className="h-4 w-4 accent-[#529F93]"
                  />
                  Kuota pertemuan tidak terbatas
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isFlexibleDuration"
                    checked={offeringForm.isFlexibleDuration}
                    onChange={handleOfferingChange}
                    className="h-4 w-4 accent-[#529F93]"
                  />
                  Durasi sesi fleksibel
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={offeringForm.isActive}
                    onChange={handleOfferingChange}
                    className="h-4 w-4 accent-[#529F93]"
                  />
                  Offering aktif
                </label>
              </div>

              {/* BUTTONS */}

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setOfferingFormModalOpen(false)}
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={offeringSaving}
                  className="rounded-xl bg-[#529F93] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {offeringSaving ? "Menyimpan..." : "Simpan Offering"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
