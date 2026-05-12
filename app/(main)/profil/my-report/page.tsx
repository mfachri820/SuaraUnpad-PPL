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

        // 1. Ambil data user dulu buat tau ID kita
        const userRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const userResult = await userRes.json();

        // 2. Ambil semua laporan
        const reportRes = await fetch("/api/reports", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const reportResult = await reportRes.json();

        if (userRes.ok && reportRes.ok) {
          // Filter: Hanya ambil laporan yang authorId-nya sama dengan ID kita
          const myData = reportResult.data.data.filter(
            (r: MyReportItem) => r.authorId === userResult.data.id
          );
          setReports(myData);
        }
      } catch (e) {
        console.error("Gagal mengambil data laporan dari database", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10 font-sans">
      <main className="max-w-xl mx-auto w-full px-6 py-8">
        {/* Header Navigation */}
        <div className="flex items-center gap-4 mb-8">
          <div className="sticky top-0  backdrop-blur-md z-10 px-4 py-5 border-b border-slate-50 flex items-center gap-0">
          <Link
          href="/profil"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#2682F9] mb-0 transition"
        >
          <FiArrowLeft /> Kembali
        </Link>
        </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Laporan Saya</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Total {reports.length} laporan terkirim
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <FiLoader className="animate-spin text-[#E8A34D]" size={32} />
          </div>
        ) : reports.length === 0 ? (
          /* Tampilan kalau beneran kosong */
          <div className="bg-white py-16 px-6 rounded-[40px] border border-zinc-50 shadow-sm flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
              <FiInbox size={40} className="text-zinc-200" />
            </div>
            <h3 className="text-lg font-bold text-zinc-800 mb-2">
              Belum ada riwayat
            </h3>
            <p className="text-sm text-zinc-400 mb-8 max-w-55 mx-auto">
              Laporan yang kamu kirim akan muncul di sini secara otomatis.
            </p>
            <button
              onClick={() => router.push("/report")}
              className="px-8 py-3 bg-[#E8A34D] hover:bg-[#dc8e2e] text-white text-sm font-bold rounded-2xl cursor-pointer shadow-orange-100 active:scale-95 transition-all"
            >
              Buat Laporan Sekarang
            </button>
          </div>
        ) : (
          /* List Laporan dari Database */
          <div className="space-y-4">
            {reports.map((report: MyReportItem) => (
              <div
                key={report.id}
                className="bg-white p-5 rounded-4xl border border-zinc-50 shadow-sm flex gap-5 hover:border-[#E8A34D]/20 transition-all group"
              >
                {/* Image Section */}
                <div className="w-20 h-20 bg-zinc-100 rounded-[22px] shrink-0 overflow-hidden border border-zinc-50">
                  {report.imageUrl ? (
                    <Image
                      src={report.imageUrl}
                      alt="Laporan"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    ></Image>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-cyan-50 text-cyan-200">
                      <FiMapPin size={28} />
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="grow flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-1.5">
                    <span
                      className={`text-[9px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                        report.status === "SUBMITTED"
                          ? "bg-orange-50 text-[#E8A34D]"
                          : report.status === "DONE"
                            ? "bg-green-50 text-green-600"
                            : "bg-zinc-50 text-zinc-400"
                      }`}
                    >
                      {report.status === "SUBMITTED" ? "Terkirim" : "Selesai"}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                      <FiCalendar size={10} />
                      {new Date(report.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short"
                      })}
                    </div>
                  </div>

                  <h4 className="font-bold text-base text-zinc-800 leading-snug mb-1 line-clamp-1 group-hover:text-[#2682F9] transition-colors">
                    {report.title}
                  </h4>

                  <div className="flex items-center gap-1 text-zinc-400">
                    <FiMapPin size={10} />
                    <p className="text-[10px] font-medium truncate max-w-40">
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
