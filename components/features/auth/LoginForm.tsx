"use client";

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import AuthInput from "@/components/ui/AuthInput";
import Cookies from "js-cookie";
import { GoogleLogin } from "@react-oauth/google";

// Import fungsi dan interface dari AuthFetch.ts
import { verifyGoogleAuth, loginManual, LoginPayload } from "./AuthFetch";

export default function LoginForm() {
  // Berikan tipe pada useForm
  const { register, handleSubmit } = useForm<LoginPayload>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. FUNGSI LOGIN MANUAL (Tanpa any)
  const onLogin: SubmitHandler<LoginPayload> = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await loginManual(data);

      // Simpan ke cookie
      Cookies.set("token", result.data.token, { expires: 7, path: "/" });

      alert(result.message);
      router.push("/home");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan";
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. FUNGSI GOOGLE AUTH
  const handleGoogleAuth = async (idToken: string) => {
    setIsSubmitting(true);
    try {
      const result = await verifyGoogleAuth(idToken);

      if (result.status === "success") {
        if (result.data.isNewUser) {
          sessionStorage.setItem(
            "googleData",
            JSON.stringify(result.data.googleData)
          );
          alert(
            "Akun Google valid! Sedikit lagi, yuk lengkapi data akademikmu."
          );
          router.push("/complete-profile");
        } else {
          Cookies.set("token", result.data.token, { expires: 7, path: "/" });
          alert("Login berhasil! Mengalihkan ke Beranda...");
          router.push("/home");
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Gagal koneksi ke server";
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center ">
      <main className="flex w-full my-10 max-w-sm flex-col p-8 bg-white border border-zinc-100 shadow-xl shadow-zinc-200/50 rounded-3xl">
        <div className="mb-10 w-full text-left">
          <h1 className="text-4xl font-bold mb-6">
            <span className="text-[#2682F9]">Suara</span>
            <span className="text-[#E8A34D]">Unpad</span>
          </h1>
          <p className="text-black font-bold text-lg leading-tight">
            Selamat datang di SUARAUNPAD
          </p>
          <p className="text-zinc-500 text-sm mt-1">
            Sebuah one-stop platform untuk Unpad yang lebih UNGGUL
          </p>
        </div>

        <form onSubmit={handleSubmit(onLogin)} className="w-full space-y-2">
          <AuthInput
            label="Email Unpad"
            placeholder="mahasiswa1@unpad.ac.id"
            register={register("email", { required: true })}
          />
          <AuthInput
            label="Password"
            type="password"
            placeholder="password123"
            register={register("password", { required: true })}
          />

          <div className="text-right py-2 mb-4">
            <button
              type="button"
              className="font-bold text-black border-b-2 border-black leading-none text-sm"
            >
              Lupa Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#ffb656] hover:bg-[#F99D26] hover:cursor-pointer  text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="relative my-8 w-full text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-100"></div>
          </div>
          <span className="relative bg-white px-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none">
            Atau
          </span>
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
              text="signin_with"
              size="large"
              width="320px"
            />
          ) : (
            <div className="w-full h-11 bg-zinc-100 rounded-md animate-pulse"></div>
          )}
        </div>

        <div className="mt-12 text-center text-sm text-zinc-500 font-medium">
          Belum punya akun?{" "}
          <a href="/register" className="text-[#2682F9] font-bold underline">
            Daftar di sini.
          </a>
        </div>
      </main>
    </div>
  );
}