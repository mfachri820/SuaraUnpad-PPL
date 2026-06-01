"use client";

import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
  FiArrowLeft,
  FiLoader,
  FiMapPin,
  FiCalendar,
  FiInbox
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface MyReportItem {
  id: string;
  authorId: string;
  title: string;
  location?: string;
  imageUrl?: string;
  status: string;
  createdAt: string;
}

export default function MyReportPage() {
  const [reports, setReports] = useState<MyReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = Cookies.get("token");
        const userRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const userResult = await userRes.json();

        const reportRes = await fetch("/api/reports", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const reportResult = await reportRes.json();

        if (userRes.ok && reportRes.ok) {
          const myData = reportResult.data.data.filter(
            (r: MyReportItem) => r.authorId === userResult.data.id
          );
          setReports(myData);
        }
      } catch (e) {
        console.error("Gagal mengambil data laporan", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10 font-sans">
      <main className="max-w-xl mx-auto w-full px-6 py-8">
        
        {/* Header Navigation - Fixed Styling */}
        <div className="flex items-center gap-6 mb-8">
          <Link
            href="/profil"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-100 text-slate-500 hover:text-[#2682F9] hover:shadow-sm transition"
          >
            <FiArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-zinc-900 tracking-tight">Laporan Saya</h1>
            <p className="text-[11px] text-zinc-400 font-medium">
              Total {reports.length} laporan terkirim
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <FiLoader className="animate-spin text-[#E8A34D]" size={32} />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white py-16 px-6 rounded-[40px] border border-zinc-50 shadow-sm flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
              <FiInbox size={40} className="text-zinc-200" />
            </div>
            <h3 className="text-lg font-bold text-zinc-800 mb-2">Belum ada riwayat</h3>
            <p className="text-sm text-zinc-400 mb-8 max-w-xs">
              Laporan yang kamu kirim akan muncul di sini secara otomatis.
            </p>
            <button
              onClick={() => router.push('/lapor')} // Sesuaikan route lapor kamu
              className="px-8 py-3 bg-[#E8A34D] hover:bg-[#dc8e2e] text-white text-sm font-bold rounded-2xl shadow-lg shadow-orange-100 transition-all active:scale-95"
            >
              Buat Laporan Sekarang
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report: MyReportItem) => (
              <div
                key={report.id}
                className="bg-white p-4 rounded-[32px] border border-zinc-50 shadow-sm flex gap-4 hover:border-[#E8A34D]/30 transition-all group cursor-pointer"
              >
                {/* Image Section */}
                <div className="w-24 h-24 bg-zinc-100 rounded-[24px] shrink-0 overflow-hidden border border-zinc-50 relative">
                  {report.imageUrl ? (
                    <Image
                      src={report.imageUrl}
                      alt="Laporan"
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-200">
                      <FiMapPin size={28} />
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="grow flex flex-col justify-center pr-2">
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
                        report.status === "SUBMITTED"
                          ? "bg-orange-50 text-[#E8A34D]"
                          : "bg-green-50 text-green-600"
                      }`}
                    >
                      {report.status === "SUBMITTED" ? "Terkirim" : "Selesai"}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold">
                      <FiCalendar size={10} />
                      {new Date(report.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short"
                      })}
                    </div>
                  </div>

                  <h4 className="font-bold text-base text-zinc-800 leading-tight mb-1 line-clamp-1 group-hover:text-[#E8A34D] transition-colors">
                    {report.title}
                  </h4>

                  <div className="flex items-center gap-1 text-zinc-400">
                    <FiMapPin size={10} className="shrink-0" />
                    <p className="text-[11px] font-medium truncate max-w-[150px]">
                      {report.location || "Lokasi Unpad"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}