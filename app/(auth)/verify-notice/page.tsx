"use client"; // 🌟 Wajib tambahkan ini karena kita pakai onClick dan Cookies

import { useRouter } from "next/navigation";
import { FiMail } from "react-icons/fi";
import Cookies from "js-cookie"; // 🌟 Import js-cookie

export default function VerifyNoticePage() {
  const router = useRouter();

  const handleBackToLogin = () => {
    // 1. Hapus token yang "menyangkut" di browser
    Cookies.remove("token");

    // 2. Baru pindah ke halaman login
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm max-w-md w-full text-center">
        <div className="w-20 h-20 bg-blue-50 text-[#2682F9] rounded-full flex items-center justify-center mx-auto mb-6">
          <FiMail className="text-4xl" />
        </div>

        <h2 className="text-2xl font-black text-slate-800 mb-3">
          Cek Email Anda
        </h2>

        <p className="text-slate-600 text-sm leading-relaxed mb-8">
          Kami telah mengirimkan tautan verifikasi ke alamat email Anda. Silakan
          cek kotak masuk (Inbox) atau folder Spam untuk mengaktifkan akun
          SuaraUnpad Anda.
        </p>

        {/* 🌟 Ubah Link menjadi button interaktif */}
        <button
          onClick={handleBackToLogin}
          className="block w-full bg-[#2682F9] text-white font-bold py-3.5 rounded-xl hover:bg-blue-600 transition active:scale-95 cursor-pointer"
        >
          Kembali ke Halaman Login
        </button>
      </div>
    </div>
  );
}
