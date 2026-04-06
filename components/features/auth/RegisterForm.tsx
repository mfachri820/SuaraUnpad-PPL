// components/features/auth/RegisterForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FiUser, FiMail, FiLock } from "react-icons/fi";
import AuthInput from "@/components/ui/AuthInput";
import Cookies from "js-cookie";
import { GoogleLogin } from "@react-oauth/google";

// Import fungsi dari file terpisah yang baru kita buat
import { verifyGoogleAuth, registerManual } from "./AuthFetch";

export default function RegisterForm() {
  const { register, handleSubmit, setValue } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleRegistration, setIsGoogleRegistration] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Logic Auth Google
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
          // Jika ternyata user lama, langsung login
          Cookies.set("token", result.data.token, { expires: 7, path: "/" });
          alert("Selamat datang kembali!");
          router.push("/home");
        }
      }
    } catch (error: any) {
      alert(error.message || "Gagal koneksi ke server");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Logic Register Manual
  const onRegister = async (data: any) => {
    setIsSubmitting(true);
    try {
      const result = await registerManual(data);
      alert(result.message);
      router.push("/login");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex w-full my-10 max-w-sm flex-col p-8 bg-white border border-zinc-100 shadow-xl shadow-zinc-200/50 rounded-3xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-black">
            Buat <span className="text-[#2682F9]">Akun</span>{" "}
            <span className="text-[#E8A34D]">Baru</span>
          </h2>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Silakan lengkapi data diri Anda untuk bergabung dalam SuaraUnpad
          </p>
        </div>

        <form onSubmit={handleSubmit(onRegister)} className="w-full space-y-2">
          <AuthInput
            label="Nama Lengkap"
            icon={FiUser}
            placeholder="Mikel"
            register={register("fullName", { required: true })}
          />
          <AuthInput
            label="Email Unpad"
            icon={FiMail}
            placeholder="mahasiswa1@unpad.ac.id"
            register={register("email", { required: true })}
          />
          <AuthInput
            label="NPM (Student ID)"
            placeholder="140810230041"
            register={register("studentId", { required: true })}
          />
          <AuthInput
            label="Fakultas"
            placeholder="FMIPA"
            register={register("faculty", { required: true })}
          />
          <AuthInput
            label="Program Studi"
            placeholder="Teknik Informatika"
            register={register("major", { required: true })}
          />

          {!isGoogleRegistration && (
            <AuthInput
              label="Kata Sandi"
              type="password"
              icon={FiLock}
              placeholder="password123"
              register={register("password", {
                required: !isGoogleRegistration
              })}
            />
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#ffb656] hover:bg-[#F99D26] hover:cursor-pointer text-white font-bold py-4 rounded-xl mt-6 transition-all disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? "Memproses..." : "Daftar Sekarang"}
          </button>
        </form>

        {!isGoogleRegistration && (
          <>
            <div className="relative my-8 w-full text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-100"></div>
              </div>
              <span className="relative bg-white px-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none">
                Atau
              </span>
            </div>

            <div className="flex justify-center w-full min-h-11">
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
          Sudah memiliki akun?{" "}
          <a href="/login" className="text-[#2682F9] font-bold underline">
            Masuk di sini
          </a>
        </div>
      </main>
    </div>
  );
}
