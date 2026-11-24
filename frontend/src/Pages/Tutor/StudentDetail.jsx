import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMyTutorStudentDetail } from "../../Services/TutorService";

export default function StudentDetail() {
  const { id } = useParams();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadStudent() {
      try {
        setLoading(true);
        setError("");

        const response = await getMyTutorStudentDetail(id);

        if (mounted) {
          setStudent(response.data);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Gagal mengambil detail siswa.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadStudent();

    return () => {
      mounted = false;
    };
  }, [id]);

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatGender = (gender) => {
    if (gender === "male") return "Laki-laki";
    if (gender === "female") return "Perempuan";
    return gender || "-";
  };

  const formatTime = (time) => {
    if (!time) return "-";
    return String(time).slice(0, 5);
  };

  const InfoItem = ({ label, value }) => (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 break-words font-medium text-gray-900">
        {value || "-"}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-gray-500">Memuat detail siswa...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-4">
        <Link
          to="/tutor/siswa"
          className="inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Kembali ke Siswa Saya
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-medium text-red-700">Gagal memuat detail siswa</p>
          <p className="mt-1 text-sm text-red-600">
            {error || "Siswa tidak ditemukan."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <Link
          to="/tutor/siswa"
          className="mb-3 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Kembali ke Siswa Saya
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">Detail Siswa</h1>
        <p className="mt-1 text-sm text-gray-500">
          Informasi lengkap siswa dalam cabang penugasan Anda.
        </p>
      </div>

      {/* STUDENT PROFILE */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-gray-500">Nama Siswa</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              {student.fullName}
            </h2>

            {student.nickname && (
              <p className="mt-1 text-sm text-gray-500">
                Nama panggilan: {student.nickname}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
              {student.studentCode}
            </span>

            <span className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">
              Aktif
            </span>
          </div>
        </div>
      </div>

      {/* IDENTITAS */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-5 font-semibold text-gray-900">Identitas Siswa</h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Kode Siswa" value={student.studentCode} />
          <InfoItem label="Nama Lengkap" value={student.fullName} />
          <InfoItem label="Nama Panggilan" value={student.nickname} />
          <InfoItem
            label="Jenis Kelamin"
            value={formatGender(student.gender)}
          />
          <InfoItem
            label="Tanggal Lahir"
            value={formatDate(student.birthDate)}
          />
          <InfoItem label="Status" value="Aktif" />
        </div>
      </section>

      {/* INFORMASI SEKOLAH */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-5 font-semibold text-gray-900">Informasi Sekolah</h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Nama Sekolah" value={student.schoolName} />
          <InfoItem label="Jenjang / Kelas" value={student.schoolGrade} />
          <InfoItem
            label="Jam Pulang Sekolah"
            value={formatTime(student.schoolDismissalTime)}
          />
        </div>
      </section>

      {/* INFORMASI CABANG */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-5 font-semibold text-gray-900">Informasi Cabang</h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <InfoItem label="Cabang Utama" value={student.primaryBranchName} />
          <InfoItem label="ID Cabang" value={student.primaryBranchId} />
        </div>
      </section>

      {/* KONTAK */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-5 font-semibold text-gray-900">Kontak dan Alamat</h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Nomor Telepon Siswa" value={student.studentPhone} />
          <InfoItem
            label="Nomor Telepon Orang Tua"
            value={student.parentPhone}
          />
          <InfoItem label="Kota" value={student.city} />
          <InfoItem label="Provinsi" value={student.province} />
          <InfoItem label="Alamat" value={student.address} />
        </div>
      </section>

      {/* CATATAN */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Catatan Siswa</h2>

        <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
          {student.notes || "Belum ada catatan siswa."}
        </p>
      </section>
    </div>
  );
}
