"use client";

import { useState } from "react";
import { createPolicy } from "@/components/features/policies/PolicyFetch";
import { AdminPanel, AdminNotice, type AdminFeedback } from "./AdminUI";

export default function PolicyCreateForm({ onCreated, className }: { onCreated: () => Promise<void>; className?: string }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<AdminFeedback | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!title || !content) {
      setMessage({ type: "error", message: "Judul dan isi wacana wajib diisi." });
      setLoading(false);
      return;
    }

    try {
      await createPolicy(title, content);
      setMessage({ type: "success", message: "Wacana berhasil disimpan sebagai draft. Aktifkan melalui Kelola status wacana." });
      setTitle("");
      setContent("");
      await onCreated();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal membuat wacana";
      setMessage({ type: "error", message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminPanel
      className={className}
      id="wacana-baru"
      title="Buat wacana"
      accent="blue"
      description="Wacana disimpan sebagai draft sebelum ditampilkan kepada pengguna."
    >
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <div className="admin-field">
          <label htmlFor="policy-title" className="admin-label">Judul wacana</label>
          <input
            id="policy-title"
            value={title}
            onChange={event => setTitle(event.target.value)}
            type="text"
            placeholder="Contoh: Perpanjangan jam buka perpustakaan"
            className="admin-input"
            disabled={loading}
            required
          />
        </div>
        <div className="admin-field">
          <label htmlFor="policy-content" className="admin-label">Isi wacana</label>
          <textarea
            id="policy-content"
            value={content}
            onChange={event => setContent(event.target.value)}
            rows={5}
            placeholder="Jelaskan usulan yang ingin didiskusikan."
            className="admin-input"
            disabled={loading}
            required
          />
        </div>
        <AdminNotice feedback={message} />
        <button type="submit" disabled={loading} className="admin-button admin-button-wacana mt-auto w-full">
          {loading ? "Menyimpan..." : "Simpan draft wacana"}
        </button>
      </form>
    </AdminPanel>
  );
}
