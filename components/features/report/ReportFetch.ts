export interface ReportPayload {
  title: string;
  description: string;
  category: string;
  location: string;
  imageUrl: string;
}

// 1. Fungsi Tarik Kategori
export const fetchCategoriesApi = async (token: string) => {
  const res = await fetch("/api/categories", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Gagal mengambil kategori");
  return res.json();
};

// 2. Fungsi Upload Gambar
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

// 3. Fungsi Kirim Laporan
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