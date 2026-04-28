"use client";

import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { 
  FiBell, 
  FiCheckCircle, 
  FiInfo, 
  FiLoader, 
  FiClock,
  FiFileText,
  FiShield
} from "react-icons/fi";

// --- 1. INTERFACES (Zero Any) ---
interface Notification {
  id: string;
  type: 'STATUS_PERBAIKAN' | 'TELAH_SELESAI' | 'KEBIJAKAN_BARU' | 'TERVERIFIKASI' | 'INFORMASI' | string;
  title: string;
  message: string; // Biasanya di API isinya 'message', sesuaikan jika 'description'
  createdAt: string;
  readAt: string | null;
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

  // --- 2. FETCH DATA ---
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
      console.error("Gagal load notifikasi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [router]);

  // --- 3. HANDLE READ ACTIONS ---
  const handleReadAll = async () => {
    try {
      const token = Cookies.get('token');
      const res = await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        // Optimistic update: set semua jadi terbaca secara lokal
        setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Gagal read all");
    }
  };

  const handleReadOne = async (id: string, isRead: boolean) => {
    if (isRead) return; // Kalau sudah dibaca, tidak perlu panggil API lagi

    try {
      const token = Cookies.get('token');
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => 
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Gagal tandai dibaca");
    }
  };

  // --- 4. STYLE HELPER ---
  const getStyle = (type: string) => {
    switch (type) {
      case 'STATUS_PERBAIKAN':
        return { icon: <FiClock />, bg: 'bg-orange-50', text: 'text-[#F99D26]', label: 'STATUS PERBAIKAN' };
      case 'TELAH_SELESAI':
        return { icon: <FiCheckCircle />, bg: 'bg-green-50', text: 'text-green-600', label: 'TELAH SELESAI' };
      case 'KEBIJAKAN_BARU':
        return { icon: <FiFileText />, bg: 'bg-blue-50', text: 'text-blue-600', label: 'KEBIJAKAN BARU' };
      case 'TERVERIFIKASI':
        return { icon: <FiShield />, bg: 'bg-amber-50', text: 'text-amber-600', label: 'TERVERIFIKASI' };
      default:
        return { icon: <FiInfo />, bg: 'bg-slate-50', text: 'text-slate-600', label: 'INFORMASI' };
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <FiLoader className="animate-spin text-[#F99D26]" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-24 font-sans text-slate-900">
      <main className="max-w-xl mx-auto w-full border-x border-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="p-6">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Notifikasi Anda</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-400 mt-1">Kamu punya {unreadCount} pesan belum dibaca</p>
              )}
            </div>
            <button 
              onClick={handleReadAll}
              className="text-[10px] font-extrabold text-[#F99D26] uppercase tracking-widest hover:opacity-70 transition-all active:scale-95"
            >
              Tandai Semua Dibaca
            </button>
          </div>

          {/* List Notifikasi */}
          <div className="space-y-4">
            {notifications.length > 0 ? (
              notifications.map((notif) => {
                const style = getStyle(notif.type);
                const isRead = notif.readAt !== null;

                return (
                  <div 
                    key={notif.id} 
                    onClick={() => handleReadOne(notif.id, isRead)}
                    className={`p-5 rounded-[28px] border border-slate-50 shadow-sm flex gap-4 transition-all relative ${!isRead ? 'bg-white ring-1 ring-orange-100/50' : 'bg-slate-50/30 grayscale-[0.5] opacity-70'}`}
                  >
                    {/* Circle Icon */}
                    <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-xl ${style.bg} ${style.text}`}>
                      {style.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${style.text}`}>
                          {style.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <h3 className="text-[15px] font-bold leading-tight mb-1">
                        {notif.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    {/* Red Dot if unread */}
                    {!isRead && (
                      <div className="absolute top-5 right-5 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
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
        </div>
      </main>
    </div>
  );
}