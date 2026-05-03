"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { 
  FiArrowUp, FiLoader, FiMessageCircle, FiHome, FiBell, 
  FiUser, FiImage, FiX, FiAlertCircle, FiMapPin, FiTrash2 
} from "react-icons/fi";

interface UserData {
  id: string;
  studentProfile?: {
    fullName?: string;
  } | null;
}

interface PostItem {
  id: string;
  authorId: string;
  content: string;
  author: {
    studentProfile?: {
      fullName?: string;
    };
  };
  _count?: {
    postUpvotes?: number;
  };
}

interface ReportItem {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  imageUrl?: string;
  status: string;
  upvoteCount: number;
  createdAt: string;
  isUpvoted?: boolean;
}

export default function AspirasiPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [trendingReports, setTrendingReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [postContent, setPostContent] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [imageUrl, setImageUrl] = useState(""); 
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false); // State biar tombol posting ada loadingnya
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpvotingReport, setIsUpvotingReport] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const fetchPosts = async () => {
    const token = Cookies.get('token');
    const res = await fetch("/api/posts", { headers: { "Authorization": `Bearer ${token}` } });
    const result = await res.json();
    if (res.ok) setPosts(result.data.data);
  };

  const fetchTrending = async () => {
    const token = Cookies.get('token');
    const res = await fetch("/api/reports", { headers: { "Authorization": `Bearer ${token}` } });
    const result = await res.json();
    if (res.ok) setTrendingReports(result.data.data.slice(0, 3));
  };

  useEffect(() => {
    const init = async () => {
      const token = Cookies.get('token');
      if (!token) return router.push('/login');
      const userRes = await fetch("/api/auth/me", { headers: { "Authorization": `Bearer ${token}` } });
      const userDoc = await userRes.json();
      if (userRes.ok) setUserData(userDoc.data);
      await Promise.all([fetchPosts(), fetchTrending()]);
      setIsLoading(false);
    };
    init();
  }, [router]);

  // --- HANDLE UPLOAD GAMBAR ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = Cookies.get('token');
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      const result = await res.json();
      if (res.ok) setImageUrl(result.data.url);
    } catch { alert("Gagal upload gambar"); } finally { setIsUploading(false); }
  };

  // --- HANDLE POSTING (FIXED) ---
    const handleCreatePost = async () => {
        // 1. Validasi input: wajib ada teks atau gambar biar nggak posting kosong
        if (!postContent.trim() && !imageUrl) {
          alert('Isi aspirasi atau foto wajib diisi.');
          return;
        }

        setIsPosting(true);
        try {
          const token = Cookies.get('token');
          if (!token) {
            alert('Silakan login terlebih dahulu.');
            return router.push('/login');
          }

          // 2. Akali Title: Ambil 5 kata pertama dari content sebagai judul
          // Ini supaya backend menerima 'title' yang tidak kosong
          const autoTitle = postContent.trim().split(/\s+/).slice(0, 5).join(" ") || "Aspirasi Baru";

          const res = await fetch("/api/posts", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json", 
              "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({ 
              title: autoTitle, // Sekarang judulnya nggak kosong lagi
              content: postContent.trim() + (imageUrl ? `\n\n![image](${imageUrl})` : "") 
            }),
          });

          const result = await res.json();
          
          if (!res.ok) {
            // Tampilkan pesan error dari backend jika masih gagal
            alert(result.message || 'Gagal posting aspirasi.');
            return;
          }

          // 3. Jika sukses, bersihkan form dan refresh data
          setPostContent("");
          setImageUrl("");
          await fetchPosts();
          
        } catch (error) {
          console.error(error);
          alert("Terjadi kesalahan jaringan.");
        } finally { 
          setIsPosting(false);
        }
      };

  const handleDeletePost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!confirm("Hapus aspirasi ini?")) return;
    const token = Cookies.get('token');
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
    if (res.ok) fetchPosts();
  };

  const handleUpvoteReport = async (reportId: string) => {
    setIsUpvotingReport(true);
    try {
      const token = Cookies.get('token');
      const res = await fetch(`/api/reports/${reportId}/upvote`, { method: "POST", headers: { "Authorization": `Bearer ${token}` } });
      const result = await res.json();
      if (res.ok) {
        await fetchTrending();
        if (selectedReport?.id === reportId) {
          setSelectedReport((prev) =>
            prev
              ? {
                  ...prev,
                  upvoteCount: result.data.action === "upvoted" ? prev.upvoteCount + 1 : prev.upvoteCount - 1,
                  isUpvoted: result.data.action === "upvoted"
                }
              : null
          );
        }
      }
    } catch (e) { console.error(e); } finally { setIsUpvotingReport(false); }
  };

  const handleUpvote = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    const token = Cookies.get('token');
    const res = await fetch(`/api/posts/${postId}/upvote`, { method: "POST", headers: { "Authorization": `Bearer ${token}` } });
    const result = await res.json();
    if (res.ok) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, _count: { ...p._count, postUpvotes: result.data.action === "upvoted" ? p._count.postUpvotes + 1 : p._count.postUpvotes - 1 } } : p));
    }
  };

  const renderContent = (content: string) => {
    const match = content.match(/!\[image\]\((.*?)\)/);
    if (match) {
      const text = content.replace(/!\[image\]\((.*?)\)/, '').trim();
      return (
        <>
          {text && <p className="text-slate-700 text-[15px] mb-3">{text}</p>}
          <div className="rounded-2xl overflow-hidden border border-slate-50 shadow-sm bg-slate-50">
            <img src={match[1]} className="w-full h-auto object-cover max-h-[400px]" alt="Aspirasi" />
          </div>
        </>
      );
    }
    return <p className="text-slate-700 text-[15px] whitespace-pre-line">{content}</p>;
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><FiLoader className="animate-spin text-[#F99D26]" size={32} /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <div className="max-w-[1200px] mx-auto flex flex-grow w-full px-4">
        <nav className="hidden md:flex flex-col w-[275px] sticky top-0 h-screen py-6 pr-4 border-r border-slate-50 space-y-4">
          <div className="text-[#F99D26] text-2xl font-black px-3 mb-4">SuaraUnpad</div>
          <button onClick={() => router.push('/aspirasi')} className="flex items-center gap-4 p-3 rounded-full text-[#F99D26] font-bold text-xl hover:bg-slate-50 transition"><FiHome size={26}/> Beranda</button>
          <button onClick={() => router.push('/notif')} className="flex items-center gap-4 p-3 rounded-full text-slate-600 font-medium text-xl hover:bg-slate-50 transition"><FiBell size={26}/> Notifikasi</button>
          <button onClick={() => router.push('/profil')} className="flex items-center gap-4 p-3 rounded-full text-slate-600 font-medium text-xl hover:bg-slate-50 transition"><FiUser size={26}/> Profil</button>
        </nav>

        <main className="flex-1 max-w-[600px] border-r border-slate-50 min-h-screen">
          <div className="sticky top-0 bg-white/80 backdrop-blur-md px-4 py-4 border-b border-slate-50 font-bold text-xl z-10">Beranda</div>
          <div className="p-4 border-b border-slate-50 flex gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex-shrink-0 flex items-center justify-center font-bold text-[#F99D26] uppercase text-xl">{userData?.studentProfile?.fullName?.charAt(0)}</div>
            <div className="flex-grow">
              <textarea value={postContent} onChange={e => setPostContent(e.target.value)} placeholder="Apa aspirasimu?" className="w-full text-xl outline-none resize-none min-h-[80px] text-slate-900 placeholder-slate-400" />
              
              {imageUrl && (
                <div className="relative mt-2 mb-4 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                  <button onClick={() => setImageUrl("")} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black transition"><FiX size={16} /></button>
                  <img src={imageUrl} alt="preview" className="w-full h-auto object-cover max-h-[300px]" />
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
                  <button onClick={() => fileInputRef.current?.click()} className="text-[#F99D26] p-2 hover:bg-orange-50 rounded-full transition" disabled={isUploading}>
                    {isUploading ? <FiLoader className="animate-spin" /> : <FiImage size={22} />}
                  </button>
                </div>
                <button 
                  onClick={handleCreatePost} 
                  disabled={isPosting || isUploading || (!postContent.trim() && !imageUrl)}
                  className="bg-[#F99D26] text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {isPosting ? "..." : "Posting"}
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {posts.map(post => (
              <div key={post.id} onClick={() => router.push(`/aspirasi/${post.id}`)} className="p-4 hover:bg-slate-50/30 transition cursor-pointer flex gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex-shrink-0 flex items-center justify-center font-bold text-slate-300 uppercase">{post.author.studentProfile?.fullName?.charAt(0)}</div>
                <div className="flex-grow">
                  <div className="font-bold text-slate-900 flex items-center gap-2 mb-1">{post.author.studentProfile?.fullName} <span className="font-normal text-slate-400">· 2 Mei</span></div>
                  {renderContent(post.content)}
                  <div className="flex items-center gap-10 mt-4 text-slate-300">
                    <FiMessageCircle size={18} />
                    <button onClick={e => handleUpvote(e, post.id)} className="flex items-center gap-1 hover:text-[#F99D26] transition"><FiArrowUp size={18} /><span className="text-xs font-bold">{post._count?.postUpvotes || 0}</span></button>
                    {post.authorId === userData?.id && <button onClick={e => handleDeletePost(e, post.id)} className="hover:text-red-400 transition"><FiTrash2 size={18} /></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        <aside className="hidden lg:block w-[325px] py-6 pl-8 sticky top-0 h-fit">
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-50 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-[#F99D26]"><FiAlertCircle size={22} /><h2 className="font-black text-slate-900 uppercase tracking-tight">KAWAL SAMPAI TUNTAS</h2></div>
            <div className="space-y-6">
              {trendingReports.map(report => (
                <div key={report.id} onClick={() => { setSelectedReport(report); setIsModalOpen(true); }} className="cursor-pointer group">
                  <p className="text-[10px] font-black text-orange-500 uppercase mb-1 tracking-widest">{report.category}</p>
                  <p className="font-bold text-[14px] leading-tight text-slate-900 group-hover:text-[#F99D26] transition">{report.title}</p>
                  <p className="text-xs text-slate-500 mt-1 italic">Dukung {report.upvoteCount} mahasiswa lainnya</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="px-3 py-1 bg-orange-100 text-[#F99D26] rounded-full text-[10px] font-black uppercase tracking-widest">{selectedReport.category}</div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-400"><FiX size={24}/></button>
              </div>
              {selectedReport.imageUrl && (
                <div className="mb-6 rounded-2xl overflow-hidden border border-slate-100">
                  <img src={selectedReport.imageUrl} alt="img" className="w-full h-48 object-cover" />
                </div>
              )}
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{selectedReport.title}</h3>
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-4 font-medium"><FiMapPin /> {selectedReport.location}</div>
              <p className="text-slate-600 leading-relaxed mb-8">{selectedReport.description}</p>
              <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Dukungan</span>
                <span className="text-2xl font-black text-[#F99D26]">{selectedReport.upvoteCount}</span>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => handleUpvoteReport(selectedReport.id)}
                disabled={isUpvotingReport}
                className={`flex-1 py-4 rounded-2xl font-bold transition shadow-lg ${selectedReport.isUpvoted ? 'bg-slate-200 text-slate-600' : 'bg-[#F99D26] text-white hover:bg-orange-600'}`}
              >
                {isUpvotingReport ? <FiLoader className="animate-spin mx-auto" /> : selectedReport.isUpvoted ? "Batal Dukung" : "Dukung Isu Ini"}
              </button>
              <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-100 transition">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}