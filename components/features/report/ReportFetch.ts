export interface ReportPayload {
  title: string;
  description: string;
  category: string;
  location: string;
  imageUrl: string;
}

// Data untuk kategori (PR FIX)
export const REPORT_CATEGORIES = [
  { id: "INFRASTRUCTURE", label: "Infrastructure" },
  { id: "CLEANLINESS", label: "Cleanliness" },
  { id: "SECURITY", label: "Security" },
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

  if (!res.ok) throw new Error("Gagal mengunggah foto ke server");
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

  if (!res.ok) throw new Error("Gagal menyimpan data laporan");
  return res.json();
};