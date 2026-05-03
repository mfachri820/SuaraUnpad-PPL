"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { 
  FiArrowUp, FiLoader, FiMoreHorizontal, FiTrash2 
} from "react-icons/fi";

// --- INTERFACES ---
interface StudentProfile {
  fullName: string;
}

interface UserData {
  id: string;
  studentProfile?: StudentProfile;
}

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  authorId: string;
  author: {
    studentProfile: StudentProfile;
  };
  _count: {
    postUpvotes: number;
  };
}

export default function AspirasiPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const router = useRouter();

  const fetchPosts = async () => {
    try {
      const token = Cookies.get('token');
      const res = await fetch("/api/posts", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok) setPosts(result.data.data as Post[] || []);
    } catch {
      console.error("Gagal load feed");
    }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        const token = Cookies.get('token');
        if (!token) return router.push('/login');
        
        const userRes = await fetch("/api/auth/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const userDoc = await userRes.json();
        if (userRes.ok) setUserData(userDoc.data as UserData);

        await fetchPosts();
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, [router]);

  const handleCreatePost = async () => {
    if (!postTitle.trim() || !postContent.trim()) return;
    setIsPosting(true);
    try {
      const token = Cookies.get('token');
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title: postTitle.trim(), content: postContent.trim() }),
      });
      if (res.ok) {
        setPostTitle("");
        setPostContent("");
        await fetchPosts();
      }
    } catch (error) {
      console.error(error);
      alert("Gagal posting");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Hapus aspirasi ini?")) return;
    try {
      const token = Cookies.get('token');
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch {
      alert("Gagal menghapus");
    }
  };

  const handleUpvote = async (postId: string) => {
    try {
      const token = Cookies.get('token');
      const res = await fetch(`/api/posts/${postId}/upvote`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.status === "success") {
        setPosts(prev => prev.map(p => 
          p.id === postId ? { 
            ...p, 
            _count: { 
              ...p._count, 
              postUpvotes: result.data.action === "upvoted" ? p._count.postUpvotes + 1 : p._count.postUpvotes - 1 
            } 
          } : p
        ));
      }
    } catch (error) { console.error(error); }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <FiLoader className="animate-spin text-[#F99D26]" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-24 font-sans text-slate-900">
      <main className="max-w-xl mx-auto w-full border-x border-slate-100 min-h-screen">
        <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-3 border-b border-slate-50 font-bold text-xl">
          Beranda
        </div>

        {/* Create Post Area */}
        <div className="px-4 py-4 border-b border-slate-50 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center font-bold text-[#F99D26] uppercase">
            {userData?.studentProfile?.fullName?.charAt(0) || "U"}
          </div>
          <div className="flex-grow space-y-3">
            <input
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="Judul aspirasi"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-[#2682F9] focus:ring-2 focus:ring-[#2682F9]/20"
            />
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Jelaskan aspirasi kamu..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 outline-none resize-none min-h-[100px] focus:border-[#2682F9] focus:ring-2 focus:ring-[#2682F9]/20"
            />
            <div className="flex justify-end">
              <button
                onClick={handleCreatePost}
                disabled={!postTitle.trim() || !postContent.trim() || isPosting}
                className="px-5 py-1.5 bg-[#F99D26] text-white rounded-full font-bold text-sm disabled:opacity-50 hover:bg-orange-500 transition-colors"
              >
                {isPosting ? "..." : "Posting"}
              </button>
            </div>
          </div>
        </div>

        {/* Feed Posts */}
        <div className="divide-y divide-slate-50">
          {posts.map((post) => (
            <div key={post.id} className="p-4 hover:bg-slate-50/20 transition-all">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex-shrink-0 flex items-center justify-center font-bold text-[#F99D26] uppercase">
                  {post.author.studentProfile.fullName.charAt(0)}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">{post.author.studentProfile.fullName}</span>
                      <span className="text-slate-400 text-xs">· {new Date(post.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    {userData?.id === post.authorId ? (
                      <button onClick={() => handleDeletePost(post.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <FiTrash2 size={14} />
                      </button>
                    ) : (
                      <FiMoreHorizontal className="text-slate-400" />
                    )}
                  </div>
                  <h2 className="mt-3 text-base font-bold text-slate-900">{post.title}</h2>
                  <p className="mt-1 text-sm text-slate-700 leading-relaxed">{post.content}</p>
                  
                  <div className="flex items-center gap-6 mt-3 text-slate-400">
                    <button 
                      onClick={() => handleUpvote(post.id)} 
                      className="flex items-center gap-1.5 group hover:text-orange-500 transition-colors"
                    >
                      <FiArrowUp size={18} strokeWidth={2.5} />
                      <span className="text-xs font-bold">{post._count.postUpvotes}</span>
                    </button>
                    <button
                      onClick={() => router.push(`/aspirasi/${post.id}`)}
                      className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-[#2682F9] transition"
                    >
                      Komentar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}