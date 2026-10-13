"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { FiX } from "react-icons/fi";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { FlagReason, FLAG_REASON_LABELS } from "@/lib/api/types";

const REASONS: FlagReason[] = ["SPAM", "UJARAN_KEBENCIAN", "PELECEHAN", "HOAKS", "TIDAK_RELEVAN", "LAINNYA"];
const NOTE_MAX = 300;

type FlagTarget = { postId: string; commentId?: undefined } | { commentId: string; postId?: undefined };

interface ReportContentModalProps {
  target: FlagTarget;
  onClose: () => void;
  onReported?: () => void;
}

export default function ReportContentModal({ target, onClose, onReported }: ReportContentModalProps) {
  const [reason, setReason] = useState<FlagReason | "">("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Pilih alasan laporan terlebih dahulu.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch("/api/flags", {
        method: "POST",
        body: JSON.stringify({ ...target, reason, note: note.trim() || undefined })
      });
      toast.success("Laporan terkirim, akan ditinjau admin.");
      onReported?.();
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Gagal mengirim laporan."));
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
          <h2 className="text-lg font-black text-slate-900">Laporkan Konten</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition hover:cursor-pointer"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {REASONS.map((option) => (
            <label
              key={option}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                reason === option ? "border-red-400 bg-red-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="flag-reason"
                value={option}
                checked={reason === option}
                onChange={() => setReason(option)}
                className="accent-red-500"
              />
              <span className="text-sm font-medium text-slate-700">{FLAG_REASON_LABELS[option]}</span>
            </label>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
          rows={3}
          maxLength={NOTE_MAX}
          placeholder="Catatan tambahan (opsional)"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-black focus:ring-2 focus:ring-red-100 focus:outline-none resize-none mb-1"
        />
        <div className="text-[10px] text-slate-400 text-right mb-4">
          {note.length}/{NOTE_MAX}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !reason}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 active:scale-95 hover:cursor-pointer"
        >
          {isSubmitting ? "Mengirim..." : "Kirim Laporan"}
        </button>
      </div>
    </div>
  );
}
