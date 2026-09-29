"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { FiX } from "react-icons/fi";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";

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

  const trimmedLength = reason.trim().length;
  const isValid = trimmedLength >= REASON_MIN && trimmedLength <= REASON_MAX;

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < REASON_MIN) {
      toast.error(`Alasan penutupan minimal ${REASON_MIN} karakter.`);
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
      toast.error(getApiErrorMessage(error, "Gagal menutup postingan."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">Tutup Postingan</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition hover:cursor-pointer"
          >
            <FiX size={20} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Alasan ini akan ditampilkan ke pemilik postingan dan pengunjung lain.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
          rows={4}
          maxLength={REASON_MAX}
          placeholder="Contoh: Postingan ini tidak berkaitan dengan aspirasi kampus dan termasuk promosi/spam."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-black focus:ring-2 focus:ring-orange-100 focus:outline-none resize-none mb-1"
        />
        <div className="text-[10px] text-slate-400 text-right mb-4">
          {trimmedLength}/{REASON_MAX} (minimal {REASON_MIN})
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !isValid}
          className="w-full bg-[#F99D26] hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 active:scale-95 hover:cursor-pointer"
        >
          {isSubmitting ? "Memproses..." : "Tutup Postingan"}
        </button>
      </div>
    </div>
  );
}
