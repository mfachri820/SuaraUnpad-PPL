"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { useRouter } from 'next/navigation';
import { FiUser, FiMail, FiLock } from "react-icons/fi";
import AuthInput from '@/components/AuthInput';
import Cookies from 'js-cookie';
import { GoogleLogin } from '@react-oauth/google';

export default function RegisterPage() {
  const { register, handleSubmit, setValue } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleRegistration, setIsGoogleRegistration] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. FUNGSI LOGIC AUTH KE BACKEND UNTUK GOOGLE
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
          sessionStorage.setItem("googleData", JSON.stringify(result.data.googleData));
          alert("Akun Google valid! Sedikit lagi, yuk lengkapi data akademikmu.");
          router.push("/complete-profile"); 
        } else {
          // Jika ternyata user lama, langsung login
          Cookies.set('token', result.data.token, { expires: 7, path: '/' });
          alert("Selamat datang kembali!");
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
  }; // <--- Kurung penutup handleGoogleAuth yang tadi hilang ada di sini

  // 2. FUNGSI REGISTER MANUAL (Submit Form)
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
      <main className="flex w-full max-w-sm flex-col p-8 bg-white border border-zinc-100 shadow-xl shadow-zinc-200/50 rounded-3xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-black">
            Buat <span className="text-[#2682F9]">Akun</span> <span className="text-[#E8A34D]">Baru</span>
          </h2>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Silakan lengkapi data diri Anda untuk bergabung dalam SuaraUnpad
          </p>
        </div>

        <form onSubmit={handleSubmit(onRegister)} className="w-full space-y-2">
          <AuthInput label="Nama Lengkap" icon={FiUser} placeholder="Mikel" register={register("fullName", { required: true })} />
          <AuthInput label="Email Unpad" icon={FiMail} placeholder="mahasiswa1@unpad.ac.id" register={register("email", { required: true })} />
          <AuthInput label="NPM (Student ID)" placeholder="140810230041" register={register("studentId", { required: true })} />
          <AuthInput label="Fakultas" placeholder="FMIPA" register={register("faculty", { required: true })} />
          <AuthInput label="Program Studi" placeholder="Teknik Informatika" register={register("major", { required: true })} />
          
          {!isGoogleRegistration && (
             <AuthInput 
               label="Kata Sandi" 
               type="password" 
               icon={FiLock} 
               placeholder="password123" 
               register={register("password", { required: !isGoogleRegistration })} 
             />
          )}

          <button type="submit" disabled={isSubmitting}
            className="w-full bg-[#E8A34D] text-white font-bold py-4 rounded-xl shadow-[0px_10px_20px_rgba(232,163,77,0.3)] mt-6 transition-all disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? "MEMPROSES..." : "Daftar Sekarang"}
          </button>
        </form>

        {!isGoogleRegistration && (
          <>
            <div className="relative my-8 w-full text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
              <span className="relative bg-white px-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none">Atau</span>
            </div>

            <div className="flex justify-center w-full min-h-[44px]">
              {isMounted ? (
                <GoogleLogin
                  onSuccess={(credentialResponse) => {
                    if (credentialResponse.credential) {
                      handleGoogleAuth(credentialResponse.credential);
                    }
                  }}
                  onError={() => alert("Login Google Gagal!")}
                  shape="rectangular"
                  text="signup_with"
                  size="large"
                  width="320px"
                />
              ) : (
                <div className="w-full h-11 bg-zinc-100 rounded-md animate-pulse"></div>
              )}
            </div>
          </>
        )}

        <div className="mt-8 text-center text-sm text-zinc-500 font-medium w-full">
          Sudah memiliki akun? <a href="/login" className="text-[#2682F9] font-bold underline">Masuk di sini</a>
        </div>
      </main>
    </div>
  );
}