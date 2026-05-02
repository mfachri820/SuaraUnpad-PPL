"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { FiArrowLeft, FiMessageCircle, FiArrowUp, FiMoreHorizontal, FiLoader } from "react-icons/fi";
import CommentSection from "@/components/features/policies/CommentSection";

export default function AspirasiDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // --- FUNGSI AMBIL DATA ---
  const fetchDetail = async () => {
    try {
      const token = Cookies.get('token');
      const res = await fetch(`/api/posts/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
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
  };

  useEffect(() => { 
    if (id) fetchDetail(); 
  }, [id]);

  // --- LOGIC UPVOTE (DIBENERIN BIAR JALAN) ---
  const handleUpvote = async () => {
    try {
      const token = Cookies.get('token');
      const res = await fetch(`/api/posts/${id}/upvote`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
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
      const textContent = content.replace(imageRegex, '').trim();
      const extractedUrl = match[1];

      return (
        <>
          {textContent && (
            <p className="text-[21px] leading-snug text-slate-900 mb-6 whitespace-pre-line font-medium">
              {textContent}
            </p>
          )}
          <div className="mb-8 rounded-[24px] overflow-hidden border border-slate-50 shadow-sm bg-slate-50">
            <img 
              src={extractedUrl} 
              alt="Bukti Aspirasi" 
              className="w-full h-auto object-cover max-h-[700px]"
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

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <FiLoader className="animate-spin text-[#F99D26]" size={32} />
    </div>
  );

  if (!post) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <h1 className="text-xl font-bold text-slate-400">Aspirasi tidak ditemukan</h1>
      <button onClick={() => router.push('/aspirasi')} className="mt-4 text-[#F99D26] font-bold hover:underline">
        Kembali ke Beranda
      </button>
    </div>
  );

  const authorName = post.author?.studentProfile?.fullName || "Pengguna";
  const username = authorName.toLowerCase().replace(/\s/g, '');

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <main className="max-w-[600px] mx-auto w-full border-x border-slate-50 min-h-screen flex flex-col">
        
        {/* HEADER */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-3 border-b border-slate-50 flex items-center gap-8">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-50 rounded-full transition">
            <FiArrowLeft size={22} className="text-slate-900" />
          </button>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Postingan</h1>
        </div>

        <article className="p-4">
          {/* USER HEADER */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-[#F99D26] font-bold text-xl uppercase">
                {authorName.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-lg leading-tight text-slate-900">{authorName}</p>
                <p className="text-slate-400 text-[15px]">@{username}</p>
              </div>
            </div>
            <FiMoreHorizontal className="text-slate-300 cursor-pointer" />
          </div>

          {post.title && post.title.trim() !== "" && (
            <h1 className="text-2xl font-black text-slate-900 mb-3 tracking-tight leading-tight">
              {post.title}
            </h1>
          )}
          
          {/* KONTEN & GAMBAR */}
          {renderDetailContent(post.content)}

          {/* METADATA */}
          <div className="py-4 border-y border-slate-50 text-slate-400 text-[15px] flex gap-2 font-medium">
            <span>{new Date(post.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>·</span>
            <span>{new Date(post.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>

          <div className="flex justify-start gap-12 py-2 border-b border-slate-50 text-slate-300">
             <button className="flex items-center gap-2 hover:text-blue-400 transition-all p-2">
               <FiMessageCircle size={24} />
             </button>
             <button 
               onClick={handleUpvote}
               className="flex items-center gap-2 hover:text-[#F99D26] transition-all p-2"
             >
               <FiArrowUp size={24} />
               <span className="font-bold text-slate-600">{post._count?.postUpvotes || 0}</span>
             </button>
          </div>
        </article>
        
        {/* KOMENTAR */}
        <div className="bg-white">
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