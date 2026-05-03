"use client";

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FiHash, FiBookOpen, FiBriefcase } from "react-icons/fi";
import AuthInput from "@/components/ui/AuthInput";
import Image from "next/image";

// Import fungsi API dan Interface dari AuthFetch.ts
import { completeGoogleProfile, RegisterPayload } from "./AuthFetch";

interface GoogleUserInfo {
  email: string;
  fullName: string;
}

export default function CompleteProfileForm() {
  const { register, handleSubmit, setValue } = useForm<RegisterPayload>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleInfo, setGoogleInfo] = useState<GoogleUserInfo | null>(null);
  
  // State untuk menyimpan role yang terdeteksi
  const [userRole, setUserRole] = useState<"STUDENT" | "LECTURER" | null>(null);
  
  const router = useRouter();

  // 2. Ambil data Google dari Session Storage
  useEffect(() => {
    const savedData = sessionStorage.getItem("googleData");
    if (savedData) {
      const parsed: GoogleUserInfo = JSON.parse(savedData);
      setGoogleInfo(parsed);
      
      // Set value form secara manual dari data session
      setValue("fullName", parsed.fullName);
      setValue("email", parsed.email);
      
      // LOGIKA DETEKSI DOMAIN DIHAPUS - Kita paksa semuanya jadi STUDENT saat submit
    } else {
      // Jika tidak ada data session, tendang balik ke login
      router.push("/login");
    }
  }, [setValue, router]);

  const onCompleteProfile: SubmitHandler<RegisterPayload> = async (data) => {
    setIsSubmitting(true);
    try {
      // 🌟 KITA PAKSA DATA ROLE DAN GOOGLE AUTH DI SINI 🌟
      const payload: RegisterPayload = {
        ...data,
        role: "STUDENT",       // Mutlak STUDENT sesuai kesepakatan
        isGoogleAuth: true     // Wajib dikirim agar BE langsung set isVerified: true
      };

      await completeGoogleProfile(payload);

      alert("Profil berhasil dilengkapi! Silakan masuk kembali dengan Google.");
      
      // Bersihkan session setelah berhasil
      sessionStorage.removeItem("googleData");
      router.push("/login");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Gagal melengkapi profil";
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center font-sans p-4 text-black bg-white">
      <main className="flex w-full max-w-sm flex-col p-8 bg-white border border-zinc-100 shadow-xl shadow-zinc-200/50 rounded-3xl">
        
        {/* Judul Dinamis */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-black leading-tight">
            Lengkapi <span className="text-[#2682F9]">Profil</span>{" "}
            <span className="text-[#E8A34D]">
              {userRole === "LECTURER" ? "Dosen" : "Akademik"}
            </span>
          </h2>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Halo, <span className="font-bold text-black">{googleInfo?.fullName?.split(" ")[0]}</span>! Sedikit lagi untuk bergabung di SuaraUnpad.
          </p>
        </div>

        {/* Badge Akun Google */}
        <div className="mb-6 p-4 rounded-xl border border-zinc-100 bg-zinc-50/50">
          <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest mb-1">
            Akun Terhubung
          </p>
          <div className="flex items-center gap-2">
            <Image 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              width={14} 
              height={14} 
              alt="Google Icon" 
            />
            <p className="text-xs font-semibold text-zinc-600 truncate">
              {googleInfo?.email}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onCompleteProfile)}
          className="w-full space-y-2"
        >
          {/* SEMUA CONDITIONAL LECTURER DIHAPUS, LANGSUNG TAMPILKAN FORM STUDENT */}
          <AuthInput
            label="NPM (Nomor Pokok Mahasiswa)"
            icon={FiHash}
            placeholder="140810230041"
            register={register("studentId", { required: true })}
          />

          <AuthInput 
            label="Fakultas" 
            icon={FiBriefcase} 
            placeholder="Contoh: FMIPA" 
            register={register("faculty", { required: true })} 
          />

          <AuthInput
            label="Program Studi"
            icon={FiBookOpen}
            placeholder="Teknik Informatika"
            register={register("major", { required: true })}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#E8A34D] hover:bg-[#d4923d] text-white font-bold py-4 rounded-xl mt-6 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-orange-100 cursor-pointer"
          >
            {isSubmitting ? "MEMPROSES..." : "Simpan & Mulai Sekarang"}
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] text-zinc-400 font-medium italic leading-relaxed">
          *Data ini digunakan untuk verifikasi identitas sivitas akademika Universitas Padjadjaran.
        </div>
      </main>
    </div>
  );
}