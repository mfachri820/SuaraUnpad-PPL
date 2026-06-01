"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  FiMapPin,
  FiX,
  FiImage,
  FiLoader,
  FiMessageCircle,
  FiArrowUp,
  FiTrash2,
  FiAlertCircle,
  FiClock
} from "react-icons/fi";
import { ImArrowUp } from "react-icons/im";
import { toast } from "react-hot-toast";

// 🌟 Import Komponen External
import { Policy } from "@/components/features/policies/types";
import PolicyCard from "@/components/features/policies/PolicyCard";
import CampaignCarousel from "@/components/features/donations/CampaignCarousel";
import {
  Report,
  getUserIdFromToken,
  fetchHomeReports,
  toggleUpvoteApi
} from "./HomeFetch";
import { fetchPolicies } from "@/components/features/policies/PolicyFetch";

// 🌟 Interface Tambahan dari Aspirasi
interface UserData {
  id: string;
  role?: string;
  studentProfile?: { fullName?: string } | null;
}

interface PostItem {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: { studentProfile?: { fullName?: string } };
  _count?: { postUpvotes?: number };
}

// 🌟 Tipe Data Gabungan untuk Super Feed Timeline
type FeedItem =
  | { type: "POST"; data: PostItem; date: number }
  | { type: "REPORT"; data: Report; date: number }
  | { type: "POLICY"; data: Policy; date: number };

export default function HomeFeed() {
  const router = useRouter();

  // --- STATE DATA ---
  const [userData, setUserData] = useState<UserData | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);

  // --- STATE UI & LOADING ---
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "ALL" | "ASPIRASI" | "LAPORAN" | "WACANA"
  >("ALL");

  const POST_MAX_LENGTH = 500;

  // --- STATE FORM POSTING ---
  const [postContent, setPostContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE MODAL LAPORAN ---
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isUpvotingReport, setIsUpvotingReport] = useState(false);

  // 🚀 FETCHING
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const token = Cookies.get("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const currentUserId = getUserIdFromToken(token);

        const userRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (userRes.ok) {
          const userDoc = await userRes.json();
          setUserData(userDoc.data);
        }

        const fetchPostsReq = fetch("/api/posts", {
          headers: { Authorization: `Bearer ${token}` }
        }).then((res) => res.json());

        const [reportsData, policiesData, postsData] = await Promise.all([
          fetchHomeReports(token, currentUserId),
          fetchPolicies(),
          fetchPostsReq
        ]);

        setReports(reportsData);
        setPolicies(policiesData);
        if (postsData.data?.data) setPosts(postsData.data.data);
      } catch (e) {
        console.error("Error fetching data:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [router]);

  // 🛠️ LOGIKA PENGGABUNGAN TIMELINE
  const getSuperFeed = (): FeedItem[] => {
    const combined: FeedItem[] = [];
    if (activeTab === "ALL" || activeTab === "ASPIRASI") {
      combined.push(
        ...posts.map((p) => ({
          type: "POST" as const,
          data: p,
          date: new Date(p.createdAt || 0).getTime()
        }))
      );
    }
    if (activeTab === "ALL" || activeTab === "LAPORAN") {
      combined.push(
        ...reports.map((r) => ({
          type: "REPORT" as const,
          data: r,
          date: new Date(r.createdAt).getTime()
        }))
      );
    }
    if (activeTab === "ALL" || activeTab === "WACANA") {
      combined.push(
        ...policies.map((p) => ({
          type: "POLICY" as const,
          data: p,
          date: new Date(
            (p as Policy & { createdAt?: string }).createdAt || 0
          ).getTime()
        }))
      );
    }
    return combined.sort((a, b) => b.date - a.date);
  };

  // 📸 HANDLE UPLOAD GAMBAR
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = Cookies.get("token");
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("berhasil Upload");
        setImageUrl(result.data.url);
      }
    } catch {
      toast.error("Gagal upload gambar");
    } finally {
      setIsUploading(false);
    }
  };

  // 📝 HANDLE BUAT ASPIRASI BARU
  const handleCreatePost = async () => {
    const trimmedPost = postContent.trim();
    if (!trimmedPost && !imageUrl) {
      toast.error("Isi aspirasi atau foto wajib diisi.");
      return;
    }
    if (trimmedPost.length > POST_MAX_LENGTH) {
      toast.error(`Aspirasi maksimal ${POST_MAX_LENGTH} karakter.`);
      return;
    }
    setIsPosting(true);
    try {
      const token = Cookies.get("token");
      const autoTitle =
        trimmedPost.split(/\s+/).slice(0, 5).join(" ") ||
        "Aspirasi Baru";
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: autoTitle,
          content:
            trimmedPost + (imageUrl ? `\n\n![image](${imageUrl})` : "")
        })
      });
      if (!res.ok) {
        toast.error("Gagal posting aspirasi.");
        return;
      }

      setPostContent("");
      setImageUrl("");
      const postsRes = await fetch("/api/posts", {
        headers: { Authorization: `Bearer ${token}` }
      }).then((res) => res.json());
      if (postsRes.data?.data) setPosts(postsRes.data.data);
    } catch (e) {
      console.error(e);
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsPosting(false);
    }
  };

  // 👍 HANDLE UPVOTE ASPIRASI (POST)
  const handlePostUpvote = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    const token = Cookies.get("token");
    const res = await fetch(`/api/posts/${postId}/upvote`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await res.json();
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const currentUpvotes = p._count?.postUpvotes ?? 0;
          return {
            ...p,
            _count: {
              ...p._count,
              postUpvotes:
                result.data.action === "upvoted"
                  ? currentUpvotes + 1
                  : currentUpvotes - 1
            }
          };
        })
      );
    }
  };

  // 🗑️ HANDLE DELETE ASPIRASI
  const handleDeletePost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!confirm("Hapus aspirasi ini?")) return;
    const token = Cookies.get("token");
    const res = await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const postsRes = await fetch("/api/posts", {
        headers: { Authorization: `Bearer ${token}` }
      }).then((res) => res.json());
      if (postsRes.data?.data) setPosts(postsRes.data.data);
    }
  };

  // 🗑️ HANDLE DELETE LAPORAN (ADMIN)
  const handleDeleteReport = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    if (!confirm("Hapus laporan ini?")) return;
    const token = Cookies.get("token");
    if (!token) return;
    const res = await fetch(`/api/reports/${reportId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const currentUserId = getUserIdFromToken(token);
      const refreshedReports = await fetchHomeReports(token, currentUserId);
      setReports(refreshedReports);
    }
  };

  // 🚀 HANDLE UPVOTE LAPORAN (HOME & MODAL)
  const handleReportUpvote = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    setIsUpvotingReport(true);
    try {
      const token = Cookies.get("token");
      await toggleUpvoteApi(reportId, token);

      setReports((current) =>
        current.map((r) => {
          if (r.id === reportId) {
            const isUpvoted = r.hasUpvoted;
            return {
              ...r,
              hasUpvoted: !isUpvoted,
              upvoteCount: isUpvoted ? r.upvoteCount - 1 : r.upvoteCount + 1
            };
          }
          return r;
        })
      );

      setSelectedReport((current) => {
        if (current && current.id === reportId) {
          const isUpvoted = current.hasUpvoted;
          return {
            ...current,
            hasUpvoted: !isUpvoted,
            upvoteCount: isUpvoted
              ? current.upvoteCount - 1
              : current.upvoteCount + 1
          };
        }
        return current;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpvotingReport(false);
    }
  };

  // 🎨 HELPER RENDERERS
  const renderPostContent = (content: string) => {
    const match = content.match(/!\[image\]\((.*?)\)/);
    if (match) {
      const text = content.replace(/!\[image\]\((.*?)\)/, "").trim();
      return (
        <>
          {text && <p className="text-slate-700 text-[15px] mb-3">{text}</p>}
          <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 mt-2">
            <Image
              src={match[1]}
              alt="Aspirasi"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </>
      );
    }
    return (
      <p className="text-slate-700 text-[15px] whitespace-pre-line">
        {content}
      </p>
    );
  };

  type FeedAuthor = {
    email?: string | null;
    studentProfile?: { fullName?: string } | null;
    lecturerProfile?: { fullName?: string } | null;
    adminProfile?: { fullName?: string } | null;
  };

  const getAuthorName = (author: FeedAuthor | null | undefined) => {
    if (!author) return "Anonim";
    return (
      author.studentProfile?.fullName ||
      author.lecturerProfile?.fullName ||
      author.adminProfile?.fullName ||
      author.email?.split("@")[0] ||
      "User"
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { bg: string; text: string; label: string }
    > = {
      SUBMITTED: {
        bg: "bg-orange-100",
        text: "text-orange-700",
        label: "MENUNGGU"
      },
      VERIFIED: {
        bg: "bg-purple-100",
        text: "text-purple-700",
        label: "DIVERIFIKASI"
      },
      IN_PROGRESS: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        label: "DIPROSES"
      },
      RESOLVED: { bg: "bg-green-100", text: "text-green-700", label: "SELESAI" }
    };
    const s = statusMap[status];
    if (!s) return null;
    return (
      <span
        className={`${s.bg} ${s.text} px-2 py-1 rounded-md text-[10px] font-black tracking-wide uppercase`}
      >
        {s.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(dateString));
  };

  const superFeedData = getSuperFeed();

  if (isLoading)
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <FiLoader className="animate-spin text-[#F99D26]" size={40} />
      </div>
    );

  return (
    /* 🌟 SOLUSI LAYOUT: Diubah jadi 1 kolom besar terpusat (justify-center) */
    <div className="mx-auto flex w-full justify-center px-4 py-6 sm:px-6 lg:px-8">
      {/* 🚀 MAIN FEED (Super Feed Terpadu) */}
      <main className="w-full max-w-2xl bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        {/* 1. CAROUSEL DONASI (Paling Atas) */}
        <div className="border-b border-slate-100 pb-4 p-4 bg-slate-50/50">
          <CampaignCarousel />
        </div>

        {/* 2. KOTAK INPUT ASPIRASI */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-50 shrink-0 flex items-center justify-center font-bold text-[#F99D26] uppercase text-xl">
            {userData?.studentProfile?.fullName?.charAt(0) || "U"}
          </div>
          <div className="grow">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              maxLength={POST_MAX_LENGTH}
              placeholder="Apa aspirasimu hari ini?"
              className="w-full text-xl outline-none resize-none min-h-16 text-slate-900 placeholder-slate-400 pt-2"
            />
            <div className="text-xs text-slate-400 mt-2">
              {postContent.length}/{POST_MAX_LENGTH} karakter
            </div>
            {imageUrl && (
              <div className="relative mt-2 mb-4 w-full h-72 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <button
                  onClick={() => setImageUrl("")}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black transition z-10"
                >
                  <FiX size={16} />
                </button>
                <Image
                  src={imageUrl}
                  alt="preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-slate-50">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#2682F9] p-2 hover:cursor-pointer hover:bg-blue-50 rounded-full transition"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    <FiImage size={20} />
                  )}
                </button>
              </div>
              <button
                onClick={handleCreatePost}
                disabled={
                  isPosting || isUploading || (!postContent.trim() && !imageUrl)
                }
                className="bg-[#2682F9] text-white px-6 py-2 rounded-full font-bold hover:cursor-pointer hover:bg-[#1f6bd0] transition"
              >
                {isPosting ? "..." : "Post"}
              </button>
            </div>
          </div>
        </div>

        {/* 3. STICKY TABS */}
        <div className="flex border-b border-slate-100 sticky top-16 md:top-20 bg-white/95 backdrop-blur-md z-20">
          {(["ALL", "ASPIRASI", "LAPORAN", "WACANA"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-sm font-bold transition border-b-4 ${activeTab === tab ? "text-[#F99D26] border-[#F99D26] hover:cursor-pointer" : "text-slate-400 border-transparent hover:cursor-pointer hover:bg-slate-50"}`}
            >
              {tab === "ALL"
                ? "Semua"
                : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* 4. SUPER FEED TIMELINE */}
        <div className="divide-y divide-slate-100">
          {superFeedData.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-medium">
              Belum ada aktivitas di kategori ini.
            </div>
          ) : (
            superFeedData.map((item, index) => {
              // 🎨 RENDER ASPIRASI
              if (item.type === "POST") {
                const post = item.data;
                return (
                  <div
                    key={`post-${post.id}-${index}`}
                    onClick={() => router.push(`/aspirasi/${post.id}`)}
                    className="p-4 sm:p-6 hover:bg-slate-50/50 transition cursor-pointer flex gap-3 sm:gap-4"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 shrink-0 flex items-center justify-center font-bold text-slate-400 uppercase">
                      {post.author.studentProfile?.fullName?.charAt(0) || "U"}
                    </div>
                    <div className="grow">
                      <div className="font-bold text-slate-900 flex flex-wrap items-center gap-2 mb-1">
                        {post.author.studentProfile?.fullName || "Anonim"}
                        <span className="font-medium text-slate-400 text-sm">
                          · Aspirasi
                        </span>
                      </div>
                      {renderPostContent(post.content)}
                      <div className="flex items-center gap-8 mt-4 text-slate-400">
                        <button className="hover:cursor-pointer flex items-center gap-1.5 hover:text-[#2682F9] transition">
                          <FiMessageCircle size={18} />
                        </button>
                        <button
                          onClick={(e) => handlePostUpvote(e, post.id)}
                          className="hover:cursor-pointer flex items-center gap-1.5 hover:text-[#F99D26] transition"
                        >
                          <FiArrowUp size={18} />
                          <span className="text-sm font-bold">
                            {post._count?.postUpvotes || 0}
                          </span>
                        </button>
                        {(post.authorId === userData?.id || userData?.role === "ADMIN") && (
                          <button
                            onClick={(e) => handleDeletePost(e, post.id)}
                            className="hover:cursor-pointer hover:text-red-400 transition ml-auto"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // 🎨 RENDER LAPORAN
              if (item.type === "REPORT") {
                const report = item.data;
                return (
                  <div
                    key={`report-${report.id}-${index}`}
                    onClick={() => setSelectedReport(report)}
                    className="p-4 sm:p-6 hover:bg-slate-50/50 transition cursor-pointer flex flex-col gap-3 border-l-4 border-l-[#F99D26]"
                  >
                    <div className="font-bold text-[#F99D26] text-xs uppercase tracking-widest mb-3 flex items-center gap-1">
                      <FiAlertCircle /> LAPORAN SIVITAS
                    </div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-50 shrink-0 flex items-center justify-center font-bold text-[#F99D26] uppercase border border-orange-100">
                          {getAuthorName(report.author).charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            {getAuthorName(report.author)}
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            {formatDate(report.createdAt)}{" "}
                            <span className="font-medium text-slate-400">
                              · Laporan
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(report.status)}
                        {userData?.role === "ADMIN" && (
                          <button
                            onClick={(e) => handleDeleteReport(e, report.id)}
                            className="text-slate-400 hover:text-red-400 transition"
                            aria-label="Hapus laporan"
                            title="Hapus laporan"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-1">
                      <h3 className="text-base font-bold text-slate-900 leading-tight mb-1">
                        {report.title}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-[#F99D26] mb-2 font-medium uppercase tracking-wider">
                        <FiMapPin /> {report.location}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {report.description}
                      </p>
                    </div>

                    {report.imageUrl &&
                      report.imageUrl !== "https://res.cloudinary.com/..." && (
                        <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-100 mt-2">
                          <Image
                            src={report.imageUrl}
                            alt={report.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}

                    <div className="mt-2 pt-3 border-t border-slate-50 flex items-center text-slate-400">
                      <button
                        onClick={(e) => handleReportUpvote(e, report.id)}
                        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition ${
                          report.hasUpvoted
                            ? "bg-orange-100 text-[#F99D26] hover:cursor-pointer"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:cursor-pointer"
                        }`}
                      >
                        <ImArrowUp
                          className={report.hasUpvoted ? "text-[#F99D26]" : ""}
                        />
                        {report.upvoteCount}
                      </button>
                    </div>
                  </div>
                );
              }

              // 🎨 RENDER WACANA (POLICY)
              if (item.type === "POLICY") {
                return (
                  <div
                    key={`policy-${item.data.id}-${index}`}
                    className="p-4 sm:p-6 hover:bg-slate-50/50 border-l-4 border-l-[#2682F9]"
                  >
                    <div className="font-bold text-[#2682F9] text-xs uppercase tracking-widest mb-3 flex items-center gap-1">
                      <FiAlertCircle /> WACANA KEBIJAKAN
                    </div>
                    <PolicyCard policy={item.data} />
                  </div>
                );
              }
              return null;
            })
          )}
        </div>
      </main>

      {/* 🚀 MODAL DETAIL LAPORAN */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 py-10  bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-4 right-4 z-10 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition hover:cursor-pointer"
            >
              <FiX className="text-xl" />
            </button>

            {selectedReport.imageUrl &&
            selectedReport.imageUrl !== "https://res.cloudinary.com/..." ? (
              <div className="relative w-full h-64 bg-slate-100 shrink-0">
                <Image
                  src={selectedReport.imageUrl}
                  alt={selectedReport.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="h-6 shrink-0 bg-orange-500 w-full"></div>
            )}

            <div className="p-6 sm:p-8">
              <div className="flex justify-between items-center mb-4">
                {getStatusBadge(selectedReport.status)}
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <FiClock /> {formatDate(selectedReport.createdAt)}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2">
                {selectedReport.title}
              </h2>
              <div className="flex items-center gap-2 text-sm text-[#F99D26] font-bold mb-6">
                <FiMapPin className="text-lg" /> {selectedReport.location}
              </div>
              <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedReport.description}
                </p>
              </div>
              <div className="bg-orange-50 rounded-2xl p-4 flex items-center justify-between border border-orange-100 mb-6">
                <span className="text-sm font-bold text-orange-600 uppercase tracking-wider">
                  Total Dukungan
                </span>
                <span className="text-2xl font-black text-[#F99D26]">
                  {selectedReport.upvoteCount}
                </span>
              </div>
              <button
                onClick={(e) => handleReportUpvote(e, selectedReport.id)}
                disabled={isUpvotingReport}
                className={`w-full py-4 rounded-2xl font-bold transition ${selectedReport.hasUpvoted ? "bg-slate-200 text-slate-600 hover:bg-slate-300 hover:cursor-pointer" : "hover:cursor-pointer bg-[#F99D26] text-white hover:bg-[#ec9626]"}`}
              >
                {isUpvotingReport ? (
                  <FiLoader className="animate-spin mx-auto" size={24} />
                ) : selectedReport.hasUpvoted ? (
                  "Batal Dukung"
                ) : (
                  "Dukung Isu Ini"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
