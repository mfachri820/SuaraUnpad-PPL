"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  FiArrowLeft,
  FiArrowUp,
  FiMoreHorizontal,
  FiLoader,
  FiLock,
  FiFlag,
  FiXCircle,
  FiBellOff,
  FiRefreshCw
} from "react-icons/fi";
import CommentSection from "@/components/features/policies/CommentSection";
import ReportContentModal from "@/components/features/moderation/ReportContentModal";
import ClosePostModal from "@/components/features/moderation/ClosePostModal";
import { getAuthorName } from "@/components/features/policies/types";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { Post } from "@/lib/api/types";
import Image from "next/image";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function AspirasiDetailPage() {
  const { id } = useParams();
  const postId = String(id);
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setCurrentUserId(payload.userId);
      setIsAdmin(payload.role === "ADMIN");
    } catch {
      // token tidak valid, biarkan halaman berjalan sebagai anonim
    }
  }, []);

  const fetchDetail = useCallback(async () => {
    try {
      const data = await apiFetch<Post>(`/api/posts/${postId}`);
      setPost(data);
    } catch (err) {
      console.error("Gagal mengambil detail:", err);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) fetchDetail();
  }, [postId, fetchDetail]);

  const handleUpvote = async () => {
    if (!post || post.isClosed || post.kind === "ANNOUNCEMENT") return;
    try {
      await apiFetch(`/api/posts/${postId}/upvote`, { method: "POST" });
      fetchDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal melakukan upvote."));
    }
  };

  const handleReopen = async () => {
    if (!confirm("Buka kembali postingan ini?")) return;
    setMenuOpen(false);
    try {
      await apiFetch(`/api/admin/posts/${postId}/close`, { method: "DELETE" });
      toast.success("Postingan dibuka kembali.");
      fetchDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal membuka kembali postingan."));
    }
  };

  const handleUnpin = async () => {
    if (!confirm("Lepas pin pengumuman ini?")) return;
    setMenuOpen(false);
    try {
      await apiFetch(`/api/admin/posts/${postId}/pin`, { method: "DELETE" });
      toast.success("Pin pengumuman dilepas.");
      fetchDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal melepas pin."));
    }
  };

  // --- PARSER FOTO (untuk data lama yang gambarnya masih markdown di content) ---
  const renderDetailContent = (content: string, imageUrl: string | null) => {
    const imageRegex = /!\[image\]\((.*?)\)/;
    const match = content.match(imageRegex);
    const resolvedImageUrl = imageUrl || match?.[1];
    const textContent = match ? content.replace(imageRegex, "").trim() : content;

    return (
      <>
        {textContent && (
          <p className="text-[21px] leading-snug text-slate-900 mb-6 whitespace-pre-line font-medium">
            {textContent}
          </p>
        )}
        {resolvedImageUrl && (
          <div className="relative w-full h-80 mb-8 rounded-3xl overflow-hidden border border-slate-50 shadow-sm bg-slate-50">
            <Image
              src={resolvedImageUrl}
              alt="Bukti Aspirasi"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
      </>
    );
  };

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <FiLoader className="animate-spin text-[#F99D26]" size={32} />
      </div>
    );

  if (!post)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <h1 className="text-xl font-bold text-slate-400">
          Aspirasi tidak ditemukan
        </h1>
        <button
          onClick={() => router.push("/home")}
          className="mt-4 text-[#F99D26] font-bold hover:underline"
        >
          Kembali ke Beranda
        </button>
      </div>
    );

  const authorName = getAuthorName(post.author);
  const username = authorName.toLowerCase().replace(/\s/g, "");
  const isAnnouncement = post.kind === "ANNOUNCEMENT";
  const isOwner = currentUserId === post.authorId;
  const canReport = !isOwner;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <main className="max-w-150 mx-auto w-full border-x border-slate-50 min-h-screen flex flex-col">
        {/* HEADER */}
        <div className="sticky top-0 backdrop-blur-md z-10 px-4 py-5 flex items-center gap-0">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#2682F9] mb-0 transition"
          >
            <FiArrowLeft /> Kembali
          </Link>
        </div>

        <article className="p-4">
          {isAnnouncement && (
            <div className="mb-4 inline-flex items-center gap-2 bg-blue-600 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">
              📢 Pengumuman Resmi
            </div>
          )}

          {/* USER HEADER */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-[#F99D26] font-bold text-xl uppercase">
                {authorName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-lg leading-tight text-slate-900">
                    {authorName}
                  </p>
                  {post.author.role === "ADMIN" && (
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-[15px]">@{username}</p>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="text-slate-300 hover:text-slate-500 cursor-pointer transition p-1"
              >
                <FiMoreHorizontal size={22} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-20 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 overflow-hidden">
                    {isAdmin && !post.isClosed && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setShowCloseModal(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <FiXCircle /> Tutup Postingan
                      </button>
                    )}
                    {isAdmin && post.isClosed && (
                      <button
                        onClick={handleReopen}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <FiRefreshCw /> Buka Kembali
                      </button>
                    )}
                    {isAdmin && isAnnouncement && post.isPinned && (
                      <button
                        onClick={handleUnpin}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <FiBellOff /> Lepas Pin
                      </button>
                    )}
                    {canReport && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setShowReportModal(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 cursor-pointer"
                      >
                        <FiFlag /> Laporkan
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {isAnnouncement && post.title && (
            <h1 className="text-2xl font-black text-blue-900 mb-3 tracking-tight leading-tight">
              {post.title}
            </h1>
          )}

          {/* KONTEN & GAMBAR */}
          {renderDetailContent(post.content, post.imageUrl)}

          {/* BANNER PENUTUPAN */}
          {post.isClosed && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-600">
              <p className="font-bold flex items-center gap-2 text-slate-700 mb-1">
                <FiLock /> Ditutup oleh {post.closedBy ? getAuthorName(post.closedBy) : "Admin"}
                {post.closedAt &&
                  ` · ${new Date(post.closedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })}`}
              </p>
              {post.closedReason && <p>Alasan: {post.closedReason}</p>}
            </div>
          )}

          {/* METADATA */}
          <div className="py-4 border-y border-slate-50 text-slate-400 text-[15px] flex gap-2 font-medium">
            <span>
              {new Date(post.createdAt).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
            <span>·</span>
            <span>
              {new Date(post.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric"
              })}
            </span>
          </div>

          {!isAnnouncement && (
            <div className="flex justify-start gap-12 py-2 border-b border-slate-50 text-slate-300">
              <button
                onClick={handleUpvote}
                disabled={post.isClosed}
                className={`flex items-center gap-2 transition-all p-2 ${post.isClosed ? "cursor-not-allowed opacity-50" : "hover:cursor-pointer hover:text-[#F99D26]"} ${post.hasUpvoted ? "text-[#F99D26]" : ""}`}
              >
                <FiArrowUp size={24} />
                <span className="font-bold text-slate-600">
                  {post._count?.postUpvotes || 0}
                </span>
              </button>
            </div>
          )}
        </article>

        {/* KOMENTAR */}
        <div className="bg-white mb-10">
          <CommentSection
            postId={post.id}
            title="Balasan"
            placeholder="Tulis balasanmu..."
            readOnly={post.isClosed}
          />
        </div>
      </main>

      {showReportModal && (
        <ReportContentModal
          target={{ postId: post.id }}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showCloseModal && (
        <ClosePostModal
          postId={post.id}
          onClose={() => setShowCloseModal(false)}
          onClosed={fetchDetail}
        />
      )}
    </div>
  );
}
