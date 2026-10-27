"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { ANNOUNCEMENT_PIN_DAYS } from "@/lib/api/types";
import Select from "@/components/ui/Select";
import { AdminPanel, AdminNotice, type AdminFeedback } from "./AdminUI";

export default function AnnouncementForm({ onCreated, className }: { onCreated?: () => void; className?: string }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinDays, setPinDays] = useState<number | "">("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AdminFeedback | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (!file) {
      setImagePreview(null);
      return;
    }
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    if (title.trim().length < 5) {
      setFeedback({ type: "error", message: "Judul pengumuman minimal 5 karakter." });
      return;
    }
    if (!content.trim()) {
      setFeedback({ type: "error", message: "Isi pengumuman wajib diisi." });
      return;
    }
    setIsSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("folder", "announcements");
        const uploadResult = await apiFetch<{ url: string }>("/api/uploads", {
          method: "POST",
          body: formData
        });
        imageUrl = uploadResult.url;
      }

      await apiFetch("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          kind: "ANNOUNCEMENT",
          title: title.trim(),
          content: content.trim(),
          imageUrl,
          pinDays: pinDays === "" ? undefined : pinDays
        })
      });

      setFeedback({ type: "success", message: "Pengumuman berhasil dibuat." });
      setTitle("");
      setContent("");
      setPinDays("");
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onCreated?.();
    } catch (error) {
      setFeedback({ type: "error", message: getApiErrorMessage(error, "Gagal membuat pengumuman.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminPanel id="pengumuman-baru" className={className} title="Buat pengumuman" accent="green" description="Bagikan informasi resmi kepada pengguna Suara MIPA.">
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <div className="admin-field">
          <label htmlFor="announcement-title" className="admin-label">Judul pengumuman</label>
          <input
            id="announcement-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            type="text"
            placeholder="Contoh: Pemeliharaan jaringan kampus"
            className="admin-input"
            minLength={5}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="admin-field">
          <label htmlFor="announcement-content" className="admin-label">Isi pengumuman</label>
          <textarea
            id="announcement-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Tuliskan isi pengumuman..."
            className="admin-input"
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="admin-field">
          <label id="announcement-image-label" htmlFor="announcement-image" className="admin-label">Gambar (opsional)</label>
          <label htmlFor="announcement-image" className="admin-upload">
            <input ref={fileInputRef} id="announcement-image" aria-labelledby="announcement-image-label" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} disabled={isSubmitting} />
            <span className="min-w-0 break-all">{imageFile ? imageFile.name + " · Ganti gambar" : "Pilih gambar pengumuman"}</span>
          </label>
          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagePreview}
              alt="Pratinjau gambar pengumuman"
              className="w-full h-44 object-cover rounded-xl border border-slate-200"
            />
          )}
        </div>
        <div className="admin-field">
          <label htmlFor="announcement-pin" className="admin-label">Durasi pin</label>
          <Select
            id="announcement-pin"
            value={String(pinDays)}
            disabled={isSubmitting}
            aria-describedby="announcement-pin-hint"
            onValueChange={value => setPinDays(value ? Number(value) : "")}
            options={[
              { value: "", label: "Tanpa pin" },
              ...ANNOUNCEMENT_PIN_DAYS.map(days => ({ value: String(days), label: `${days} hari` }))
            ]}
          />
          <p id="announcement-pin-hint" className="text-sm leading-relaxed text-slate-700">Pengumuman yang dipin tampil di bagian atas beranda.</p>
        </div>
        <AdminNotice feedback={feedback} />
        <button
          type="submit"
          disabled={isSubmitting}
          className="admin-button admin-button-pengumuman mt-auto w-full"
        >
          {isSubmitting ? "Mengirim..." : "Buat pengumuman"}
        </button>
      </form>
    </AdminPanel>
  );
}
