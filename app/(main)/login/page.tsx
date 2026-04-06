"use client";
import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { useRouter } from 'next/navigation';
import AuthInput from '@/components/AuthInput';
import Cookies from 'js-cookie'; // 1. Import library Cookies
import { useGoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const { register, handleSubmit } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // 2. FUNGSI LOGIN MANUAL
  const onLogin = async (data: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Login gagal");

      // SIMPAN KE COOKIE
      Cookies.set('token', result.data.token, { expires: 7, path: '/' }); 
      
      alert(result.message);
      router.push("/home"); 
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. FUNGSI GOOGLE LOGIN
  const handleGoogleAuth = async (idToken: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const result = await res.json();
      if (res.ok && result.data?.token) {
        // SIMPAN KE COOKIE
        Cookies.set('token', result.data.token, { expires: 7, path: '/' });

        alert("Login Google Berhasil!");
        router.push("/");
      } else {
        alert(result.message || "Gagal Login");
      }
    } catch (error) {
      alert("Gagal koneksi ke server");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-sans">
      <main className="flex w-full max-w-sm flex-col p-8 bg-white">
        <div className="mb-10 w-full text-left">
          <button onClick={() => router.back()} className="text-[#E8A34D] font-bold text-sm flex items-center gap-2 mb-12">
            <span className="text-xl">‹</span> Masuk
          </button>
          <h1 className="text-4xl font-bold mb-6">
            <span className="text-[#2682F9]">Suara</span><span className="text-[#E8A34D]">Unpad</span>
          </h1>
          <p className="text-black font-bold text-lg leading-tight">Selamat datang di SUARAUNPAD</p>
          <p className="text-zinc-500 text-sm mt-1">Sebuah one-stop platform untuk Unpad yang lebih UNGGUL</p>
        </div>

        <form onSubmit={handleSubmit(onLogin)} className="w-full space-y-2">
          <AuthInput label="Email Unpad" placeholder="mahasiswa1@unpad.ac.id" register={register("email", { required: true })} />
          <AuthInput label="Password" type="password" placeholder="password123" register={register("password", { required: true })} />
          
          <div className="text-right py-2 mb-4">
            <button type="button" className="font-bold text-black border-b-2 border-black leading-none text-sm text-black">Lupa Password?</button>
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full bg-[#E8A34D] text-white font-bold py-4 rounded-xl shadow-[0px_10px_20px_rgba(232,163,77,0.3)] transition-all disabled:opacity-50"
          >
            {isSubmitting ? "MEMPROSES..." : "Masuk"}
          </button>
        </form>

        <div className="relative my-8 w-full text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
          <span className="relative bg-white px-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none font-sans">Atau</span>
        </div>

        <button 
          type="button" 
          disabled={isSubmitting}
          onClick={() => {
            const sampleToken = "eyJhbGciOiJSUzI1NiIs..."; // Ganti dengan token asli Postman-mu
            handleGoogleAuth(sampleToken);
          }}
          className="w-full flex items-center justify-center gap-3 border border-zinc-200 py-3.5 rounded-xl hover:bg-zinc-50 transition font-bold text-zinc-600 disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Masuk dengan Google
        </button>

        <div className="mt-12 text-center text-sm text-zinc-500 font-medium">
          Belum punya akun? <a href="/register" className="text-[#2682F9] font-bold underline">Daftar di sini.</a>
        </div>
      </main>
    </div>
  );
}