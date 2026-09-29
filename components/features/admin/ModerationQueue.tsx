"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FiCheck, FiTrash2, FiXCircle, FiFlag } from "react-icons/fi";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { FlagQueueItem, FlagReason, FLAG_REASON_LABELS } from "@/lib/api/types";
import ClosePostModal from "@/components/features/moderation/ClosePostModal";

type QueueType = "comment" | "post";

export default function ModerationQueue({ onActionDone }: { onActionDone?: () => void }) {
  const [type, setType] = useState<QueueType>("comment");
  const [items, setItems] = useState<FlagQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closeTargetId, setCloseTargetId] = useState<string | null>(null);

  const loadQueue = useCallback(async (queueType: QueueType) => {
    setIsLoading(true);
    try {
      const data = await apiFetch<FlagQueueItem[]>(`/api/admin/flags?type=${queueType}`);
      setItems(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Gagal memuat antrean moderasi."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue(type);
  }, [type, loadQueue]);

  const handleRemoveComment = async (id: string) => {
    if (!confirm("Hapus komentar ini?")) return;
    try {
      await apiFetch(`/api/admin/comments/${id}/remove`, { method: "POST" });
      toast.success("Komentar berhasil dihapus.");
      loadQueue(type);
      onActionDone?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus komentar."));
    }
  };

  const handleDismiss = async (item: FlagQueueItem) => {
    try {
      await apiFetch("/api/admin/flags/dismiss", {
        method: "POST",
        body: JSON.stringify(item.type === "post" ? { postId: item.id } : { commentId: item.id })
      });
      toast.success("Laporan diabaikan.");
      loadQueue(type);
      onActionDone?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Gagal mengabaikan laporan."));
    }
  };

  return (
    <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm mb-8 text-left">
      <h2 className="text-2xl font-bold text-red-500 mb-4 flex items-center gap-2">
        <FiFlag /> Antrean Moderasi
      </h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setType("comment")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition hover:cursor-pointer ${type === "comment" ? "bg-red-500 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
        >
          Komentar
        </button>
        <button
          onClick={() => setType("post")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition hover:cursor-pointer ${type === "post" ? "bg-red-500 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
        >
          Postingan
        </button>
      </div>

      {isLoading ? (
        <div className="text-zinc-400 text-sm py-6 text-center">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="text-zinc-400 text-sm py-6 text-center">Tidak ada laporan yang menunggu.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="border border-zinc-100 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-red-500 uppercase tracking-wide">
                  {item.flagCount} laporan
                </span>
                <span className="text-xs text-zinc-400">{item.author.displayName}</span>
              </div>
              {item.type === "post" && (
                <p className="text-sm font-bold text-zinc-800 mb-1">{item.title}</p>
              )}
              {item.type === "comment" && item.contextTitle && (
                <p className="text-xs text-zinc-400 mb-1">di: {item.contextTitle}</p>
              )}
              <p className="text-sm text-zinc-600 mb-2 line-clamp-3">{item.contentSnippet}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {Object.entries(item.reasons).map(([reason, count]) => (
                  <span
                    key={reason}
                    className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2 py-1 rounded-md"
                  >
                    {FLAG_REASON_LABELS[reason as FlagReason]} ({count})
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                {item.type === "comment" && !item.isDeleted && (
                  <button
                    onClick={() => handleRemoveComment(item.id)}
                    className="flex items-center gap-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg transition hover:cursor-pointer"
                  >
                    <FiTrash2 /> Hapus
                  </button>
                )}
                {item.type === "post" && !item.isClosed && (
                  <button
                    onClick={() => setCloseTargetId(item.id)}
                    className="flex items-center gap-1 text-xs font-bold text-white bg-[#F99D26] hover:bg-orange-500 px-3 py-2 rounded-lg transition hover:cursor-pointer"
                  >
                    <FiXCircle /> Tutup
                  </button>
                )}
                <button
                  onClick={() => handleDismiss(item)}
                  className="flex items-center gap-1 text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 px-3 py-2 rounded-lg transition hover:cursor-pointer"
                >
                  <FiCheck /> Abaikan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {closeTargetId && (
        <ClosePostModal
          postId={closeTargetId}
          onClose={() => setCloseTargetId(null)}
          onClosed={() => {
            loadQueue(type);
            onActionDone?.();
          }}
        />
      )}
    </div>
  );
}
