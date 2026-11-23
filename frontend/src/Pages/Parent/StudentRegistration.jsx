import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getActiveBranchesForParent } from "../../Services/BranchService";

import {
  submitStudentClaim,
  searchStudentsForParent,
} from "../../Services/ParentService";

export default function StudentRegistration() {
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [branchId, setBranchId] = useState("");
  const [childMode, setChildMode] = useState("existing");

  // PENCARIAN SISWA TERDAFTAR
  const [studentSearch, setStudentSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  // DATA PENGAJUAN
  const [claimData, setClaimData] = useState({
    studentName: "",
    birthDate: "",
    whatsappNumber: "",
    relationshipLabel: "",
  });

  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState("");
  const [claimCode, setClaimCode] = useState("");

  // ==========================================
  // LOAD UNIT
  // ==========================================

  useEffect(() => {
    let mounted = true;

    async function loadBranches() {
      try {
        setLoading(true);
        setError("");

        const response = await getActiveBranchesForParent();

        if (!mounted) return;

        setBranches(response?.data || []);
      } catch (err) {
        if (mounted) {
          setError(err.message || "Gagal mengambil daftar unit.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadBranches();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================
  // CARI SISWA BERDASARKAN UNIT
  // ==========================================

  useEffect(() => {
    let mounted = true;

    async function loadStudents() {
      const keyword = studentSearch.trim();

      setStudents([]);
      setSelectedStudent(null);
      setStudentId("");

      if (!branchId || keyword.length < 2) {
        setStudentLoading(false);
        return;
      }

      try {
        setStudentLoading(true);

        const response = await searchStudentsForParent(branchId, keyword);

        if (!mounted) return;

        const result = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.students)
            ? response.data.students
            : [];

        setStudents(result);
      } catch (err) {
        if (mounted) {
          setStudents([]);
          setError(err.message || "Gagal mencari siswa.");
        }
      } finally {
        if (mounted) setStudentLoading(false);
      }
    }

    const timeout = setTimeout(loadStudents, 350);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [branchId, studentSearch]);

  // ==========================================
  // RESET FEEDBACK
  // ==========================================

  function resetClaimFeedback() {
    setClaimSuccess("");
    setClaimCode("");
    setError("");
  }

  // ==========================================
  // GANTI MODE PENDAFTARAN
  // ==========================================

  function changeMode(mode) {
    setChildMode(mode);
    setStudentSearch("");
    setStudents([]);
    setStudentId("");
    setSelectedStudent(null);

    setClaimData({
      studentName: "",
      birthDate: "",
      whatsappNumber: "",
      relationshipLabel: "",
    });

    resetClaimFeedback();
  }

  // ==========================================
  // PILIH SISWA HASIL PENCARIAN
  // ==========================================

  function handleSelectStudent(student) {
    setSelectedStudent(student);
    setStudentId(student.id);
    resetClaimFeedback();
  }

  // ==========================================
  // AJUKAN KLAIM SISWA
  // ==========================================

  async function handleSubmitClaim() {
    try {
      setError("");
      setClaimSuccess("");
      setClaimCode("");

      if (!branchId) {
        setError("Silakan pilih unit terlebih dahulu.");
        return;
      }

      if (childMode === "existing" && !studentId) {
        setError("Silakan cari dan pilih siswa terlebih dahulu.");
        return;
      }

      if (childMode === "new") {
        if (claimData.studentName.trim().length < 2) {
          setError("Nama lengkap siswa minimal 2 karakter.");
          return;
        }

        if (!claimData.birthDate) {
          setError("Tanggal lahir siswa wajib diisi.");
          return;
        }
      }

      if (claimData.whatsappNumber.trim().length < 8) {
        setError("Nomor WhatsApp minimal 8 karakter.");
        return;
      }

      setClaimSubmitting(true);

      const payload = {
        branchId,
        whatsappNumber: claimData.whatsappNumber.trim(),
        relationshipLabel: claimData.relationshipLabel.trim() || null,
      };

      if (childMode === "existing") {
        payload.requestedStudentId = studentId;
      } else {
        payload.studentName = claimData.studentName.trim();
        payload.birthDate = claimData.birthDate;
      }

      const response = await submitStudentClaim(payload);

      const claim = response?.data;

      setClaimCode(claim?.claimCode || "");

      setClaimSuccess(
        response?.message ||
          "Permintaan berhasil diajukan dan menunggu pemeriksaan admin.",
      );

      setStudentSearch("");
      setStudents([]);
      setStudentId("");
      setSelectedStudent(null);

      setClaimData({
        studentName: "",
        birthDate: "",
        whatsappNumber: "",
        relationshipLabel: "",
      });
    } catch (err) {
      setError(err.message || "Gagal mengajukan klaim siswa.");
    } finally {
      setClaimSubmitting(false);
    }
  }

  // ==========================================
  // SALIN KODE KLAIM
  // ==========================================

  async function handleCopyClaimCode() {
    if (!claimCode) return;

    try {
      await navigator.clipboard.writeText(claimCode);

      setError("");
      setClaimSuccess(
        "Kode klaim berhasil disalin. Simpan kode tersebut untuk verifikasi admin.",
      );
    } catch {
      setError("Gagal menyalin kode klaim. Silakan salin manual.");
    }
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/parent/data-anak")}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          ← Kembali
        </button>

        <div>
          <h1 className="text-2xl font-extrabold text-[#35485E]">
            Pendaftaran Anak
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Ajukan penambahan atau penghubungan siswa ke akun Parent.
          </p>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-500">
          Memuat katalog unit dan program...
        </div>
      ) : (
        <>
          {/* PILIH UNIT */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-[#35485E]">1. Pilih Unit</h2>

            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setStudentSearch("");
                setStudents([]);
                setStudentId("");
                setSelectedStudent(null);
                resetClaimFeedback();
              }}
              className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            >
              <option value="">Pilih unit Ilyon Academy</option>

              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branchName}
                  {branch.city ? ` - ${branch.city}` : ""}
                </option>
              ))}
            </select>

            {branches.length === 0 && (
              <p className="mt-2 text-sm text-amber-600">
                Belum ada unit aktif yang tersedia.
              </p>
            )}
          </section>

          {/* PILIH JENIS PENGAJUAN */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-[#35485E]">
              2. Jenis Pengajuan Siswa
            </h2>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => changeMode("existing")}
                className={`rounded-xl border p-4 text-left ${
                  childMode === "existing"
                    ? "border-[#70B8AE] bg-[#EAF6F4]"
                    : "border-gray-200"
                }`}
              >
                <p className="font-bold text-[#35485E]">
                  Siswa Sudah Terdaftar
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Cari siswa dari database unit dan ajukan permintaan
                  penghubungan.
                </p>
              </button>

              <button
                type="button"
                onClick={() => changeMode("new")}
                className={`rounded-xl border p-4 text-left ${
                  childMode === "new"
                    ? "border-[#70B8AE] bg-[#EAF6F4]"
                    : "border-gray-200"
                }`}
              >
                <p className="font-bold text-[#35485E]">Tambahkan Siswa Baru</p>

                <p className="mt-1 text-sm text-gray-500">
                  Ajukan data siswa baru untuk diperiksa dan disetujui Admin.
                </p>
              </button>
            </div>

            {/* SISWA TERDAFTAR */}
            {childMode === "existing" && (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl bg-[#EAF6F4] p-4 text-sm text-gray-600">
                  Cari nama siswa yang sudah terdaftar pada unit yang dipilih.
                  Memilih siswa belum memberikan akses ke data siswa tersebut.
                  Admin harus menyetujui pengajuan terlebih dahulu.
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Cari Nama Siswa
                  </label>

                  <input
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      resetClaimFeedback();
                    }}
                    disabled={!branchId}
                    placeholder={
                      branchId
                        ? "Ketik minimal 2 karakter..."
                        : "Pilih unit terlebih dahulu"
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm disabled:bg-gray-100"
                  />

                  <p className="mt-1 text-xs text-gray-400">
                    Pencarian hanya menampilkan maksimal 10 hasil dari unit yang
                    dipilih.
                  </p>
                </div>

                {studentSearch.trim().length === 1 && (
                  <p className="text-sm text-gray-500">
                    Ketik minimal 2 karakter untuk mencari siswa.
                  </p>
                )}

                {studentLoading && (
                  <p className="text-sm text-gray-500">Mencari siswa...</p>
                )}

                {!studentLoading &&
                  studentSearch.trim().length >= 2 &&
                  students.length === 0 && (
                    <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                      Tidak ditemukan siswa yang sesuai.
                    </p>
                  )}

                {students.length > 0 && (
                  <div className="space-y-2">
                    {students.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleSelectStudent(student)}
                        className={`w-full rounded-xl border p-4 text-left ${
                          studentId === student.id
                            ? "border-[#70B8AE] bg-[#EAF6F4]"
                            : "border-gray-200 hover:border-[#70B8AE]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-[#35485E]">
                            {student.fullName}
                          </span>

                          {studentId === student.id && (
                            <span className="text-sm font-bold text-[#4D9D92]">
                              Terpilih
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedStudent && (
                  <div className="rounded-xl border border-[#70B8AE] bg-[#EAF6F4] p-4">
                    <p className="text-xs text-gray-500">SISWA YANG DIPILIH</p>

                    <p className="mt-1 font-bold text-[#35485E]">
                      {selectedStudent.fullName}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SISWA BARU */}
            {childMode === "new" && (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl bg-[#EAF6F4] p-4 text-sm text-gray-600">
                  Data siswa baru tidak langsung dimasukkan ke database. Siswa
                  baru akan dibuat setelah Admin memeriksa dan menyetujui
                  pengajuan.
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Nama Lengkap Siswa *
                  </label>

                  <input
                    value={claimData.studentName}
                    onChange={(e) =>
                      setClaimData({
                        ...claimData,
                        studentName: e.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                    placeholder="Masukkan nama lengkap siswa"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Tanggal Lahir *
                  </label>

                  <input
                    type="date"
                    value={claimData.birthDate}
                    onChange={(e) =>
                      setClaimData({
                        ...claimData,
                        birthDate: e.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  />
                </div>
              </div>
            )}

            {/* INFORMASI PARENT */}
            <div className="mt-6 space-y-4 border-t border-gray-100 pt-6">
              <h3 className="font-bold text-[#35485E]">
                3. Informasi Orang Tua / Wali
              </h3>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Nomor WhatsApp Orang Tua *
                </label>

                <input
                  type="tel"
                  value={claimData.whatsappNumber}
                  onChange={(e) =>
                    setClaimData({
                      ...claimData,
                      whatsappNumber: e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  placeholder="Masukkan nomor WhatsApp aktif"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Hubungan dengan Siswa
                </label>

                <select
                  value={claimData.relationshipLabel}
                  onChange={(e) =>
                    setClaimData({
                      ...claimData,
                      relationshipLabel: e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                >
                  <option value="">Pilih hubungan</option>
                  <option value="Ayah">Ayah</option>
                  <option value="Ibu">Ibu</option>
                  <option value="Wali">Wali</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            {/* TOMBOL AJUKAN */}
            <button
              type="button"
              onClick={handleSubmitClaim}
              disabled={
                claimSubmitting ||
                !branchId ||
                !claimData.whatsappNumber.trim() ||
                (childMode === "existing" && !studentId) ||
                (childMode === "new" &&
                  (!claimData.studentName.trim() || !claimData.birthDate))
              }
              className="mt-6 rounded-xl bg-[#70B8AE] px-6 py-3 font-bold text-white hover:bg-[#5CA69B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {claimSubmitting ? "Mengirim Pengajuan..." : "Ajukan Permintaan"}
            </button>

            {/* HASIL PENGAJUAN */}
            {claimSuccess && (
              <div className="mt-5 space-y-3 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-700">
                  {claimSuccess}
                </p>

                {claimCode && (
                  <div className="rounded-lg border border-green-200 bg-white p-4">
                    <p className="text-xs font-medium text-gray-500">
                      KODE KLAIM SISWA
                    </p>

                    <p className="mt-2 text-2xl font-extrabold tracking-wider text-[#35485E]">
                      {claimCode}
                    </p>

                    <button
                      type="button"
                      onClick={handleCopyClaimCode}
                      className="mt-3 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Salin Kode Klaim
                    </button>
                  </div>
                )}

                <p className="text-xs text-green-700">
                  Simpan kode klaim untuk membantu Admin menemukan pengajuan.
                  Kode ini bukan bukti hubungan dengan siswa.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
