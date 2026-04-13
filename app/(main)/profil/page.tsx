"use client";

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { 
  FiCheckCircle, 
  FiEdit2, 
  FiX, 
  FiLoader, 
  FiLogOut, 
  FiChevronRight, 
  FiInbox
} from "react-icons/fi";

// 1. Definisi Interface untuk Type Safety
interface StudentProfile {
  fullName: string;
  faculty: string;
  major?: string;
}

interface User {
  id: string;
  email: string;
  avatarUrl?: string;
  isVerified: boolean;
  studentProfile?: StudentProfile;
}

interface Report {
  id: string;
  authorId: string;
  title: string;
  imageUrl?: string;
  status: 'SUBMITTED' | 'DONE';
  createdAt: string;
}

interface Policy {
  id: string;
  title: string;
}

interface ProfileFormInputs {
  fullName: string;
  faculty: string;
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<User | null>(null);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const router = useRouter();
  const { register, handleSubmit, setValue } = useForm<ProfileFormInputs>();

  // Fungsi untuk fetch data (dipisah agar bisa dipanggil ulang setelah update)
  const fetchData = async () => {
    try {
      const token = Cookies.get('token');
      
      const [userRes, reportRes, policyRes] = await Promise.all([
        fetch("/api/auth/me", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("/api/reports", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("/api/policies", { headers: { "Authorization": `Bearer ${token}` } })
      ]);

      const [userResult, reportResult, policyResult] = await Promise.all([
        userRes.json(), reportRes.json(), policyRes.json()
      ]);

      if (userRes.ok && reportRes.ok && policyRes.ok) {
        setUserData(userResult.data);
        
        const filteredReports = reportResult.data.data.filter(
          (r: Report) => r.authorId === userResult.data.id
        );
        setMyReports(filteredReports);
        setPolicies(policyResult.data.data || []);

        if (userResult.data.studentProfile) {
          setValue("fullName", userResult.data.studentProfile.fullName);
          setValue("faculty", userResult.data.studentProfile.faculty);
        }
      }
    } catch (error) {
      console.error("Gagal sinkronisasi data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [setValue]);

  // 2. Handler Update Profil (Tanpa 'any' & Re-fetch Data)
  const onUpdateProfile: SubmitHandler<ProfileFormInputs> = async (data) => {
    setIsUpdating(true);
    try {
      const token = Cookies.get('token');
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          fullName: data.fullName,
          faculty: data.faculty
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Gagal update profil");
      }
      
      // RE-FETCH DATA: Menjamin data di UI sinkron 100% dengan Database
      await fetchData();

      setIsEditing(false);
      alert("Profil berhasil diperbarui!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      alert(message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <FiLoader className="animate-spin text-[#E8A34D]" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="max-w-xl mx-auto w-full px-6 py-10">
        
        {/* Header Profil */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-zinc-100 flex items-center justify-center">
              {userData?.avatarUrl ? (
                <img src={userData.avatarUrl} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <span className="text-3xl font-bold text-[#E8A34D] uppercase">
                  {userData?.studentProfile?.fullName?.charAt(0) || "U"}
                </span>
              )}
            </div>
            {userData?.isVerified && (
              <div className="absolute bottom-1 right-1 bg-[#E8A34D] p-1.5 rounded-full border-4 border-white shadow-sm">
                <FiCheckCircle size={14} className="text-white" />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-zinc-900 mb-1">
            {userData?.studentProfile?.fullName || "Mahasiswa Unpad"}
          </h2>

          <div className="px-4 py-1.5 bg-[#FFF8F0] rounded-full border border-[#E8A34D]/10 mb-8">
            <p className="text-[#E8A34D] text-[10px] font-extrabold uppercase tracking-widest">Mahasiswa Terverifikasi</p>
          </div>
          
          <div className="flex gap-3">
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-sm border border-zinc-100 text-sm font-bold text-zinc-700 active:scale-95 transition-all">
              <FiEdit2 size={16} className="text-[#E8A34D]" /> Edit Profil
            </button>
            <button onClick={() => { Cookies.remove('token'); router.push('/login'); }} className="p-3 bg-red-50 text-red-500 rounded-full border border-red-100 active:scale-95">
              <FiLogOut size={20} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-white p-7 rounded-[32px] border border-zinc-50 shadow-sm text-center">
            <p className="text-4xl font-bold text-[#E8A34D]">{myReports.length}</p>
            <p className="text-zinc-400 text-[10px] font-extrabold tracking-widest mt-2 uppercase">Laporan</p>
          </div>
          <div className="bg-white p-7 rounded-[32px] border border-zinc-50 shadow-sm text-center">
            <p className="text-4xl font-bold text-[#E8A34D]">{policies.length}</p>
            <p className="text-zinc-400 text-[10px] font-extrabold tracking-widest mt-2 uppercase">Kebijakan</p>
          </div>
        </div>

        {/* Laporanku Section Header */}
        <div className="flex justify-between items-center mb-6 px-1">
          <h3 className="text-xl font-bold text-zinc-900">Laporanku</h3>
          <button 
            onClick={() => router.push('/profil/my-report')} 
            className="text-[#E8A34D] text-xs font-bold uppercase tracking-wider"
          >
            Lihat Semua
          </button>
        </div>

        <div className="space-y-4 mb-10">
          {myReports.length > 0 ? (
            myReports.slice(0, 3).map((report) => (
              <div 
                key={report.id}
                onClick={() => router.push('/profil/my-report')}
                className="bg-white p-5 rounded-[28px] border border-zinc-50 shadow-sm flex items-center gap-5 hover:border-[#E8A34D]/20 cursor-pointer group transition-all"
              >
                <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex-shrink-0 overflow-hidden">
                  {report.imageUrl ? (
                    <img src={report.imageUrl} className="w-full h-full object-cover" alt="Report" />
                  ) : (
                    <div className="w-full h-full bg-[#E8A34D]/5 flex items-center justify-center text-[#E8A34D]">
                        <FiInbox size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between mb-1.5">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase ${report.status === 'SUBMITTED' ? 'bg-orange-50 text-[#E8A34D]' : 'bg-green-50 text-green-600'}`}>
                      {report.status === 'SUBMITTED' ? 'Terkirim' : 'Selesai'}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                        {new Date(report.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-zinc-800 leading-tight group-hover:text-[#2682F9] transition-colors line-clamp-1">
                    {report.title}
                  </h4>
                </div>
                <FiChevronRight className="text-zinc-300 group-hover:text-[#E8A34D]" size={20} />
              </div>
            ))
          ) : (
            <div className="bg-white py-10 rounded-[32px] border border-zinc-50 text-center shadow-sm">
              <p className="text-zinc-400 text-sm italic">Belum ada riwayat laporan</p>
            </div>
          )}
        </div>

        {/* Modal Edit Profile */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-zinc-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-black">Ubah Profil</h3>
                <button onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-black transition-colors"><FiX size={24}/></button>
              </div>
              <form onSubmit={handleSubmit(onUpdateProfile)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase ml-1">Nama Lengkap</label>
                  <input {...register("fullName")} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:border-[#E8A34D] focus:bg-white outline-none text-sm text-black transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase ml-1">Fakultas</label>
                  <input {...register("faculty")} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:border-[#E8A34D] focus:bg-white outline-none text-sm text-black transition-all" />
                </div>
                <button disabled={isUpdating} className="w-full py-4 bg-[#E8A34D] text-white rounded-xl font-bold shadow-lg shadow-orange-200 mt-4 active:scale-95 transition-all disabled:opacity-50">
                  {isUpdating ? <FiLoader className="animate-spin mx-auto"/> : "Simpan Perubahan"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}