import { useEffect, useState } from "react";
import { getMyTutorProfile } from "../../Services/TutorService";

export default function TutorDashboard() {
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const response = await getMyTutorProfile();

        if (mounted) {
          setTutor(response.data);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Gagal mengambil data tutor.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-gray-500">Memuat dashboard tutor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="font-medium text-red-700">Gagal memuat dashboard</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        Profil tutor tidak ditemukan.
      </div>
    );
  }

  const formatStatus = (status) => {
    if (!status) return "-";

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const profileItems = [
    { label: "Kode Tutor", value: tutor.tutorCode },
    { label: "Email", value: tutor.email },
    { label: "Nomor Telepon", value: tutor.phone },
    { label: "Pendidikan", value: tutor.educationLevel },
    { label: "Jurusan", value: tutor.educationMajor },
    {
      label: "Pengalaman",
      value:
        tutor.experienceYears != null ? `${tutor.experienceYears} tahun` : "-",
    },
    {
      label: "Status Kepegawaian",
      value: formatStatus(tutor.employmentStatus),
    },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Tutor</h1>
        <p className="mt-1 text-sm text-gray-500">
          Selamat datang di dashboard Ilyon Academy.
        </p>
      </div>

      {/* WELCOME CARD */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
        <p className="text-sm text-indigo-100">Selamat datang,</p>

        <h2 className="mt-1 text-2xl font-bold">{tutor.fullName || "Tutor"}</h2>

        <p className="mt-2 text-sm text-indigo-100">
          Kode Tutor: {tutor.tutorCode || "-"}
        </p>
      </div>

      {/* PROFILE SUMMARY */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Informasi Tutor
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {profileItems.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="mt-2 font-semibold text-gray-900">
                {item.value || "-"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* EXPERTISE */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Keahlian</h2>

        <p className="mt-2 text-sm text-gray-600">
          {Array.isArray(tutor.expertise)
            ? tutor.expertise.join(", ") || "-"
            : tutor.expertise || "-"}
        </p>
      </div>

      {/* BRANCH ASSIGNMENTS */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Cabang Penugasan</h2>

        {Array.isArray(tutor.branchAssignments) &&
        tutor.branchAssignments.length > 0 ? (
          <div className="mt-3 space-y-3">
            {tutor.branchAssignments.map((branch) => (
              <div
                key={branch.branchId}
                className="flex flex-col justify-between gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0 sm:flex-row"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {branch.branchName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {branch.branchCode || "-"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {branch.isPrimary && (
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                      Cabang Utama
                    </span>
                  )}

                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    {branch.isActive ? "Aktif" : "Tidak Aktif"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            Belum ada cabang penugasan.
          </p>
        )}
      </div>
    </div>
  );
}
