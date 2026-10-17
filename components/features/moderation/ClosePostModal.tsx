"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { AdminDialog, AdminNotice, type AdminFeedback } from "@/components/features/admin/AdminUI";

const REASON_MIN = 10;
const REASON_MAX = 500;

interface ClosePostModalProps {
  postId: string;
  onClose: () => void;
  onClosed?: () => void;
}

export default function ClosePostModal({ postId, onClose, onClosed }: ClosePostModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AdminFeedback | null>(null);

  const trimmedLength = reason.trim().length;
  const isValid = trimmedLength >= REASON_MIN && trimmedLength <= REASON_MAX;

  const handleSubmit = async () => {
    setFeedback(null);
    const trimmed = reason.trim();
    if (trimmed.length < REASON_MIN) {
      setFeedback({ type: "error", message: `Alasan penutupan minimal ${REASON_MIN} karakter.` });
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/admin/posts/${postId}/close`, {
        method: "POST",
        body: JSON.stringify({ reason: trimmed })
      });
      toast.success("Postingan berhasil ditutup.");
      onClosed?.();
      onClose();
    } catch (error) {
      setFeedback({ type: "error", message: getApiErrorMessage(error, "Gagal menutup postingan.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminDialog
      open
      title="Tutup postingan"
      description="Alasan penutupan akan ditampilkan kepada pemilik postingan dan pengunjung lain."
      onClose={onClose}
      busy={isSubmitting}
    >
      <div className="admin-field">
        <label htmlFor="close-post-reason" className="admin-label">Alasan penutupan</label>
        <textarea
          id="close-post-reason"
          aria-describedby="close-post-hint"
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
          rows={4}
          maxLength={REASON_MAX}
          placeholder="Contoh: Postingan ini tidak berkaitan dengan aspirasi kampus dan termasuk promosi/spam."
          disabled={isSubmitting}
          className="admin-input"
        />
        <p id="close-post-hint" className="text-xs text-slate-700 text-right">
          {trimmedLength}/{REASON_MAX} (minimal {REASON_MIN})
        </p>
      </div>
      <div className="mt-4"><AdminNotice feedback={feedback} /></div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="admin-button admin-button-secondary">Batal</button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !isValid}
          className="admin-button admin-button-danger"
        >
          {isSubmitting ? "Memproses..." : "Tutup postingan"}
        </button>
      </div>
    </AdminDialog>
  );
}
