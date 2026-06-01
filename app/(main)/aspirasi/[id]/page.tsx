"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  FiArrowLeft,
  FiArrowUp,
  FiMoreHorizontal,
  FiLoader
} from "react-icons/fi";
import CommentSection from "@/components/features/policies/CommentSection";
import Image from "next/image";
import Link from "next/link";

interface PostDetail {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  _count?: {
    postUpvotes?: number;
  };
  author?: {
    studentProfile?: {
      fullName?: string;
    };
  };
}

export default function AspirasiDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // --- FUNGSI AMBIL DATA (Dibungkus useCallback) ---
  const fetchDetail = useCallback(async () => {
    try {
      const token = Cookies.get("token");
      const res = await fetch(`/api/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok) {
        setPost(result.data);
      }
    } catch (err) {
      console.error("Gagal mengambil detail:", err);
    } finally {
      setIsLoading(false);
    }
  }, [id]); // 🌟 useCallback butuh 'id' di sini

  useEffect(() => {
    if (id) fetchDetail();
  }, [id, fetchDetail]); // 🌟 Masukkan fetchDetail ke sini, error linter langsung hilang!

  // --- LOGIC UPVOTE (DIBENERIN BIAR JALAN) ---
  const handleUpvote = async () => {
    try {
      const token = Cookies.get("token");
      const res = await fetch(`/api/posts/${id}/upvote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        // Langsung refresh data detail biar angka upvote-nya update otomatis
        fetchDetail();
      }
    } catch (err) {
      console.error("Upvote gagal:", err);
    }
  };

  // --- PARSER FOTO ---
  const renderDetailContent = (content: string) => {
    const imageRegex = /!\[image\]\((.*?)\)/;
    const match = content.match(imageRegex);

    if (match) {
      const textContent = content.replace(imageRegex, "").trim();
      const extractedUrl = match[1];

      return (
        <>
          {textContent && (
            <p className="text-[21px] leading-snug text-slate-900 mb-6 whitespace-pre-line font-medium">
              {textContent}
            </p>
          )}
          <div className="relative w-full h-80 mb-8 rounded-3xl overflow-hidden border border-slate-50 shadow-sm bg-slate-50">
            <Image
              src={extractedUrl}
              alt="Bukti Aspirasi"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </>
      );
    }
    return (
      <p className="text-[21px] leading-snug text-slate-900 mb-6 whitespace-pre-line font-medium">
        {content}
      </p>
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
          onClick={() => router.push("/aspirasi")}
          className="mt-4 text-[#F99D26] font-bold hover:underline"
        >
          Kembali ke Beranda
        </button>
      </div>
    );

  const authorName = post.author?.studentProfile?.fullName || "Pengguna";
  const username = authorName.toLowerCase().replace(/\s/g, "");

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <main className="max-w-150 mx-auto w-full border-x border-slate-50 min-h-screen flex flex-col">
        {/* HEADER */}
        <div className="sticky top-0 backdrop-blur-md z-10 px-4 py-5  flex items-center gap-0">
          <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#2682F9] mb-0 transition"
        >
          <FiArrowLeft /> Kembali
        </Link>
        </div>

        <article className="p-4">
          {/* USER HEADER */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-[#F99D26] font-bold text-xl uppercase">
                {authorName.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-lg leading-tight text-slate-900">
                  {authorName}
                </p>
                <p className="text-slate-400 text-[15px]">@{username}</p>
              </div>
            </div>
            <FiMoreHorizontal className="text-slate-300 cursor-pointer" />
          </div>

          {/* {post.title && post.title.trim() !== "" && (
            <h1 className="text-2xl font-black text-blue-900 mb-3 tracking-tight leading-tight">
              {post.title}
            </h1>
          )} */}

          {/* KONTEN & GAMBAR */}
          {renderDetailContent(post.content)}

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

          <div className="flex justify-start gap-12 py-2 border-b border-slate-50 text-slate-300">
            <button
              onClick={handleUpvote}
              className="flex items-center gap-2 hover:cursor-pointer hover:text-[#F99D26] transition-all p-2"
            >
              <FiArrowUp size={24} />
              <span className="font-bold text-slate-600">
                {post._count?.postUpvotes || 0}
              </span>
            </button>
          </div>
        </article>

        {/* KOMENTAR */}
        <div className="bg-white mb-10">
          <CommentSection
            postId={post.id}
            title="Balasan"
            placeholder="Tulis balasanmu..."
          />
        </div>
      </main>
    </div>
  );
}
