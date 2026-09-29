"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { ANNOUNCEMENT_PIN_DAYS } from "@/lib/api/types";

export default function AnnouncementForm({ onCreated }: { onCreated?: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinDays, setPinDays] = useState<number | "">("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (title.trim().length < 5) {
      toast.error("Judul pengumuman minimal 5 karakter.");
      return;
    }
    if (!content.trim()) {
      toast.error("Isi pengumuman wajib diisi.");
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

      toast.success("Pengumuman berhasil dibuat.");
      setTitle("");
      setContent("");
      setPinDays("");
      setImageFile(null);
      setImagePreview(null);
      onCreated?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Gagal membuat pengumuman."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm mb-8 text-left">
      <h2 className="text-2xl font-bold text-blue-600 mb-4">Buat Pengumuman</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Judul</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            type="text"
            placeholder="Contoh: Pemeliharaan Jaringan Kampus"
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-black outline-none focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Isi Pengumuman</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Tuliskan isi pengumuman..."
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-black outline-none focus:border-blue-500 resize-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Gambar (opsional)</label>
          <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500 hover:border-blue-500 hover:text-blue-500 transition">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            {imagePreview ? "Ganti gambar" : "Pilih atau seret file gambar"}
          </label>
          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-44 object-cover rounded-2xl mt-2 border border-zinc-200"
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Durasi Pin</label>
          <select
            value={pinDays}
            onChange={(e) => setPinDays(e.target.value ? Number(e.target.value) : "")}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-black outline-none focus:border-blue-500"
          >
            <option value="">Tanpa pin</option>
            {ANNOUNCEMENT_PIN_DAYS.map((days) => (
              <option key={days} value={days}>
                {days} hari
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 hover:cursor-pointer"
        >
          {isSubmitting ? "Mengirim..." : "Buat Pengumuman"}
        </button>
      </form>
    </div>
  );
}
