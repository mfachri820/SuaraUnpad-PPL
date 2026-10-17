"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { FiCheck, FiTrash2, FiXCircle } from "react-icons/fi";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { FlagQueueItem, FlagReason, FLAG_REASON_LABELS } from "@/lib/api/types";
import ClosePostModal from "@/components/features/moderation/ClosePostModal";

import { AdminDialog, AdminNotice, AdminPanel } from "./AdminUI";

type QueueType = "comment" | "post";

export default function ModerationQueue({ onActionDone }: { onActionDone?: () => void }) {
  const [type, setType] = useState<QueueType>("comment");
  const [items, setItems] = useState<FlagQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closeTargetId, setCloseTargetId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadQueue = useCallback(async (queueType: QueueType) => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<FlagQueueItem[]>(`/api/admin/flags?type=${queueType}`);
      if (currentRequest === requestId.current) setItems(data);
    } catch (error) {
      if (currentRequest === requestId.current) setError(getApiErrorMessage(error, "Gagal memuat antrean moderasi."));
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue(type);
    return () => { requestId.current += 1; };
  }, [type, loadQueue]);

  const handleRemoveComment = async (id: string) => {
    setPendingAction("remove:" + id);
    setRemoveError(null);
    try {
      await apiFetch(`/api/admin/comments/${id}/remove`, { method: "POST" });
      setRemoveTargetId(null);
      toast.success("Komentar berhasil dihapus.");
      await loadQueue(type);
      onActionDone?.();
    } catch (error) {
      setRemoveError(getApiErrorMessage(error, "Gagal menghapus komentar."));
    } finally {
      setPendingAction(null);
    }
  };

  const handleDismiss = async (item: FlagQueueItem) => {
    setPendingAction("dismiss:" + item.id);
    try {
      await apiFetch("/api/admin/flags/dismiss", {
        method: "POST",
        body: JSON.stringify(item.type === "post" ? { postId: item.id } : { commentId: item.id })
      });
      toast.success("Laporan diabaikan.");
      await loadQueue(type);
      onActionDone?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Gagal mengabaikan laporan."));
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <AdminPanel id="moderasi" title="Antrean moderasi" accent="red" description="Tinjau konten yang dilaporkan sebelum mengambil tindakan.">
      <div className="mb-5 flex gap-5 border-b border-slate-100" aria-label="Jenis konten yang dilaporkan">
        {([{ value: "comment", label: "Komentar" }, { value: "post", label: "Postingan" }] as const).map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setType(tab.value)}
            aria-pressed={type === tab.value}
            disabled={pendingAction !== null}
            className={"min-h-11 cursor-pointer border-b-2 px-1 pb-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wacana disabled:cursor-not-allowed disabled:opacity-50 " + (
              type === tab.value ? "border-moderasi text-moderasi" : "border-transparent text-slate-800 hover:text-slate-950"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p role="status" className="admin-empty">Memuat laporan konten...</p>
      ) : error ? (
        <div className="space-y-3">
          <AdminNotice feedback={{ type: "error", message: error }} />
          <button type="button" onClick={() => loadQueue(type)} className="admin-button admin-button-secondary">Coba lagi</button>
        </div>
      ) : items.length === 0 ? (
        <p className="admin-empty">Tidak ada laporan {type === "comment" ? "komentar" : "postingan"} yang menunggu.</p>
      ) : (
        <ul className="space-y-3" aria-label="Daftar laporan konten">
          {items.map(item => (
            <li key={item.id} className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-moderasi">{item.flagCount} laporan</span>
                <span className="break-words text-xs text-slate-700">Oleh {item.author.displayName}</span>
              </div>
              {item.type === "post" && <h3 className="mb-1 break-words text-sm font-semibold text-slate-900">{item.title}</h3>}
              {item.type === "comment" && item.contextTitle && <p className="mb-1 break-words text-xs text-slate-700">Pada: {item.contextTitle}</p>}
              <p className="mb-3 line-clamp-3 break-words text-sm leading-relaxed text-slate-900">{item.contentSnippet}</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {Object.entries(item.reasons).map(([reason, count]) => (
                  <span key={reason} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800">
                    {FLAG_REASON_LABELS[reason as FlagReason]} ({count})
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {item.type === "comment" && !item.isDeleted && (
                  <button type="button" disabled={pendingAction !== null} onClick={() => { setRemoveError(null); setRemoveTargetId(item.id); }} className="admin-button admin-button-danger">
                    <FiTrash2 aria-hidden="true" /> Hapus komentar
                  </button>
                )}
                {item.type === "post" && !item.isClosed && (
                  <button type="button" disabled={pendingAction !== null} onClick={() => setCloseTargetId(item.id)} className="admin-button admin-button-danger">
                    <FiXCircle aria-hidden="true" /> Tutup postingan
                  </button>
                )}
                <button type="button" disabled={pendingAction !== null} onClick={() => handleDismiss(item)} className="admin-button admin-button-secondary">
                  <FiCheck aria-hidden="true" /> {pendingAction === "dismiss:" + item.id ? "Memproses..." : "Abaikan laporan"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdminDialog
        open={removeTargetId !== null}
        title="Hapus komentar?"
        description="Komentar akan disembunyikan dari percakapan dan ditandai telah dihapus oleh admin."
        onClose={() => setRemoveTargetId(null)}
        busy={pendingAction !== null}
      >
        <AdminNotice feedback={removeError ? { type: "error", message: removeError } : null} />
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setRemoveTargetId(null)} disabled={pendingAction !== null} className="admin-button admin-button-secondary">Batal</button>
          <button type="button" onClick={() => removeTargetId && handleRemoveComment(removeTargetId)} disabled={pendingAction !== null} className="admin-button admin-button-danger">
            {pendingAction ? "Menghapus..." : "Hapus komentar"}
          </button>
        </div>
      </AdminDialog>

      {closeTargetId && (
        <ClosePostModal
          postId={closeTargetId}
          onClose={() => setCloseTargetId(null)}
          onClosed={() => { loadQueue(type); onActionDone?.(); }}
        />
      )}
    </AdminPanel>
  );
}
