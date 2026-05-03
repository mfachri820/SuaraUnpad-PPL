"use client";

import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { 
  FiBell, 
  FiCheckCircle, 
  FiLoader, 
  FiClock, 
  FiMessageSquare, 
  FiInfo 
} from "react-icons/fi";

// --- 1. INTERFACES (Sesuai Response Postman) ---
interface Notification {
  id: string;
  type: 'REPORT_STATUS_CHANGED' | 'NEW_COMMENT' | 'NEW_POLICY' | string;
  isRead: boolean;
  createdAt: string;
  reportId: string | null;
  postId: string | null;
  commentId: string | null;
  actor: {
    adminProfile?: { fullName: string } | null;
    studentProfile?: { fullName: string } | null;
  };
}

interface NotificationResponse {
  status: string;
  data: {
    data: Notification[];
    meta: {
      unreadCount: number;
    };
  };
}

export default function NotifikasiPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // --- 2. FETCH DATA DARI API ---
  const fetchNotifications = async () => {
    try {
      const token = Cookies.get('token');
      if (!token) return router.push('/login');

      const res = await fetch("/api/notifications", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result: NotificationResponse = await res.json();
      
      if (res.ok) {
        setNotifications(result.data.data);
        setUnreadCount(result.data.meta.unreadCount);
      }
    } catch (error) {
      console.error("Gagal load notifikasi asli");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [router]);

  // --- 3. HANDLE ACTIONS ---
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
    } catch (error) {
      console.error("Gagal tandai semua dibaca");
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Jalankan navigasi berdasarkan type
    if (notif.type === 'REPORT_STATUS_CHANGED' && notif.reportId) {
      router.push(`/report/${notif.reportId}`);
    } else if (notif.type === 'NEW_COMMENT' && notif.postId) {
      router.push(`/aspirasi/${notif.postId}`);
    } else if (notif.type === 'NEW_POLICY') {
      router.push(`/policies`);
    }

    // Tandai satu notif dibaca di API jika belum dibaca
    if (!notif.isRead) {
      try {
        const token = Cookies.get('token');
        await fetch(`/api/notifications/${notif.id}/read`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) { console.error(e); }
    }
  };

  // Helper untuk konten dinamis berdasarkan type dari Postman
  const getDisplayContent = (notif: Notification) => {
    const actorName = notif.actor.adminProfile?.fullName || notif.actor.studentProfile?.fullName || "Seseorang";
    
    switch (notif.type) {
      case 'REPORT_STATUS_CHANGED':
        return {
          title: "Update Status Laporan",
          message: `Status laporan kamu baru saja diubah oleh ${actorName}.`,
          style: { icon: <FiClock />, bg: 'bg-orange-50', text: 'text-[#F99D26]', label: 'LAPOR' }
        };
      case 'NEW_COMMENT':
        return {
          title: "Komentar Baru",
          message: `${actorName} menanggapi aspirasi kamu.`,
          style: { icon: <FiMessageSquare />, bg: 'bg-blue-50', text: 'text-blue-600', label: 'ASPIRASI' }
        };
      default:
        return {
          title: "Notifikasi Baru",
          message: "Ada pembaruan informasi untuk kamu.",
          style: { icon: <FiInfo />, bg: 'bg-slate-50', text: 'text-slate-600', label: 'INFO' }
        };
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <FiLoader className="animate-spin text-[#F99D26]" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-24 font-sans text-slate-900">
      <main className="max-w-xl mx-auto w-full p-6">
        
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifikasi Anda</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-slate-400 mt-1 italic">Kamu punya {unreadCount} pesan belum dibaca</p>
            )}
          </div>
          <button 
            onClick={handleReadAll}
            className="text-[10px] font-extrabold text-[#F99D26] uppercase tracking-widest hover:opacity-70 transition-all cursor-pointer"
          >
            Tandai Semua Dibaca
          </button>
        </div>

        <div className="space-y-4">
          {notifications.length > 0 ? (
            notifications.map((notif) => {
              const content = getDisplayContent(notif);

              return (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-5 rounded-[28px] border border-slate-50 shadow-sm flex gap-4 transition-all relative cursor-pointer hover:bg-slate-50/50 active:scale-[0.98] ${
                    !notif.isRead ? 'bg-white ring-1 ring-orange-100/30' : 'bg-slate-50/40 opacity-70 grayscale-[0.5]'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-xl ${content.style.bg} ${content.style.text}`}>
                    {content.style.icon}
                  </div>

                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${content.style.text}`}>
                        {content.style.label}
                      </span>
                      <span className="text-[10px] text-slate-400 mr-8">
                        {new Date(notif.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-bold leading-tight mb-1 text-slate-800">
                      {content.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {content.message}
                    </p>
                  </div>

                  {!notif.isRead && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(249,157,38,0.5)]" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                <FiBell size={40} />
              </div>
              <p className="text-slate-400 text-sm italic">Belum ada riwayat notifikasi.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}