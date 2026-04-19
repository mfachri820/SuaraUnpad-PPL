"use client";

import { useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import { FiSend, FiMessageSquare, FiEdit2, FiTrash2 } from "react-icons/fi";
import { ImArrowUp } from "react-icons/im";
import {
  fetchComments,
  createComment,
  updateComment,
  deleteComment,
  toggleUpvoteComment
} from "./CommentFetch";
import { Author, CommentData, ActiveAction } from "./types"; // 🌟 Import Tipe

interface CommentItemProps {
  comment: CommentData;
  currentUserId: string | null;
  activeAction: ActiveAction;
  setActiveAction: (action: ActiveAction) => void;
  onReply: (parentId: string, content: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onUpvote: (id: string) => void;
}

const getAuthorName = (author: Author) => {
  if (!author) return "Anonim";
  return (
    author.studentProfile?.fullName ||
    author.lecturerProfile?.fullName ||
    author.adminProfile?.fullName ||
    "User"
  );
};

const CommentItem = ({
  comment,
  currentUserId,
  activeAction,
  setActiveAction,
  onReply,
  onEdit,
  onDelete,
  onUpvote
}: CommentItemProps) => {
  const [inputText, setInputText] = useState("");

  const isSoftDeleted = comment.content === "[Komentar ini telah dihapus]";
  const isAuthor = currentUserId === comment.authorId;
  const hasUpvoted = comment.hasOwnProperty("hasUpvoted")
    ? comment.hasUpvoted
    : comment.commentUpvotes?.some((vote) => vote.userId === currentUserId) ||
      false;
  const upvoteCount = Math.max(0, comment._count?.commentUpvotes || 0);

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

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    if (isReplying) onReply(comment.id, inputText);
    if (isEditing) onEdit(comment.id, inputText);
    setActiveAction(null);
    setInputText("");
  };

  return (
    <div className="flex gap-3 mt-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs uppercase overflow-hidden">
          {isSoftDeleted ? "?" : getAuthorName(comment.author).charAt(0)}
        </div>
        <div className="w-0.5 h-full bg-slate-100 my-1 rounded-full"></div>
      </div>

      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-slate-800">
            {isSoftDeleted
              ? "[Komentar ini telah dihapus]"
              : getAuthorName(comment.author)}
          </span>
          {isAuthor && !isSoftDeleted && (
            <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
              Kamu
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
            />
            <div className="flex gap-2 mt-2">
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
            className={`text-sm leading-relaxed mb-2 ${isSoftDeleted ? "text-slate-400 italic" : "text-slate-700"}`}
          >
            {comment.content}
          </p>
        )}

        {!isSoftDeleted && (
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
            <button
              onClick={() => onUpvote(comment.id)}
              className={`flex items-center gap-1.5 transition hover:cursor-pointer ${hasUpvoted ? "text-[#F99D26]" : "hover:text-[#F99D26]"}`}
            >
              <ImArrowUp className="text-sm" /> {upvoteCount}
            </button>
            <button
              onClick={() => handleActionToggle("reply")}
              className={`flex items-center gap-1.5 transition hover:cursor-pointer ${isReplying ? "text-[#2682F9]" : "hover:text-slate-800"}`}
            >
              <FiMessageSquare /> {isReplying ? "Batal Balas" : "Balas"}
            </button>
            {isAuthor && (
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
          </div>
        )}

        {isReplying && (
          <div className="flex gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="w-8 h-8 rounded-full bg-slate-50 shrink-0 border border-slate-100 flex items-center justify-center">
              <FiMessageSquare className="text-slate-300 text-xs" />
            </div>
            <div className="flex-1 relative">
              <textarea
                autoFocus
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={2}
                placeholder={`Balas ${getAuthorName(comment.author)}...`}
                className="w-full bg-slate-50 border text-black border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#2682F9] focus:outline-none resize-none transition-all shadow-inner"
              />
              <button
                onClick={handleSubmit}
                className="absolute bottom-3 right-3 text-[#2682F9] hover:text-blue-700 p-1 active:scale-90 transition-transform hover:cursor-pointer"
              >
                <FiSend className="text-xl" />
              </button>
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
                activeAction={activeAction}
                setActiveAction={setActiveAction}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpvote={onUpvote}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function CommentSection({ policyId }: { policyId: string }) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchComments(policyId);
      setComments(data);
      const token = Cookies.get("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.userId);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [policyId]);

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
    if (!newCommentText.trim()) return;
    try {
      await createComment(newCommentText, policyId);
      setNewCommentText("");
      loadData();
    } catch (error) {
      if (error instanceof Error) alert(error.message);
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    try {
      await createComment(content, policyId, parentId);
      loadData();
    } catch (error) {
      if (error instanceof Error) alert(error.message);
    }
  };

  const handleEdit = async (id: string, content: string) => {
    try {
      setComments((prev) => updateTree(prev, id, (c) => ({ ...c, content })));
      await updateComment(id, content);
    } catch (error) {
      if (error instanceof Error) alert(error.message);
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus komentar ini?")) return;
    try {
      setComments((prev) =>
        updateTree(prev, id, (c) => ({
          ...c,
          content: "[Komentar ini telah dihapus]"
        }))
      );
      await deleteComment(id);
    } catch (error) {
      if (error instanceof Error) alert(error.message);
      loadData();
    }
  };

  const handleUpvote = async (id: string) => {
    try {
      setComments((prev) =>
        updateTree(prev, id, (c) => {
          const currentHasUpvoted = c.hasOwnProperty("hasUpvoted")
            ? c.hasUpvoted
            : c.commentUpvotes?.some((vote) => vote.userId === currentUserId) ||
              false;
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
        Diskusi Terbuka ({comments.length})
      </h3>
      <div className="flex gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0"></div>
        <div className="flex-1 relative">
          <textarea
            value={newCommentText}
            onChange={(e) => {
              setNewCommentText(e.target.value);
              setActiveAction(null);
            }}
            rows={2}
            placeholder="Bagaimana pendapatmu tentang wacana ini?"
            className="w-full bg-slate-50 border text-black border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#2682F9] focus:outline-none resize-none"
          />
          <button
            onClick={handleMainSubmit}
            className="absolute bottom-3 right-3 text-[#2682F9] hover:text-blue-700 p-1 transition-transform active:scale-95 hover:cursor-pointer"
          >
            <FiSend className="text-xl" />
          </button>
        </div>
      </div>
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
              activeAction={activeAction}
              setActiveAction={setActiveAction}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUpvote={handleUpvote}
            />
          ))
        )}
      </div>
    </div>
  );
}
