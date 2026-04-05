"use client";

import { useState } from "react";
import Link from "next/link";
import { FiMenu, FiX } from "react-icons/fi";
import { FaUserCircle } from "react-icons/fa";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Beranda", href: "/" },
    { name: "Aktivitas", href: "/aktivitas" },
    { name: "Lapor", href: "/report" },
    { name: "Notifikasi", href: "/notifikasi" }
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-300 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center text-2xl font-black text-slate-300 tracking-tight hover:underline underline-offset-2"
        >
          <span className="text-[#2682F9]">Suara</span>
          <span className="text-[#F99D26]">Unpad</span>
        </Link>

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

          <div className="flex items-center gap-3">
            <Link
              href="/profil"
              className="text-sm font-medium text-slate-600 transition hover:text-[#2682F9]"
            >
              Profil
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500">
              <FaUserCircle className="text-[2.0rem]" />
            </div>
          </div>
        </div>

        
        <div className="flex items-center gap-4 md:hidden">
          {/* Tombol Quick Access Lapor */}
          <Link
            href="/report"
            onClick={() => setIsOpen(false)}
            className="rounded-lg bg-[#F99D26] px-4 py-1.5 text-xs font-bold text-white  transition hover:bg-orange-500"
          >
            LAPOR
          </Link>

          {/* Tombol Hamburger */}
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

            <div className="mt-2 border-t border-slate-100 pt-4">
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
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
