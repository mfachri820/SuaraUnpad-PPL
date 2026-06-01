export interface ReportPayload {
  title: string;
  description: string;
  category: string;
  location: string;
  imageUrl: string;
}

// Data untuk kategori (PR FIX)
export const REPORT_CATEGORIES = [
  { id: "POTHOLE", label: "Pothole" },
  { id: "CRACK", label: "Crack" },
  { id: "CORROSION", label: "Corrosion" },
  { id: "SAMPAH", label: "Sampah" },
  { id: "OTHER", label: "Other" },
];

// 1. Fungsi Upload Gambar
export const uploadImage = async (file: File, token: string) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/uploads", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    let errorMessage = "Gagal mengunggah foto ke server";
    try {
      const errorJson = await res.json();
      if (errorJson?.message) errorMessage = errorJson.message;
    } catch {
      // Keep default message when response is not JSON.
    }
    throw new Error(errorMessage);
  }
  return res.json();
};

// 2. Fungsi Kirim Laporan
export const submitReport = async (payload: ReportPayload, token: string) => {
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorMessage = "Gagal menyimpan data laporan";
    try {
      const errorJson = await res.json();
      if (errorJson?.message) errorMessage = errorJson.message;
    } catch {
      // Keep default message when response is not JSON.
    }
    throw new Error(errorMessage);
  }
  return res.json();
};