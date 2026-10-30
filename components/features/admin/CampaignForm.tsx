"use client";

import { useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import { AdminPanel, AdminNotice, type AdminFeedback } from "./AdminUI";

export default function CampaignForm({ className }: { className?: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<AdminFeedback | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (bannerPreview?.startsWith("blob:")) URL.revokeObjectURL(bannerPreview);
  }, [bannerPreview]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const token = Cookies.get("token");
    if (!token) {
      setMessage({ type: "error", message: "Sesi berakhir. Silakan masuk kembali." });
      setLoading(false);
      return;
    }

    if (!title || !description || !targetAmount || !bannerFile) {
      setMessage({ type: "error", message: "Lengkapi judul, deskripsi, target donasi, dan banner kampanye." });
      setLoading(false);
      return;
    }

    const targetAmountValue = Number(targetAmount);
    if (Number.isNaN(targetAmountValue) || targetAmountValue <= 0) {
      setMessage({ type: "error", message: "Target donasi harus lebih besar dari Rp 0." });
      setLoading(false);
      return;
    }

    try {
      const uploadData = new FormData();
      uploadData.append("file", bannerFile);
      uploadData.append("folder", "campaigns");

      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: uploadData,
      });
      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadResult.message || "Gagal mengunggah banner kampanye");
      }
      const bannerUrl = uploadResult.data?.url;

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, targetAmount: targetAmountValue, bannerUrl }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Gagal membuat kampanye donasi");
      }

      setMessage({ type: "success", message: "Kampanye donasi berhasil dibuat." });
      setTitle("");
      setDescription("");
      setTargetAmount("");
      setBannerFile(null);
      setBannerPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan saat membuat kampanye";
      setMessage({ type: "error", message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminPanel
      className={className}
      id="kampanye-donasi"
      title="Buat kampanye donasi"
      accent="orange"
      description="Lengkapi informasi dan target dana untuk kampanye baru."
    >
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <div className="admin-field">
          <label htmlFor="campaign-title" className="admin-label">Judul kampanye</label>
          <input
            id="campaign-title"
            value={title}
            onChange={event => setTitle(event.target.value)}
            type="text"
            placeholder="Contoh: Bantuan alat praktikum"
            className="admin-input"
            disabled={loading}
            required
          />
        </div>
        <div className="admin-field">
          <label htmlFor="campaign-description" className="admin-label">Deskripsi</label>
          <textarea
            id="campaign-description"
            value={description}
            onChange={event => setDescription(event.target.value)}
            rows={4}
            placeholder="Jelaskan tujuan dan penggunaan dana."
            className="admin-input"
            disabled={loading}
            required
          />
        </div>
        <div className="admin-field">
          <label htmlFor="campaign-target" className="admin-label">Target donasi (Rp)</label>
          <input
            id="campaign-target"
            value={targetAmount}
            onChange={event => setTargetAmount(event.target.value)}
            type="number"
            min="1"
            placeholder="5000000"
            className="admin-input"
            disabled={loading}
            required
          />
        </div>
        <div className="admin-field">
          <label id="campaign-banner-label" htmlFor="campaign-banner" className="admin-label">Banner kampanye</label>
          <label htmlFor="campaign-banner" className="admin-upload">
            <input
              ref={fileRef}
              id="campaign-banner"
              aria-labelledby="campaign-banner-label"
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={loading}
              onChange={event => {
                const file = event.target.files?.[0] ?? null;
                setBannerFile(file);
                setBannerPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            <span className="min-w-0 break-all">
              {bannerFile ? bannerFile.name + " · Ganti gambar" : "Pilih gambar banner"}
            </span>
          </label>
        </div>
        {bannerPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerPreview} alt="Pratinjau banner kampanye" className="h-44 w-full rounded-xl border border-slate-200 object-cover" />
        )}
        <AdminNotice feedback={message} />
        <button type="submit" disabled={loading} className="admin-button admin-button-laporan mt-auto w-full">
          {loading ? "Mengirim..." : "Buat kampanye donasi"}
        </button>
      </form>
    </AdminPanel>
  );
}
