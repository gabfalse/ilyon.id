import { useCallback, useEffect, useState } from "react";
import { getMyTutorStudents } from "../../Services/TutorService";
import { Link } from "react-router-dom";

export default function TutorStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getMyTutorStudents({
        search,
        page,
        limit: 10,
      });

      setStudents(response.data || []);
      setPagination(
        response.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        },
      );
    } catch (err) {
      setError(err.message || "Gagal mengambil daftar siswa.");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const formatGender = (gender) => {
    if (gender === "male") return "Laki-laki";
    if (gender === "female") return "Perempuan";
    return gender || "-";
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getWhatsAppNumber = (phone) => {
    if (!phone) return "";

    let number = String(phone).replace(/\D/g, "");

    // Ubah awalan 0 menjadi kode negara Indonesia
    if (number.startsWith("0")) {
      number = `62${number.slice(1)}`;
    } else if (number.startsWith("8")) {
      number = `62${number}`;
    }

    return number;
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Siswa Saya</h1>
        <p className="mt-1 text-sm text-gray-500">
          Daftar siswa aktif pada cabang penugasan Anda.
        </p>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Siswa</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {pagination.total}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Halaman</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {pagination.totalPages > 0 ? page : 1} / {pagination.totalPages}
          </p>
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-gray-900">Daftar Siswa</h2>
            <p className="mt-1 text-sm text-gray-500">
              Siswa dari seluruh cabang aktif penugasan Anda.
            </p>
          </div>

          <input
            type="text"
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Cari nama, kode, atau sekolah..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:max-w-xs"
          />
        </div>

        {error && (
          <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-700">
              Gagal memuat daftar siswa
            </p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={loadStudents}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <p className="text-sm text-gray-500">Memuat daftar siswa...</p>
          </div>
        ) : !error && students.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <span className="text-xl">👨‍🎓</span>
            </div>
            <p className="font-medium text-gray-900">
              {search
                ? "Siswa tidak ditemukan"
                : "Belum ada siswa yang ditugaskan"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {search
                ? "Coba gunakan kata kunci pencarian lain."
                : "Siswa aktif dari cabang penugasan Anda akan muncul di sini."}
            </p>
          </div>
        ) : !error ? (
          <>
            <div className="divide-y divide-gray-100">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="p-5 transition hover:bg-gray-50"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <Link
                        to={`/tutor/siswa/${student.id}`}
                        className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
                      >
                        {student.fullName}
                      </Link>

                      {student.nickname && (
                        <p className="mt-1 text-sm text-gray-500">
                          Panggilan: {student.nickname}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700">
                          {student.studentCode}
                        </span>

                        <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700">
                          Aktif
                        </span>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-sm font-medium text-gray-800">
                        {student.primaryBranchName || "-"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Cabang penugasan
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-500">Jenis Kelamin</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {formatGender(student.gender)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Tanggal Lahir</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {formatDate(student.birthDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Sekolah</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {student.schoolName || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Jenjang / Kelas</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {student.schoolGrade || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Alamat</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {student.address || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        WhatsApp Orang Tua
                      </p>

                      {student.parentPhone ? (
                        <a
                          href={`https://wa.me/${getWhatsAppNumber(student.parentPhone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700 hover:underline"
                          title="Hubungi orang tua melalui WhatsApp"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 32 32"
                            className="h-5 w-5 fill-current"
                            aria-hidden="true"
                          >
                            <path d="M16 .8A15.1 15.1 0 0 0 3.05 23.66L1 31l7.52-1.97A15.1 15.1 0 1 0 16 .8Zm0 27.46a12.3 12.3 0 0 1-6.28-1.72l-.45-.27-4.47 1.17 1.2-4.36-.29-.46A12.35 12.35 0 1 1 16 28.26Zm6.77-9.25c-.37-.19-2.18-1.08-2.52-1.2-.34-.13-.58-.19-.82.19-.24.37-.95 1.2-1.16 1.44-.22.24-.43.27-.8.08-.37-.19-1.55-.57-2.96-1.83-1.09-.97-1.83-2.17-2.04-2.54-.22-.37-.02-.57.16-.75.16-.16.37-.43.56-.65.19-.21.25-.37.37-.61.13-.24.06-.46-.03-.65-.1-.19-.83-2-.1-2.73.2-.2.45-.25.73-.25h.53c.17 0 .4-.06.62.46.22.52.74 1.81.81 1.94.06.13.1.28.02.47-.08.19-.12.3-.24.47-.12.16-.25.36-.36.48-.12.13-.25.27-.11.52.14.24.64 1.05 1.38 1.7.95.85 1.75 1.11 2 .31.25.19.42.16.58-.03.16-.19.67-.78.85-1.05.18-.27.37-.22.62-.13.25.1 1.57.74 1.84.87.27.13.45.2.52.31.07.12.07.68-.16 1.34-.23.66-1.35 1.28-1.87 1.36-.49.08-1.1.12-1.78-.1Z" />
                          </svg>

                          <span>{student.parentPhone}</span>
                        </a>
                      ) : (
                        <p className="mt-1 text-sm font-medium text-gray-400">
                          Belum tersedia
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINATION */}
            <div className="flex flex-col justify-between gap-3 border-t border-gray-100 p-5 sm:flex-row sm:items-center">
              <p className="text-sm text-gray-500">
                Menampilkan {students.length} dari {pagination.total} siswa
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sebelumnya
                </button>

                <span className="text-sm text-gray-600">
                  {page} / {pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
