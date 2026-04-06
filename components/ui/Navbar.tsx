"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Import untuk navigasi
import Cookies from "js-cookie"; // Import untuk menghapus token
import { FiMenu, FiX, FiLogOut } from "react-icons/fi"; // Tambah icon LogOut
import { FaUserCircle } from "react-icons/fa";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter(); // Inisialisasi router

  const navLinks = [
    { name: "Beranda", href: "/home" },
    { name: "Aktivitas", href: "/aktivitas" },
    { name: "Lapor", href: "/report" },
    { name: "Notifikasi", href: "/notifikasi" }
  ];

  // --- FUNGSI LOGOUT BEST PRACTICE ---
  const handleLogout = async () => {
    try {
      // 1. (Opsional) Beri tahu Backend untuk mem-blacklist token ini (Jika BE punya endpoint-nya)
      // await fetch("/api/auth/logout", { method: "POST" });

      // 2. Hapus token keamanan dari Cookies browser
      Cookies.remove("token");
      
      // Jika ada cookie khusus Google yang diset manual oleh BE kalian, hapus juga di sini
      // Cookies.remove("google_session"); 

      // 3. Tutup menu mobile (jika sedang terbuka)
      setIsOpen(false);

      // 4. Redirect ke halaman login & paksa refresh state aplikasi
      router.push("/login"); // Ubah '/login' sesuai dengan route halaman login kalian
      router.refresh();
      
    } catch (error) {
      console.error("Gagal melakukan logout:", error);
      // Fallback: Tetap hapus cookie meskipun API backend gagal merespons
      Cookies.remove("token");
      router.push("/login");
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-300 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* BRAND LOGO */}
        <Link
          href="/"
          className="flex items-center text-2xl font-black text-slate-300 tracking-tight hover:underline underline-offset-2"
        >
          <span className="text-[#2682F9]">Suara</span>
          <span className="text-[#F99D26]">Unpad</span>
        </Link>

        {/* DESKTOP MENU */}
        <div className="hidden items-center gap-8 md:flex">
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-slate-600 transition hover:text-[#2682F9]"
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-400"></div>

          {/* User Actions (Profil & Logout) */}
          <div className="flex items-center gap-4">
            <Link
              href="/profil"
              className="flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#2682F9]"
            >
              Profil
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                <FaUserCircle className="text-[2.0rem]" />
              </div>
            </Link>
            
            <div className="h-4 w-px bg-slate-300"></div>

            {/* Tombol Logout Desktop */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm font-bold text-red-500 transition hover:text-red-700"
              title="Keluar dari akun"
            >
              <FiLogOut className="text-lg" />
              Keluar
            </button>
          </div>
        </div>

        {/* MOBILE MENU TOGGLE */}
        <div className="flex items-center gap-4 md:hidden">
          <Link
            href="/report"
            onClick={() => setIsOpen(false)}
            className="rounded-lg bg-[#F99D26] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-orange-500"
          >
            LAPOR
          </Link>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-center p-1 text-slate-600 transition hover:text-[#2682F9] focus:outline-none"
          >
            {isOpen ? <FiX className="text-3xl" /> : <FiMenu className="text-3xl" />}
          </button>
        </div>
      </div>

      {/* DROPDOWN MOBILE MENU */}
      {isOpen && (
        <div className="border-t border-slate-100 bg-white md:hidden">
          <div className="flex flex-col space-y-1 px-4 pb-6 pt-3 shadow-inner">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-[#2682F9]"
              >
                {link.name}
              </Link>
            ))}

            {/* Mobile Profile & Logout */}
            <div className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-4">
              <Link
                href="/profil"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                  <FaUserCircle className="text-[2.5rem]" />
                </div>
                <span className="text-sm font-medium text-slate-700">Profil Saya</span>
              </Link>

              {/* Tombol Logout Mobile */}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-red-500 hover:bg-red-50 transition text-left"
              >
                <div className="flex h-8 w-8 items-center justify-center ml-1">
                   <FiLogOut className="text-xl" />
                </div>
                <span className="text-sm font-bold">Keluar Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}