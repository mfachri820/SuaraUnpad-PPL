"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { FiMenu, FiX, FiLogOut } from "react-icons/fi";
import { IoMdExit } from "react-icons/io";
import { FaUserCircle } from "react-icons/fa";
import PolicyCreateModal from "@/components/features/policies/PolicyCreateModal";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Bungkus prosesnya ke dalam fungsi asinkron (async)
    const checkUserRole = async () => {
      const token = Cookies.get("token");
      if (token) {
        try {
          const payloadBase64 = token.split(".")[1];
          const decodedJson = atob(payloadBase64);
          const payload = JSON.parse(decodedJson);

          // Karena dibungkus async, React tidak akan menganggap ini sebagai "cascading render"
          setUserRole(payload.role);
        } catch {
          console.error("Gagal decode token");
        }
      }
    };

    // Panggil fungsinya
    checkUserRole();
  }, []);

  const navLinks = [
    { name: "Beranda", href: "/home" },
    { name: "Aspirasi", href: "/aspirasi" },
    { name: "Lapor", href: "/report" },
    { name: "Notifikasi", href: "/notif" }
  ];

  const isAdmin = userRole === "ADMIN";

  const handleLogout = async () => {
    try {
      Cookies.remove("token");
      setIsOpen(false);
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Gagal melakukan logout:", error);
      Cookies.remove("token");
      router.push("/login");
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* LOGO: Disesuaikan ukurannya untuk mobile & pakai shrink-0 */}
          <Link
            href="/"
            className="flex shrink-0 items-center text-xl sm:text-2xl font-black text-black tracking-tight hover:underline underline-offset-2"
          >
            <span className="text-[#2682F9]">Suara</span>
            <span className="text-[#F99D26]">Unpad</span>
          </Link>

          {/* MENU DESKTOP */}
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
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-slate-600 transition hover:text-[#2682F9]"
                >
                  Admin
                </Link>
              )}
              {/* TOMBOL KHUSUS LECTURER & ADMIN */}
              {(userRole === "LECTURER" || isAdmin) && (
                <button
                  onClick={() => setIsPolicyModalOpen(true)}
                  className="flex items-center gap-1 text-sm font-medium text-white bg-[#2682F9] px-3 py-1.5 rounded-lg hover:bg-[#3995FF] transition hover:cursor-pointer"
                >
                  Kebijakan Baru
                </button>
              )}
            </div>

            <div className="h-5 w-px bg-slate-400"></div>

            <div className="flex items-center gap-4">
              <Link
                href="/profil"
                className="flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#2682F9]"
              >
                Profil
              </Link>

              <div className="h-4 w-px bg-slate-300"></div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm font-bold text-red-500 hover:underline hover:cursor-pointer"
                title="Keluar dari akun"
              >
                <IoMdExit className="text-lg" />
                Keluar
              </button>
            </div>
          </div>

          {/* MENU MOBILE: pakai shrink-0 agar tidak kegencet logo */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-4 md:hidden">
            <Link
              href="/report"
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-[#F99D26] px-3 sm:px-4 py-1.5 text-xs font-bold text-white transition hover:bg-orange-500"
            >
              LAPOR
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-center p-1 text-slate-600 transition hover:text-[#2682F9] focus:outline-none"
            >
              {isOpen ? (
                <FiX className="text-3xl" />
              ) : (
                <FiMenu className="text-3xl" />
              )}
            </button>
          </div>
        </div>

        {/* DROPDOWN MOBILE */}
        {isOpen && (
          <div className="border-t border-slate-100 bg-white md:hidden absolute w-full left-0 shadow-lg">
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

              <div className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-4">
                <Link
                  href="/profil"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                    <FaUserCircle className="text-[2.5rem]" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    Profil Saya
                  </span>
                </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
                >
                  <span className="text-sm font-medium text-slate-700">Admin</span>
                </Link>
              )}

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
      {isPolicyModalOpen && (
        <PolicyCreateModal onClose={() => setIsPolicyModalOpen(false)} />
      )}
    </>
  );
}
