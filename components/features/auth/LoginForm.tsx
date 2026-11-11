"use client";

import React, { useState, Suspense } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import AuthInput from "@/components/ui/AuthInput";
import { decodeToken, homePathFor } from "@/lib/clientAuth";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import { loginManual, LoginPayload } from "./AuthFetch";

// Pesan untuk ?error= yang dikirim /api/auth/paus/callback dan proxy.
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  paus_failed: "Gagal masuk dengan PAuS. Silakan coba lagi.",
  paus_state: "Sesi login PAuS kedaluwarsa. Silakan coba lagi.",
  paus_denied: "Login PAuS dibatalkan.",
  paus_unavailable: "Login PAuS belum tersedia. Hubungi admin.",
  paus_profile_incomplete: "Data akun PAuS tidak lengkap. Hubungi admin.",
  not_fmipa: "Suara MIPA khusus mahasiswa FMIPA Universitas Padjadjaran.",
  prodi_unknown: "Program studi pada NPM Anda belum dikenali sistem. Hubungi admin.",
  not_registered: "Akun PAuS ini belum terdaftar di Suara MIPA. Akun dosen/staf didaftarkan oleh admin.",
  account_conflict: "Email akun PAuS ini sudah dipakai akun lain. Hubungi admin.",
  unauthorized: "Silakan masuk terlebih dahulu.",
  session_expired: "Sesi Anda sudah berakhir. Silakan masuk kembali."
};

function DevPasswordLogin() {
  const { register, handleSubmit } = useForm<LoginPayload>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const onLogin: SubmitHandler<LoginPayload> = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await loginManual(data);
      const token = result.data?.token;
      if (token) Cookies.set("token", token, { expires: 7, path: "/" });
      toast.success(result.message || "Login Berhasil!");
      router.push(homePathFor(decodeToken(token)?.role));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal login");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-8 w-full">
      <div className="relative mb-6 w-full text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-100"></div>
        </div>
        <span className="relative bg-white px-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none">
          Login Development
        </span>
      </div>
      <form onSubmit={handleSubmit(onLogin)} className="w-full space-y-2">
        <AuthInput
          label="Email"
          placeholder="admin@unpad.ac.id"
          register={register("email", { required: true })}
        />
        <AuthInput
          label="Password"
          type="password"
          placeholder="********"
          register={register("password", { required: true })}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:cursor-pointer font-bold py-3 rounded-xl transition-all disabled:opacity-50"
        >
          {isSubmitting ? "Memproses..." : "Masuk dengan Password"}
        </button>
      </form>
    </div>
  );
}

function LoginFormContent({ passwordLoginEnabled }: { passwordLoginEnabled: boolean }) {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const errorMessage = errorCode ? LOGIN_ERROR_MESSAGES[errorCode] ?? LOGIN_ERROR_MESSAGES.paus_failed : null;

  return (
    <main className="flex w-full my-10 max-w-sm flex-col p-8 bg-white border border-zinc-100 shadow-xl shadow-zinc-200/50 rounded-3xl">
      <div className="mb-10 w-full text-left">
        <h1 className="text-4xl font-bold mb-6">
          <span className="text-[#2682F9]">Suara</span>
          <span className="text-[#E8A34D]">MIPA</span>
        </h1>
        <p className="text-black font-bold text-lg leading-tight">
          Selamat datang di SUARA MIPA
        </p>
        <p className="text-zinc-500 text-sm mt-1">
          Sebuah one-stop platform untuk FMIPA yang lebih UNGGUL
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium"
        >
          {errorMessage}
        </div>
      )}

      <p className="text-zinc-500 text-sm mb-4">
        Masuk memakai akun PAuS ID Universitas Padjadjaran Anda.
      </p>

      {/* Link biasa (bukan fetch): browser harus benar-benar pindah ke halaman login PAuS. */}
      <a
        href="/api/auth/paus/redirect"
        className="w-full text-center bg-[#ffb656] hover:bg-[#F99D26] text-white font-bold py-4 rounded-xl transition-all active:scale-95"
      >
        Masuk dengan PAuS
      </a>

      {passwordLoginEnabled && <DevPasswordLogin />}
    </main>
  );
}

export default function LoginForm({ passwordLoginEnabled = false }: { passwordLoginEnabled?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {/* Suspense wajib ada karena kita pakai useSearchParams */}
      <Suspense
        fallback={
          <div className="animate-pulse w-full max-w-sm h-96 bg-slate-100 rounded-3xl"></div>
        }
      >
        <LoginFormContent passwordLoginEnabled={passwordLoginEnabled} />
      </Suspense>
    </div>
  );
}
