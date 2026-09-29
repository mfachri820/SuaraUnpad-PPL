"use client";

import { useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import { FiSend, FiMessageSquare, FiEdit2, FiTrash2, FiFlag } from "react-icons/fi";
import { ImArrowUp } from "react-icons/im";
import {
  fetchComments,
  createComment,
  updateComment,
  deleteComment,
  toggleUpvoteComment
} from "./CommentFetch";
import { CommentData, ActiveAction, getAuthorName, isAdminAuthor } from "./types";
import ReportContentModal from "@/components/features/moderation/ReportContentModal";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";

const COMMENT_MAX_LENGTH = 1000;

interface CommentItemProps {
  comment: CommentData;
  currentUserId: string | null;
  isAdmin: boolean;
  readOnly: boolean;
  activeAction: ActiveAction;
  setActiveAction: (action: ActiveAction) => void;
  onReply: (parentId: string, content: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onUpvote: (id: string) => void;
  onAdminRemove: (id: string) => void;
  onReportClick: (id: string) => void;
}

const CommentItem = ({
  comment,
  currentUserId,
  isAdmin,
  readOnly,
  activeAction,
  setActiveAction,
  onReply,
  onEdit,
  onDelete,
  onUpvote,
  onAdminRemove,
  onReportClick
}: CommentItemProps) => {
  const [inputText, setInputText] = useState("");

  const isDeleted = Boolean(comment.isDeleted);
  const isAuthor = currentUserId === comment.authorId;
  const isReplyable = !comment.parentId;
  const hasUpvoted = Boolean(comment.hasUpvoted);
  const upvoteCount = Math.max(0, comment._count?.commentUpvotes || 0);
  const canReport = !isAuthor && !isDeleted;
  const canAdminRemove = isAdmin && !isAuthor && !isDeleted;

  const isReplying =
    activeAction?.type === "reply" && activeAction?.commentId === comment.id;
  const isEditing =
    activeAction?.type === "edit" && activeAction?.commentId === comment.id;

  const handleActionToggle = (type: "reply" | "edit") => {
    if (activeAction?.type === type && activeAction?.commentId === comment.id) {
      setActiveAction(null);
    } else {
      setActiveAction({ type, commentId: comment.id });
      setInputText(type === "edit" ? comment.content : "");
    }
  };

  const handleReplyClick = () => {
    if (!isReplyable) {
      toast.error("Hanya bisa membalas komentar utama, tidak bisa membalas balasan.");
      return;
    }
    handleActionToggle("reply");
  };

  const handleSubmit = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    if (trimmed.length > COMMENT_MAX_LENGTH) {
      toast.error(`Komentar maksimal ${COMMENT_MAX_LENGTH} karakter.`);
      return;
    }
    if (isReplying) onReply(comment.id, trimmed);
    if (isEditing) onEdit(comment.id, trimmed);
    setActiveAction(null);
    setInputText("");
  };

  return (
    <div className="flex gap-3 mt-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs uppercase overflow-hidden">
          {isDeleted ? "?" : getAuthorName(comment.author).charAt(0)}
        </div>
        <div className="w-0.5 h-full bg-slate-100 my-1 rounded-full"></div>
      </div>

      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-slate-800">
            {isDeleted ? "[Komentar ini telah dihapus]" : getAuthorName(comment.author)}
          </span>
          {isAuthor && !isDeleted && (
            <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
              Kamu
            </span>
          )}
          {!isDeleted && isAdminAuthor(comment.author) && (
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
              Admin
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="my-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <textarea
              autoFocus
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full text-sm text-slate-700 bg-white border border-blue-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm resize-none"
              rows={2}
              maxLength={COMMENT_MAX_LENGTH}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="text-[10px] text-slate-400">
                {inputText.length}/{COMMENT_MAX_LENGTH}
              </div>
              <button
                onClick={handleSubmit}
                className="text-xs font-bold text-white bg-[#2682F9] px-4 py-2 rounded-lg hover:bg-blue-600 transition shadow-sm active:scale-95 hover:cursor-pointer"
              >
                Simpan
              </button>
              <button
                onClick={() => setActiveAction(null)}
                className="text-xs font-bold text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-lg transition hover:cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <p
            className={`text-sm leading-relaxed mb-2 ${isDeleted ? "text-slate-400 italic" : "text-slate-700"}`}
          >
            {comment.content}
          </p>
        )}

        {!isDeleted && (
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
            <button
              onClick={() => onUpvote(comment.id)}
              className={`flex items-center gap-1.5 transition hover:cursor-pointer ${hasUpvoted ? "text-[#F99D26]" : "hover:text-[#F99D26]"}`}
            >
              <ImArrowUp className="text-sm" /> {upvoteCount}
            </button>
            {!readOnly && (
              <button
                onClick={handleReplyClick}
                className={`flex items-center gap-1.5 transition hover:cursor-pointer ${isReplying ? "text-[#2682F9]" : isReplyable ? "hover:text-slate-800" : "text-slate-300 cursor-not-allowed"}`}
              >
                <FiMessageSquare /> {isReplying ? "Batal Balas" : "Balas"}
              </button>
            )}
            {!readOnly && isAuthor && (
              <>
                <button
                  onClick={() => handleActionToggle("edit")}
                  className={`flex items-center gap-1 transition hover:cursor-pointer ${isEditing ? "text-[#2682F9]" : "hover:text-blue-600"}`}
                >
                  <FiEdit2 /> {isEditing ? "Batal Edit" : "Edit"}
                </button>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="flex items-center gap-1 hover:text-red-500 hover:cursor-pointer"
                >
                  <FiTrash2 /> Hapus
                </button>
              </>
            )}
            {canReport && (
              <button
                onClick={() => onReportClick(comment.id)}
                className="flex items-center gap-1 hover:text-red-500 hover:cursor-pointer"
              >
                <FiFlag /> Laporkan
              </button>
            )}
            {canAdminRemove && (
              <button
                onClick={() => onAdminRemove(comment.id)}
                className="flex items-center gap-1 hover:text-red-500 hover:cursor-pointer"
              >
                <FiTrash2 /> Hapus (admin)
              </button>
            )}
          </div>
        )}

        {!readOnly && isReplying && (
          <div className="flex gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="w-8 h-8 rounded-full bg-slate-50 shrink-0 border border-slate-100 flex items-center justify-center">
              <FiMessageSquare className="text-slate-300 text-xs" />
            </div>
            <div className="flex-1">
              <textarea
                autoFocus
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={2}
                placeholder={`Balas ${getAuthorName(comment.author)}...`}
                className="w-full bg-slate-50 border text-black border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#2682F9] focus:outline-none resize-none transition-all shadow-inner"
                maxLength={COMMENT_MAX_LENGTH}
              />
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>{inputText.length}/{COMMENT_MAX_LENGTH}</span>
                <button
                  onClick={handleSubmit}
                  className="text-[#2682F9] hover:text-blue-700 p-1 active:scale-90 transition-transform hover:cursor-pointer"
                >
                  <FiSend className="text-xl" />
                </button>
              </div>
            </div>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                readOnly={readOnly}
                activeAction={activeAction}
                setActiveAction={setActiveAction}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpvote={onUpvote}
                onAdminRemove={onAdminRemove}
                onReportClick={onReportClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function CommentSection({
  postId,
  policyId,
  title = "Diskusi Terbuka",
  placeholder = "Bagaimana pendapatmu tentang wacana ini?",
  readOnly = false
}: {
  postId?: string;
  policyId?: string;
  title?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchComments(postId, policyId);
      setComments(data);
      const token = Cookies.get("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.userId);
        setIsAdmin(payload.role === "ADMIN");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [postId, policyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateTree = (
    list: CommentData[],
    id: string,
    updater: (c: CommentData) => CommentData
  ): CommentData[] => {
    return list.map((c) => {
      if (c.id === id) return updater(c);
      if (c.replies)
        return { ...c, replies: updateTree(c.replies, id, updater) };
      return c;
    });
  };

  const handleMainSubmit = async () => {
    const trimmed = newCommentText.trim();
    if (!trimmed) return;
    if (trimmed.length > COMMENT_MAX_LENGTH) {
      toast.error(`Komentar maksimal ${COMMENT_MAX_LENGTH} karakter.`);
      return;
    }
    try {
      await createComment(trimmed, postId, policyId);
      setNewCommentText("");
      loadData();
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    try {
      await createComment(content, postId, policyId, parentId);
      loadData();
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
    }
  };

  const handleEdit = async (id: string, content: string) => {
    try {
      setComments((prev) => updateTree(prev, id, (c) => ({ ...c, content })));
      await updateComment(id, content);
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus komentar ini?")) return;
    try {
      setComments((prev) =>
        updateTree(prev, id, (c) => ({
          ...c,
          isDeleted: true,
          content: "[Komentar ini telah dihapus]"
        }))
      );
      await deleteComment(id);
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
      loadData();
    }
  };

  const handleAdminRemove = async (id: string) => {
    if (!confirm("Hapus komentar ini sebagai admin?")) return;
    try {
      setComments((prev) =>
        updateTree(prev, id, (c) => ({
          ...c,
          isDeleted: true,
          content: "[Komentar ini telah dihapus]"
        }))
      );
      await apiFetch(`/api/admin/comments/${id}/remove`, { method: "POST" });
      toast.success("Komentar berhasil dihapus.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus komentar."));
      loadData();
    }
  };

  const handleUpvote = async (id: string) => {
    try {
      setComments((prev) =>
        updateTree(prev, id, (c) => {
          const currentHasUpvoted = Boolean(c.hasUpvoted);
          const currentCount = c._count?.commentUpvotes || 0;
          return {
            ...c,
            hasUpvoted: !currentHasUpvoted,
            _count: {
              ...c._count,
              commentUpvotes: currentHasUpvoted
                ? Math.max(0, currentCount - 1)
                : currentCount + 1
            }
          };
        })
      );
      await toggleUpvoteComment(id);
    } catch (error) {
      console.error(error);
      loadData();
    }
  };

  if (isLoading)
    return (
      <div className="animate-pulse h-20 bg-slate-100 rounded-xl mt-6"></div>
    );

  return (
    <div className="mt-6 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-800 mb-6">
        {title} ({comments.length})
      </h3>
      {readOnly ? (
        <div className="mb-8 p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-500 text-center font-medium">
          🔒 Diskusi ditutup
        </div>
      ) : (
        <div className="flex gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0"></div>
          <div className="flex-1">
            <textarea
              value={newCommentText}
              onChange={(e) => {
                setNewCommentText(e.target.value);
                setActiveAction(null);
              }}
              rows={2}
              placeholder={placeholder}
              maxLength={COMMENT_MAX_LENGTH}
              className="w-full bg-slate-50 border text-black border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-[#2682F9] focus:outline-none resize-none"
            />
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
              <span>{newCommentText.length}/{COMMENT_MAX_LENGTH}</span>
              <button
                onClick={handleMainSubmit}
                className="text-[#2682F9] hover:text-blue-700 p-1 transition-transform active:scale-95 hover:cursor-pointer"
              >
                <FiSend className="text-xl" />
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {comments.length === 0 ? (
          <p className="text-center text-slate-400 text-sm italic py-4">
            Jadilah yang pertama berkomentar!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              readOnly={readOnly}
              activeAction={activeAction}
              setActiveAction={setActiveAction}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUpvote={handleUpvote}
              onAdminRemove={handleAdminRemove}
              onReportClick={setReportTargetId}
            />
          ))
        )}
      </div>

      {reportTargetId && (
        <ReportContentModal
          target={{ commentId: reportTargetId }}
          onClose={() => setReportTargetId(null)}
        />
      )}
    </div>
  );
}
