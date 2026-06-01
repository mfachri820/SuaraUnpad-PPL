"use client";

import React, { useState, Suspense } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import AuthInput from "@/components/ui/AuthInput";
import Cookies from "js-cookie";
import { GoogleLogin } from "@react-oauth/google";
import { toast } from "react-hot-toast";

// Import interface dan fungsi API
import { verifyGoogleAuth, loginManual, LoginPayload } from "./AuthFetch";

// Pisahkan isi form ke komponen internal agar aman dibungkus Suspense
function LoginFormContent() {
  const { register, handleSubmit } = useForm<LoginPayload>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // 🌟 TANGKAP PARAMETER URL
  const searchParams = useSearchParams();
  const isVerified = searchParams.get("verified") === "true";

  // 1. FUNGSI LOGIN MANUAL (Tanpa any)
  const onLogin: SubmitHandler<LoginPayload> = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await loginManual(data);

      if (result.status === "success") {
        const token = result.data?.token || result.token;
        if (token) {
          Cookies.set("token", token, { expires: 7, path: "/" });
        }

        toast.success(result.message || "Login Berhasil!");
        router.push("/home");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Gagal login manual";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. FUNGSI GOOGLE AUTH (Tanpa any)
  const handleGoogleAuth = async (idToken: string) => {
    setIsSubmitting(true);
    try {
      const result = await verifyGoogleAuth(idToken);

      if (result.status === "success") {
        // CEK APAKAH USER BARU
        if (result.data?.isNewUser) {
          sessionStorage.setItem(
            "googleData",
            JSON.stringify(result.data?.googleData)
          );

          toast.success(
            "Akun Google valid! Yuk, lengkapi data akademikmu dulu."
          );
          router.push("/complete-profile");
        }
        // JIKA USER LAMA
        else {
          const token = result.data?.token || result.token;
          if (token) {
            Cookies.set("token", token, { expires: 7, path: "/" });
          }
          toast.success("Selamat datang kembali!");
          router.push("/home");
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal Google Auth";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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

      {/* 🌟 BANNER HIJAU JIKA VERIFIKASI BERHASIL */}
      {isVerified && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium flex items-center gap-2">
          Verifikasi email berhasil! Silakan masuk.
        </div>
      )}

      <form onSubmit={handleSubmit(onLogin)} className="w-full space-y-2">
        <AuthInput
          label="Email Unpad"
          placeholder="mahasiswa1@unpad.ac.id"
          register={register("email", { required: true })}
        />
        <AuthInput
          label="Password"
          type="password"
          placeholder="********"
          register={register("password", { required: true })}
        />

        <div className="text-right py-0 mb-4">
          <button
            type="button"
            className="font-bold text-black hover:underline hover:cursor-pointer  text-sm"
          >
            Lupa Password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#ffb656] hover:bg-[#F99D26] hover:cursor-pointer text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 active:scale-95"
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

      <div className="flex justify-center w-full min-h-11">
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            if (credentialResponse.credential) {
              handleGoogleAuth(credentialResponse.credential);
            }
          }}
          onError={() => toast.error("Login Google Gagal!")}
          shape="rectangular"
          text="signin_with"
          size="large"
          width="320px"
        />
      </div>

      <div className="mt-12 text-center text-sm text-zinc-500 font-medium">
        Belum punya akun?{" "}
        <a
          href="/register"
          className="text-[#2682F9] font-bold hover:underline"
        >
          Daftar di sini.
        </a>
      </div>
    </main>
  );
}

// Komponen utama yang di-export (Bungkus dengan Suspense)
export default function LoginForm() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {/* Suspense wajib ada karena kita pakai useSearchParams */}
      <Suspense
        fallback={
          <div className="animate-pulse w-full max-w-sm h-96 bg-slate-100 rounded-3xl"></div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
