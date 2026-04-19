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
  // 1. Gunakan RegisterPayload sebagai generic di useForm
  const { register, handleSubmit, setValue } = useForm<RegisterPayload>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleInfo, setGoogleInfo] = useState<GoogleUserInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedData = sessionStorage.getItem("googleData");
    if (savedData) {
      const parsed: GoogleUserInfo = JSON.parse(savedData);
      setGoogleInfo(parsed);
      
      // Set value form secara manual dari data session
      setValue("fullName", parsed.fullName);
      setValue("email", parsed.email);
    } else {
      router.push("/login");
    }
  }, [setValue, router]);

  // 2. Gunakan SubmitHandler tanpa any
  const onCompleteProfile: SubmitHandler<RegisterPayload> = async (data) => {
    setIsSubmitting(true);
    try {
      await completeGoogleProfile(data);

      alert("Profil berhasil dilengkapi! Silakan masuk kembali dengan Google.");

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
    <div className="flex min-h-screen items-center justify-center font-sans p-4 text-black">
      <main className="flex w-full max-w-sm flex-col p-8 bg-white border border-zinc-100 shadow-xl shadow-zinc-200/50 rounded-3xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-black leading-tight">
            Lengkapi <span className="text-[#2682F9]">Profil</span>{" "}
            <span className="text-[#E8A34D]">Akademik</span>
          </h2>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Halo,{" "}
            <span className="font-bold text-black">
              {googleInfo?.fullName?.split(" ")[0]}
            </span>
            ! Sedikit lagi untuk bergabung di SuaraUnpad.
          </p>
        </div>

        <div className="mb-6 p-4 rounded-xl border border-zinc-100 bg-zinc-50/50">
          <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest mb-1">
            Akun Terhubung
          </p>
          <div className="flex items-center gap-2">
            <Image
              src={"https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"}
              width={12}
              height={12}
              alt="G"
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
          <AuthInput
            label="NPM (Nomor Pokok Mahasiswa)"
            icon={FiHash}
            placeholder="140810230041"
            register={register("studentId", { required: true })}
          />
          <AuthInput
            label="Fakultas"
            icon={FiBriefcase}
            placeholder="FMIPA"
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
            className="w-full bg-[#E8A34D] text-white font-bold py-4 rounded-xl hover:cursor-pointer hover:bg-[#e08c24] mt-6 transition-all disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? "MEMPROSES..." : "Simpan & Mulai Sekarang"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-zinc-400 font-medium italic">
          *Data ini digunakan untuk verifikasi identitas mahasiswa Unpad.
        </div>
      </main>
    </div>
  );
}