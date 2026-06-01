"use client";

import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { 
  FiBell, 
  FiLoader, 
  FiClock, 
  FiMessageSquare, 
  FiInfo,
  FiArrowUp,
  FiCheckCircle,
  FiShield
} from "react-icons/fi";

// --- 1. INTERFACES ---
interface Notification {
  id: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  reportId: string | null;
  postId: string | null;
  commentId: string | null;
  actor: {
    adminProfile?: { fullName: string } | null;
    studentProfile?: { fullName: string } | null;
    lecturerProfile?: { fullName: string } | null;
  } | null;
  post: { title: string } | null;
  report: { title: string; status?: string } | null;
  comment: { content: string } | null;
}

// --- HELPER: FORMAT WAKTU ---
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Baru saja";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24 && now.getDate() === date.getDate()) return `${diffInHours} jam lalu`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
    return `Kemarin, ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function NotifikasiPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // --- 2. FETCH DATA ---
  const fetchNotifications = async () => {
    try {
      const token = Cookies.get('token');
      if (!token) return router.push('/login');

      const res = await fetch("/api/notifications", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      
      if (res.ok) {
        setNotifications(result.data.data);
        setUnreadCount(result.data.meta.unreadCount);
      }
    } catch (error) {
      console.error("Gagal load notifikasi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // --- 3. HANDLE ACTIONS ---
  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      const token = Cookies.get('token');
      fetch(`/api/notifications/${notif.id}/read`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      }).catch(console.error);
      
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    if (notif.postId) {
      router.push(`/aspirasi/${notif.postId}`);
    } else if (notif.reportId) {
      router.push(`/profil/my-report`);
    }
  };

  const handleReadAll = async () => {
    try {
      const token = Cookies.get('token');
      const res = await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) { console.error(error); }
  };

  // --- 4. GROUPING ---
  const groupedNotifications = () => {
    const groups: Record<string, Notification[]> = {
      "TERBARU": [],
      "KEMARIN": [],
      "LEBIH LAMA": []
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    notifications.forEach(notif => {
      const notifDate = new Date(notif.createdAt);
      notifDate.setHours(0, 0, 0, 0);

      if (notifDate.getTime() === today.getTime()) {
        groups["TERBARU"].push(notif);
      } else if (notifDate.getTime() === yesterday.getTime()) {
        groups["KEMARIN"].push(notif);
      } else {
        groups["LEBIH LAMA"].push(notif);
      }
    });

    return groups;
  };

  // --- 5. CONTENT GENERATOR ---
  const getDisplayContent = (notif: Notification) => {
    const actorName = 
      notif.actor?.adminProfile?.fullName?.split(" ")[0] || 
      notif.actor?.studentProfile?.fullName?.split(" ")[0] || 
      notif.actor?.lecturerProfile?.fullName?.split(" ")[0] || 
      "Seseorang";
    
    const postTitle = notif.post?.title ? `"${notif.post.title}"` : 'Anda';
    const reportTitle = notif.report?.title ? `"${notif.report.title}"` : 'Anda';
    const reportStatus = notif.report?.status; // Will be undefined without backend changes
    const commentContent = notif.comment?.content ? `"${notif.comment.content.substring(0, 50)}${notif.comment.content.length > 50 ? '...' : ''}"` : 'Silakan cek balasan terbaru.';

    if (notif.type === 'REPORT_STATUS_CHANGED') {
      let icon = <FiClock />;
      let colorClass = "text-orange-500 border border-orange-200";
      let labelClass = "text-orange-500";
      let label = "STATUS LAPORAN";
      let title = `Status laporan ${reportTitle} telah diperbarui`;
      let message = "Cek detail laporan Anda untuk melihat perkembangan terbaru.";

      if (reportStatus === 'VERIFIED') {
        icon = <FiShield />;
        label = "TERVERIFIKASI";
        title = `Laporan ${reportTitle} sedang ditinjau`;
        message = "Tim teknis sedang memvalidasi laporan Anda.";
        colorClass = "text-orange-500 border border-orange-200";
        labelClass = "text-orange-500";
      } else if (reportStatus === 'IN_PROGRESS') {
        icon = <FiClock />;
        label = "STATUS PERBAIKAN";
        title = `Laporan ${reportTitle} sedang diperbaiki`;
        message = "Teknisi telah berada di lokasi untuk menangani kendala Anda.";
        colorClass = "text-orange-500 border border-orange-200";
        labelClass = "text-orange-500";
      } else if (reportStatus === 'RESOLVED') {
        icon = <FiCheckCircle />;
        label = "TELAH SELESAI";
        title = `Laporan ${reportTitle} telah diselesaikan`;
        message = "Area telah dibersihkan/diperbaiki sepenuhnya. Terima kasih!";
        colorClass = "text-green-500 border border-green-200";
        labelClass = "text-green-500";
      } else if (reportStatus === 'SUBMITTED') {
        icon = <FiClock />;
        label = "TERKIRIM";
        title = `Laporan ${reportTitle} berhasil terkirim`;
        message = "Laporan Anda sedang menunggu antrean untuk ditinjau.";
        colorClass = "text-blue-500 border border-blue-200";
        labelClass = "text-blue-500";
      }

      return { title, message, icon, colorClass, labelClass, label };
    }

    const types: Record<string, any> = {
      'COMMENT_ON_POST': {
        title: notif.post?.title ? `Seseorang mengomentari aspirasi ${postTitle}` : "Seseorang mengomentari aspirasi Anda",
        message: notif.comment?.content ? `${actorName}: ${commentContent}` : `${actorName} memberikan komentar.`,
        icon: <FiMessageSquare />, colorClass: 'text-blue-500 border border-blue-200', labelClass: 'text-blue-500', label: 'ASPIRASI'
      },
      'REPLY_ON_COMMENT': {
        title: "Seseorang membalas komentar Anda",
        message: notif.comment?.content ? `${actorName}: ${commentContent}` : `${actorName} membalas komentar Anda.`,
        icon: <FiMessageSquare />, colorClass: 'text-blue-500 border border-blue-200', labelClass: 'text-blue-500', label: 'ASPIRASI'
      },
      'UPVOTE_POST': {
        title: notif.post?.title ? `Seseorang mendukung aspirasi ${postTitle}` : "Seseorang mendukung aspirasi Anda",
        message: `${actorName} memberikan dukungan pada aspirasi tersebut.`,
        icon: <FiArrowUp />, colorClass: 'text-[#F99D26] border border-[#F99D26]/30', labelClass: 'text-[#F99D26]', label: 'DUKUNGAN'
      },
      'UPVOTE_REPORT': {
        title: notif.report?.title ? `Seseorang mendukung laporan ${reportTitle}` : "Seseorang mendukung laporan Anda",
        message: `${actorName} memberikan dukungan pada laporan tersebut.`,
        icon: <FiArrowUp />, colorClass: 'text-[#F99D26] border border-[#F99D26]/30', labelClass: 'text-[#F99D26]', label: 'DUKUNGAN'
      },
      'UPVOTE_COMMENT': {
        title: "Seseorang mendukung komentar Anda",
        message: `${actorName} memberikan dukungan pada komentar Anda.`,
        icon: <FiArrowUp />, colorClass: 'text-[#F99D26] border border-[#F99D26]/30', labelClass: 'text-[#F99D26]', label: 'DUKUNGAN'
      }
    };

    return types[notif.type] || {
      title: "Pemberitahuan",
      message: "Ada pembaruan informasi untuk Anda.",
      icon: <FiInfo />, colorClass: 'text-slate-500 border border-slate-200', labelClass: 'text-slate-500', label: 'INFO'
    };
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <FiLoader className="animate-spin text-[#F99D26]" size={32} />
    </div>
  );

  const groups = groupedNotifications();

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 pb-20">
      {/* HEADER */}
      <div className="bg-white pt-10 pb-6">
        <div className="max-w-2xl mx-auto px-4 flex justify-between items-end">
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight">Notifikasi Anda</h1>
          {unreadCount > 0 && (
            <button 
              onClick={handleReadAll}
              className="text-[10px] font-bold text-[#F99D26] uppercase tracking-wider hover:opacity-80 transition mb-2"
            >
              Tandai Semua Dibaca
            </button>
          )}
        </div>
      </div>

      <main className="max-w-2xl mx-auto w-full px-4 mt-2">
        {notifications.length > 0 ? (
          Object.entries(groups).map(([groupName, items]) => {
            if (items.length === 0) return null;
            
            return (
              <div key={groupName} className="mb-8">
                <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">
                  {groupName}
                </h2>
                <div className="space-y-4">
                  {items.map((notif) => {
                    const content = getDisplayContent(notif);
                    const isRead = notif.isRead;

                    return (
                      <div 
                        key={notif.id} 
                        onClick={() => handleNotificationClick(notif)}
                        className={`group p-5 rounded-3xl flex gap-4 transition-all relative border border-slate-100 cursor-pointer ${
                          !isRead 
                          ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]' 
                          : 'bg-white shadow-sm'
                        } hover:border-slate-200 hover:shadow-md`}
                      >
                        {/* ICON BOX */}
                        <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-[18px] bg-transparent ${content.colorClass}`}>
                          {content.icon}
                        </div>

                        {/* TEXT CONTENT */}
                        <div className="flex-grow pt-0.5 pr-2">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${content.labelClass}`}>
                              {content.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 font-medium">
                                {formatTimeAgo(notif.createdAt)}
                              </span>
                              {!isRead && (
                                <div className="w-1.5 h-1.5 bg-[#F99D26] rounded-full" />
                              )}
                            </div>
                          </div>
                          <h3 className="text-[15px] font-bold leading-tight text-slate-900">
                            {content.title}
                          </h3>
                          <p className="text-[13px] mt-1 text-slate-500 leading-relaxed">
                            {content.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-32 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <FiBell size={32} />
            </div>
            <p className="text-slate-400 text-sm font-medium">Belum ada notifikasi terbaru.</p>
          </div>
        )}
      </main>
    </div>
  );
}