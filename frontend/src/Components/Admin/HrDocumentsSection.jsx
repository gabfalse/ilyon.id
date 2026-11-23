import { useEffect, useState } from "react";

import {
  getHrDocumentsByProfile,
  uploadHrDocument,
  getHrDocumentDownloadUrl,
  verifyHrDocument,
  updateHrDocument,
  replaceHrDocumentFile,
  deleteHrDocument,
} from "../../Services/HrDocumentService";

const initialForm = {
  documentType: "identity",
  documentName: "",
  documentNumber: "",
  issuedDate: "",
  expiryDate: "",
  notes: "",
};

const documentTypes = [
  { value: "identity", label: "Identitas" },
  { value: "education", label: "Pendidikan" },
  { value: "certification", label: "Sertifikasi" },
  { value: "cv", label: "CV" },
  { value: "employment_contract", label: "Kontrak Kerja" },
  { value: "employment_letter", label: "Surat Kerja" },
  { value: "other", label: "Lainnya" },
];

const statusLabels = {
  pending: "Menunggu Verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function HrDocumentsSection({
  hrPersonProfileId,
  personLabel = "Personel",
}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState(initialForm);
  const [documentFile, setDocumentFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const [replacingId, setReplacingId] = useState(null);
  const [replacementFile, setReplacementFile] = useState(null);
  const [replacing, setReplacing] = useState(false);

  const [downloadingId, setDownloadingId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function loadDocuments() {
    if (!hrPersonProfileId) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getHrDocumentsByProfile(hrPersonProfileId);

      if (!result?.success) {
        throw new Error(result?.message || "Gagal mengambil dokumen HR.");
      }

      setDocuments(
        Array.isArray(result.data) ? result.data : result.data?.documents || [],
      );
    } catch (err) {
      setError(err.message || "Gagal mengambil dokumen HR.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [hrPersonProfileId]);

  function handleUploadFormChange(event) {
    const { name, value } = event.target;

    setUploadForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!documentFile) {
      setError("Pilih file dokumen terlebih dahulu.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const result = await uploadHrDocument({
        ...uploadForm,
        hrPersonProfileId,
        document: documentFile,
      });

      if (!result?.success) {
        throw new Error(result?.message || "Upload dokumen gagal.");
      }

      setSuccess("Dokumen berhasil diunggah.");
      setUploadForm(initialForm);
      setDocumentFile(null);
      setShowUploadForm(false);

      await loadDocuments();
    } catch (err) {
      setError(err.message || "Upload dokumen gagal.");
    } finally {
      setUploading(false);
    }
  }

  function handleStartEdit(document) {
    setEditingId(document.id);

    setEditForm({
      documentType: document.documentType || "other",
      documentName: document.documentName || "",
      documentNumber: document.documentNumber || "",
      issuedDate: document.issuedDate ? document.issuedDate.slice(0, 10) : "",
      expiryDate: document.expiryDate ? document.expiryDate.slice(0, 10) : "",
      notes: document.notes || "",
    });
  }

  async function handleUpdateDocument(event) {
    event.preventDefault();

    setSavingEdit(true);
    setError("");
    setSuccess("");

    try {
      const result = await updateHrDocument(editingId, editForm);

      if (!result?.success) {
        throw new Error(result?.message || "Gagal memperbarui dokumen.");
      }

      setSuccess("Informasi dokumen berhasil diperbarui.");
      setEditingId(null);

      await loadDocuments();
    } catch (err) {
      setError(err.message || "Gagal memperbarui dokumen.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleReplaceDocument(id) {
    if (!replacementFile) {
      setError("Pilih file pengganti terlebih dahulu.");
      return;
    }

    setReplacing(true);
    setError("");
    setSuccess("");

    try {
      const result = await replaceHrDocumentFile(id, replacementFile);

      if (!result?.success) {
        throw new Error(result?.message || "Gagal mengganti file.");
      }

      setSuccess("File dokumen berhasil diganti.");
      setReplacingId(null);
      setReplacementFile(null);

      await loadDocuments();
    } catch (err) {
      setError(err.message || "Gagal mengganti file.");
    } finally {
      setReplacing(false);
    }
  }

  async function handleDownload(id) {
    setDownloadingId(id);
    setError("");

    try {
      const result = await getHrDocumentDownloadUrl(id);

      if (!result?.success) {
        throw new Error(result?.message || "Gagal mendapatkan link unduhan.");
      }

      const downloadUrl = result.data?.downloadUrl;

      if (!downloadUrl) {
        throw new Error("Link unduhan tidak tersedia.");
      }

      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err.message || "Gagal mengunduh dokumen.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleVerification(id, verificationStatus) {
    const confirmation =
      verificationStatus === "verified"
        ? "Verifikasi dokumen ini?"
        : "Tolak dokumen ini?";

    if (!window.confirm(confirmation)) return;

    setVerifyingId(id);
    setError("");
    setSuccess("");

    try {
      const result = await verifyHrDocument(id, verificationStatus);

      if (!result?.success) {
        throw new Error(result?.message || "Gagal memperbarui verifikasi.");
      }

      setSuccess("Status verifikasi berhasil diperbarui.");

      await loadDocuments();
    } catch (err) {
      setError(err.message || "Gagal memperbarui verifikasi.");
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Yakin ingin menghapus dokumen ini?")) return;

    setDeletingId(id);
    setError("");
    setSuccess("");

    try {
      const result = await deleteHrDocument(id);

      if (!result?.success) {
        throw new Error(result?.message || "Gagal menghapus dokumen.");
      }

      setSuccess(
        result.data?.retryRequired
          ? "Data dokumen dihapus. Pembersihan file Storage perlu dicoba kembali."
          : "Dokumen berhasil dihapus.",
      );

      await loadDocuments();
    } catch (err) {
      setError(err.message || "Gagal menghapus dokumen.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!hrPersonProfileId) {
    return (
      <section className="mt-6 rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-800">Dokumen HR</h3>
        <p className="mt-2 text-sm text-red-600">
          Profil HR {personLabel} belum tersedia.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-xl border border-gray-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Dokumen HR</h3>
          <p className="text-sm text-gray-500">
            Kelola dokumen administrasi {personLabel.toLowerCase()}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowUploadForm((prev) => !prev);
            setError("");
            setSuccess("");
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showUploadForm ? "Tutup Form" : "Tambah Dokumen"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {showUploadForm && (
        <form
          onSubmit={handleUpload}
          className="mt-5 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <h4 className="font-semibold text-gray-800">Upload Dokumen</h4>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Jenis Dokumen
              </label>
              <select
                name="documentType"
                value={uploadForm.documentType}
                onChange={handleUploadFormChange}
                className="w-full rounded-lg border border-gray-300 p-2"
                required
              >
                {documentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Nama Dokumen
              </label>
              <input
                name="documentName"
                value={uploadForm.documentName}
                onChange={handleUploadFormChange}
                className="w-full rounded-lg border border-gray-300 p-2"
                minLength={2}
                maxLength={180}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Nomor Dokumen
              </label>
              <input
                name="documentNumber"
                value={uploadForm.documentNumber}
                onChange={handleUploadFormChange}
                className="w-full rounded-lg border border-gray-300 p-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Tanggal Terbit
              </label>
              <input
                type="date"
                name="issuedDate"
                value={uploadForm.issuedDate}
                onChange={handleUploadFormChange}
                className="w-full rounded-lg border border-gray-300 p-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Tanggal Kedaluwarsa
              </label>
              <input
                type="date"
                name="expiryDate"
                value={uploadForm.expiryDate}
                onChange={handleUploadFormChange}
                className="w-full rounded-lg border border-gray-300 p-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                File Dokumen (PDF/JPG/PNG, maks. 5 MB)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) =>
                  setDocumentFile(event.target.files?.[0] || null)
                }
                className="w-full rounded-lg border border-gray-300 bg-white p-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Catatan</label>
            <textarea
              name="notes"
              value={uploadForm.notes}
              onChange={handleUploadFormChange}
              rows={3}
              className="w-full rounded-lg border border-gray-300 p-2"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {uploading ? "Mengunggah..." : "Simpan Dokumen"}
          </button>
        </form>
      )}

      <div className="mt-5 space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500">Memuat dokumen HR...</p>
        ) : documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Belum ada dokumen HR.
          </div>
        ) : (
          documents.map((document) => (
            <div
              key={document.id}
              className="rounded-xl border border-gray-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {document.documentName}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {documentTypes.find(
                      (type) => type.value === document.documentType,
                    )?.label || document.documentType}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    document.verificationStatus === "verified"
                      ? "bg-green-100 text-green-700"
                      : document.verificationStatus === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {statusLabels[document.verificationStatus || "pending"] ||
                    "Menunggu Verifikasi"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-2">
                <p>Nomor: {document.documentNumber || "-"}</p>
                <p>Tanggal terbit: {formatDate(document.issuedDate)}</p>
                <p>Kedaluwarsa: {formatDate(document.expiryDate)}</p>
                <p>Catatan: {document.notes || "-"}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(document.id)}
                  disabled={downloadingId === document.id}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {downloadingId === document.id ? "Memuat..." : "Unduh"}
                </button>

                <button
                  type="button"
                  onClick={() => handleStartEdit(document)}
                  className="rounded-lg border border-blue-300 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                >
                  Edit Informasi
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReplacingId(
                      replacingId === document.id ? null : document.id,
                    );
                    setReplacementFile(null);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Ganti File
                </button>

                {document.verificationStatus !== "verified" && (
                  <button
                    type="button"
                    onClick={() => handleVerification(document.id, "verified")}
                    disabled={verifyingId === document.id}
                    className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    Verifikasi
                  </button>
                )}

                {document.verificationStatus !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => handleVerification(document.id, "rejected")}
                    disabled={verifyingId === document.id}
                    className="rounded-lg bg-orange-500 px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    Tolak
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(document.id)}
                  disabled={deletingId === document.id}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  {deletingId === document.id ? "Menghapus..." : "Hapus"}
                </button>
              </div>

              {editingId === document.id && (
                <form
                  onSubmit={handleUpdateDocument}
                  className="mt-4 space-y-3 rounded-lg bg-gray-50 p-4"
                >
                  <h5 className="font-semibold">Edit Informasi Dokumen</h5>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <select
                      value={editForm.documentType}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          documentType: event.target.value,
                        })
                      }
                      className="rounded-lg border border-gray-300 p-2"
                    >
                      {documentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>

                    <input
                      value={editForm.documentName}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          documentName: event.target.value,
                        })
                      }
                      placeholder="Nama dokumen"
                      className="rounded-lg border border-gray-300 p-2"
                      required
                    />

                    <input
                      value={editForm.documentNumber}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          documentNumber: event.target.value,
                        })
                      }
                      placeholder="Nomor dokumen"
                      className="rounded-lg border border-gray-300 p-2"
                    />

                    <input
                      type="date"
                      value={editForm.issuedDate}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          issuedDate: event.target.value,
                        })
                      }
                      className="rounded-lg border border-gray-300 p-2"
                    />

                    <input
                      type="date"
                      value={editForm.expiryDate}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          expiryDate: event.target.value,
                        })
                      }
                      className="rounded-lg border border-gray-300 p-2"
                    />
                  </div>

                  <textarea
                    value={editForm.notes}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        notes: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Catatan"
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {savingEdit ? "Menyimpan..." : "Simpan"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}

              {replacingId === document.id && (
                <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-4">
                  <h5 className="font-semibold">Ganti File Dokumen</h5>

                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) =>
                      setReplacementFile(event.target.files?.[0] || null)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white p-2"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleReplaceDocument(document.id)}
                      disabled={replacing}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {replacing ? "Mengganti..." : "Simpan File Baru"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReplacingId(null);
                        setReplacementFile(null);
                      }}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
