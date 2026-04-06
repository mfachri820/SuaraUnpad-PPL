"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function HomePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | undefined>("");

  useEffect(() => {
    // Ambil token dari cookie buat pembuktian
    const userToken = Cookies.get('token');
    setToken(userToken);

    // Kalau gak ada token, tendang balik ke login (Proteksi sederhana)
    if (!userToken) {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    // Hapus token dari cookie
    Cookies.remove('token', { path: '/' });
    alert("Berhasil Logout!");
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white font-sans p-4 text-center">
      <h1 className="text-4xl font-bold text-[#2682F9] mb-4">Berhasil Masuk!</h1>
      
      <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 mb-8 max-w-md w-full">
        <p className="text-zinc-600 text-sm font-bold mb-2 uppercase tracking-widest">Token Kamu (di Cookie):</p>
        <p className="text-zinc-400 text-xs break-all font-mono bg-white p-3 rounded-lg border border-zinc-100 italic">
          {token ? token : "Token tidak ditemukan..."}
        </p>
      </div>

      <button 
        onClick={handleLogout}
        className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg active:scale-95"
      >
        Logout dari SuaraUnpad
      </button>
    </div>
  );
}