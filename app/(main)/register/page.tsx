"use client";
import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { useRouter } from 'next/navigation';
import { FiUser, FiMail, FiLock } from "react-icons/fi";
import AuthInput from '@/components/AuthInput';
import Cookies from 'js-cookie';
import { useGoogleLogin } from '@react-oauth/google';

export default function RegisterPage() {
  const { register, handleSubmit, setValue } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // 1. FUNGSI LOGIC AUTH KE BACKEND
  const handleGoogleAuth = async (idToken: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const result = await res.json();

      if (res.ok && result.status === "success") {
        if (result.data.isNewUser) {
          // CASE: User baru - Auto-fill form
          alert("Akun Google valid! Nama dan Email telah terisi otomatis.");
          setValue("fullName", result.data.googleData.fullName);
          setValue("email", result.data.googleData.email);
        } else {
          // CASE: User sudah terdaftar - Langsung login
          Cookies.set('token', result.data.token, { expires: 7, path: '/' });
          alert("Anda sudah terdaftar. Mengalihkan ke Beranda...");
          router.push("/home");
        }
      } else {
        alert(result.message || "Gagal verifikasi Google");
      }
    } catch (error) {
      alert("Gagal koneksi ke server");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. HOOK GOOGLE LOGIN (SDK)
  const loginWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      // Catatan: Google SDK biasanya mengembalikan access_token. 
      // Jika backend butuh credential (JWT/idToken), 
      // pastikan integrasi di Google Cloud Console sudah sesuai.
      console.log("Google Login Response:", tokenResponse);
      
      // Untuk testing sementara, kita panggil fungsi auth
      // Di integrasi asli, tokenResponse.access_token dikirim atau idToken
      handleGoogleAuth(tokenResponse.access_token); 
    },
    onError: () => alert("Login Google Gagal!"),
  });

  // 3. FUNGSI REGISTER MANUAL
  const onRegister = async (data: any) => {
    setIsSubmitting(true);
    try {
      const payload = { ...data, role: "STUDENT" };
      const res = await fetch("/api/auth/register", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Gagal daftar");

      alert(result.message); 
      router.push("/login");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-sans">
      <main className="flex w-full max-w-sm flex-col p-8 bg-white">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-black">
            Buat <span className="text-[#2682F9]">Akun</span> <span className="text-[#E8A34D]">Baru</span>
          </h2>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">Silakan lengkapi data diri Anda untuk bergabung dalam SuaraUnpad</p>
        </div>

        <form onSubmit={handleSubmit(onRegister)} className="w-full space-y-2">
          <AuthInput label="Nama Lengkap" icon={FiUser} placeholder="Mikel" register={register("fullName", { required: true })} />
          <AuthInput label="Email Unpad" icon={FiMail} placeholder="mahasiswa1@unpad.ac.id" register={register("email", { required: true })} />
          <AuthInput label="NPM (Student ID)" placeholder="140810230041" register={register("studentId", { required: true })} />
          <AuthInput label="Fakultas" placeholder="FMIPA" register={register("faculty", { required: true })} />
          <AuthInput label="Program Studi" placeholder="Teknik Informatika" register={register("major", { required: true })} />
          <AuthInput label="Kata Sandi" type="password" icon={FiLock} placeholder="password123" register={register("password", { required: true })} />

          <button type="submit" disabled={isSubmitting}
            className="w-full bg-[#E8A34D] text-white font-bold py-4 rounded-xl shadow-[0px_10px_20px_rgba(232,163,77,0.3)] mt-6 transition-all disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? "MEMPROSES..." : "Daftar Sekarang"}
          </button>
        </form>

        <div className="relative my-8 w-full text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
          <span className="relative bg-white px-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none">Atau</span>
        </div>

        {/* TOMBOL GOOGLE SDK */}
        <button 
          type="button" 
          disabled={isSubmitting}
          onClick={() => loginWithGoogle()}
          className="w-full flex items-center justify-center gap-3 border border-zinc-200 py-3.5 rounded-xl hover:bg-zinc-50 transition font-bold text-zinc-600 disabled:opacity-50 active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Daftar dengan Google
        </button>

        <div className="mt-8 text-center text-sm text-zinc-500 font-medium w-full">
          Sudah memiliki akun? <a href="/login" className="text-[#2682F9] font-bold underline">Masuk di sini</a>
        </div>
      </main>
    </div>
  );
}