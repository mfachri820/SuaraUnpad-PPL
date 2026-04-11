"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { 
  FiMessageSquare, FiArrowUp, FiLoader, FiMoreHorizontal,
  FiShare2, FiSmile, FiBarChart2, FiX 
} from "react-icons/fi";

export default function AspirasiPage() {
  const [userData, setUserData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [postContent, setPostContent] = useState("");
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  
  // UI States
  const [showPolicySelect, setShowPolicySelect] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const router = useRouter();

  const fetchPosts = async () => {
    try {
      const token = Cookies.get('token');
      const res = await fetch("/api/posts", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok) {
        // Kita akses result.data.data karena API kamu membungkus array-nya di sana
        setPosts(result.data.data || []);
      }
    } catch (error) {
      console.error("Gagal load feed");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = Cookies.get('token');
        
        // Ambil Data User
        const userRes = await fetch("/api/auth/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const userDoc = await userRes.json();
        if (userRes.ok) setUserData(userDoc.data);

        // Ambil Daftar Kebijakan untuk Dropdown
        const policyRes = await fetch("/api/policies", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const policyDoc = await policyRes.json();
        if (policyRes.ok) setPolicies(policyDoc.data.data || []);

        // Ambil Feed Postingan (SEMUA USER)
        await fetchPosts();

      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;
    setIsPosting(true);

    try {
      const token = Cookies.get('token');
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          title: postContent.slice(0, 40) + "...",
          content: postContent,
          policyId: selectedPolicyId
        }),
      });

      if (res.ok) {
        // Langsung ambil data terbaru agar postingan kita muncul paling atas
        await fetchPosts();
        setPostContent("");
        setSelectedPolicyId(null);
        setShowPolicySelect(false);
      }
    } catch (error) {
      alert("Gagal memposting");
    } finally {
      setIsPosting(false);
    }
  };

  const handleUpvote = async (postId: string) => {
    try {
      const token = Cookies.get('token');
      const res = await fetch(`/api/posts/${postId}/upvote`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, _count: { ...p._count, postUpvotes: p._count.postUpvotes + 1 } } : p
        ));
      }
    } catch (error) { console.error(error); }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white font-sans">
      <FiLoader className="animate-spin text-[#F99D26]" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      <main className="max-w-xl mx-auto w-full border-x border-slate-200 min-h-screen">
        
        <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-3 border-b border-slate-100 font-bold text-xl">
          Aspirasi
        </div>

        {/* Create Post Area */}
        <div className="px-4 py-4 border-b border-slate-100 flex gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-50">
            <div className="w-full h-full flex items-center justify-center font-bold text-[#F99D26] bg-orange-50 text-lg uppercase">
              {userData?.studentProfile?.fullName?.charAt(0) || "U"}
            </div>
          </div>

          <div className="flex-grow">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Apa aspirasimu hari ini?"
              className="w-full bg-transparent text-xl text-slate-900 placeholder:text-slate-400 outline-none resize-none min-h-[60px] mt-2 font-medium"
            />

            {selectedPolicyId && (
              <div className="inline-flex items-center gap-2 bg-orange-50 text-[#F99D26] px-3 py-1 rounded-full mt-2 text-[10px] font-bold border border-orange-100">
                RE: {policies.find(p => p.id === selectedPolicyId)?.title}
                <FiX className="cursor-pointer" onClick={() => setSelectedPolicyId(null)} />
              </div>
            )}
            
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-50">
              <div className="flex gap-1 relative">
                <button 
                  onClick={() => {setShowPolicySelect(!showPolicySelect); setShowEmojiPicker(false);}} 
                  className={`p-2 rounded-full transition-all ${showPolicySelect ? 'bg-[#F99D26] text-white shadow-lg' : 'text-[#F99D26] hover:bg-orange-50'}`}
                >
                  <FiBarChart2 size={20} className="rotate-90"/>
                </button>

                <button 
                  onClick={() => {setShowEmojiPicker(!showEmojiPicker); setShowPolicySelect(false);}} 
                  className="p-2 text-[#F99D26] hover:bg-orange-50 rounded-full transition-all"
                >
                  <FiSmile size={20}/>
                </button>

                {showPolicySelect && (
                  <div className="absolute top-12 left-0 w-72 bg-white border border-slate-200 shadow-2xl rounded-2xl z-20 p-2 overflow-hidden">
                    <p className="text-[10px] font-bold text-slate-400 p-2 uppercase border-b border-slate-50 mb-1">Pilih Kebijakan</p>
                    <div className="max-h-56 overflow-y-auto">
                      {policies.map(p => (
                        <button key={p.id} onClick={() => {setSelectedPolicyId(p.id); setShowPolicySelect(false);}} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-[#F99D26] rounded-xl transition-all truncate">
                          {p.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showEmojiPicker && (
                  <div className="absolute top-12 left-0 bg-white border border-slate-200 shadow-2xl rounded-full z-20 p-2 flex gap-3">
                    {['😊', '🔥', '👏', '🙌', '💡'].map(emoji => (
                      <button key={emoji} onClick={() => {setPostContent(prev => prev + emoji); setShowEmojiPicker(false);}} className="text-xl hover:scale-125 transition-transform">
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={handleCreatePost} 
                disabled={!postContent.trim() || isPosting} 
                className="px-8 py-2.5 bg-[#F99D26] text-white rounded-full font-bold text-sm disabled:opacity-50 hover:bg-orange-500 shadow-lg shadow-orange-100 transition-all active:scale-95 flex items-center gap-2"
              >
                {isPosting ? <FiLoader className="animate-spin" /> : "Post"}
              </button>
            </div>
          </div>
        </div>

        {/* Feed Posts - Tetap Muncul meskipun kamu belum posting */}
        <div className="divide-y divide-slate-100">
          {posts.length > 0 ? (
            posts.map((post) => (
              <div key={post.id} className="p-4 hover:bg-slate-50/50 transition-all">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-50">
                    <div className="w-full h-full flex items-center justify-center font-bold text-[#F99D26] bg-orange-50 uppercase">
                      {post.author?.studentProfile?.fullName?.charAt(0) || "M"}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{post.author?.studentProfile?.fullName}</span>
                        <span className="text-slate-400 text-xs">· {new Date(post.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <FiMoreHorizontal className="text-slate-400" />
                    </div>

                    {post.policy && (
                      <div className="mt-1">
                        <span className="text-[10px] font-bold text-[#F99D26] uppercase">Re: {post.policy.title}</span>
                      </div>
                    )}

                    <p className="mt-1.5 text-slate-800 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>

                    <div className="flex items-center gap-4 mt-4 text-slate-500">
                      <button 
                        onClick={() => handleUpvote(post.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full hover:bg-slate-200 active:scale-90 transition-all"
                      >
                        <FiArrowUp size={16} strokeWidth={3} />
                        <span className="text-xs font-extrabold">{post._count?.postUpvotes || 0}</span>
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full hover:bg-slate-200">
                        <FiMessageSquare size={16} />
                        <span className="text-xs font-extrabold">{post._count?.comments || 0}</span>
                      </button>
                      <FiShare2 size={18} className="ml-auto cursor-pointer hover:text-[#F99D26]" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center text-slate-400 italic">
              Belum ada aspirasi dari mahasiswa lain.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}