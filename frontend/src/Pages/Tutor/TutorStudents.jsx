import { useCallback, useEffect, useState } from "react";
import { getMyTutorStudents } from "../../Services/TutorService";

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
                      <h3 className="font-semibold text-gray-900">
                        {student.fullName}
                      </h3>

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
                      <p className="text-xs text-gray-500">Kota</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {student.city || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Nomor Telepon</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {student.studentPhone || "-"}
                      </p>
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
