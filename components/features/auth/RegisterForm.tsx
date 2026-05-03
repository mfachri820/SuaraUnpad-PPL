"use client";

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  FiUser,
  FiMail,
  FiLock,
  FiHash,
  FiBookOpen,
  FiBriefcase
} from "react-icons/fi";
import AuthInput from "@/components/ui/AuthInput";
import Cookies from "js-cookie";
import { GoogleLogin } from "@react-oauth/google";

// Import fungsi dan interface dari AuthFetch.ts
import { verifyGoogleAuth, registerManual, RegisterPayload } from "./AuthFetch";

export default function RegisterForm() {
  // 1. Tambahkan generic <RegisterPayload> pada useForm
  const { register, handleSubmit, watch } = useForm<RegisterPayload>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleRegistration] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // State untuk role dinamis
  const [userRole, setUserRole] = useState<"STUDENT" | "LECTURER">("STUDENT");

  const router = useRouter();

  // Sekarang watch("email") sudah aman digunakan
  const emailValue = watch("email");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Otomatis deteksi role dari domain email (Opsional, biar makin pro)
  useEffect(() => {
    if (emailValue?.endsWith("@unpad.ac.id")) {
      setUserRole("LECTURER");
    } else {
      setUserRole("STUDENT");
    }
  }, [emailValue]);

  // 2. Logic Auth Google (Tanpa any)
  const handleGoogleAuth = async (idToken: string) => {
    setIsSubmitting(true);
    try {
      const result = await verifyGoogleAuth(idToken);

      if (result.status === "success") {
        if (result.data?.isNewUser) {
          sessionStorage.setItem(
            "googleData",
            JSON.stringify(result.data?.googleData)
          );
          alert("Akun Google valid! Yuk, lengkapi data akademikmu dulu.");
          router.push("/complete-profile");
        } else {
          const token = result.data?.token || result.token;
          if (token) {
            Cookies.set("token", token, { expires: 7, path: "/" });
          }
          alert("Selamat datang kembali!");
          router.push("/home");
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal Google Auth";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Logic Register Manual menggunakan SubmitHandler
  const onRegister: SubmitHandler<RegisterPayload> = async (data) => {
    setIsSubmitting(true);
    try {
      
      const finalData = { 
        ...data, 
        role: userRole,         
        detectedRole: userRole  
      };
      
      await registerManual(finalData);

      alert("Registrasi Berhasil! Silakan cek email Anda untuk verifikasi.");
      router.push("/login");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Registrasi Gagal";
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex w-full my-10 max-w-sm flex-col p-8 bg-white border border-zinc-100 shadow-xl shadow-zinc-200/50 rounded-3xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-black">
            Buat <span className="text-[#2682F9]">Akun</span>{" "}
            <span className="text-[#E8A34D]">
              {userRole === "LECTURER" ? "Dosen" : "Baru"}
            </span>
          </h2>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Silakan lengkapi data diri Anda untuk bergabung dalam SuaraUnpad
          </p>
        </div>

        <form onSubmit={handleSubmit(onRegister)} className="w-full space-y-2">
          <AuthInput
            label="Nama Lengkap"
            icon={FiUser}
            placeholder="John Doe"
            register={register("fullName", { required: true })}
          />

          <AuthInput
            label="Email Unpad"
            icon={FiMail}
            placeholder="mhs@mail.unpad.ac.id atau dosen@unpad.ac.id"
            register={register("email", { required: true })}
          />

          {userRole === "LECTURER" ? (
            <AuthInput
              label="NIP / NIDN"
              icon={FiHash}
              placeholder="198001012005011001"
              register={register("employeeId", { required: true })}
            />
          ) : (
            <AuthInput
              label="NPM (Student ID)"
              icon={FiHash}
              placeholder="140810230041"
              register={register("studentId", { required: true })}
            />
          )}

          <AuthInput
            label="Fakultas"
            icon={FiBriefcase}
            placeholder="FMIPA"
            register={register("faculty", { required: true })}
          />

          {userRole === "STUDENT" && (
            <AuthInput
              label="Program Studi"
              icon={FiBookOpen}
              placeholder="Teknik Informatika"
              register={register("major", { required: true })}
            />
          )}

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
            className="w-full bg-[#ffb656] hover:bg-[#F99D26] text-white font-bold py-4 rounded-xl mt-6 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-orange-100"
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