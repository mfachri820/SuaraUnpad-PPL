import Link from "next/link";
import { FiMapPin, FiMail, FiPhone, FiClock } from "react-icons/fi";
import { FaFacebookF, FaInstagram, FaTwitter } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white pt-12 pb-8 px-4 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          {/* KOLOM KIRI: Brand & Deskripsi */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <Link href="/" className="mb-2 text-3xl font-black tracking-tight">
              <span className="text-[#2682F9]">Suara</span>
              <span className="text-[#F99D26]">Unpad</span>
            </Link>
            <p className="text-base sm:text-lg text-slate-700 leading-snug">
              Sebuah <span className="italic">one-stop</span> platform{" "}
              <br className="hidden md:block" />
              untuk Unpad yang lebih <span className="font-bold">UNGGUL</span>
            </p>
          </div>

          {/* KOLOM KANAN: Kontak & Sosial Media */}
          {/* FIX: Hapus md:min-w-75 yang tidak valid, pakai w-full md:w-auto */}
          <div className="flex flex-col gap-6 w-full md:w-auto">
            {/* List Kontak: Rata kiri secara teks, tapi block-nya rata tengah di HP */}
            <div className="flex flex-col gap-3 w-max mx-auto md:mx-0">
              <div className="flex items-center gap-3 text-slate-600">
                <FiMapPin className="text-xl text-[#F99D26] shrink-0" />
                <span className="text-sm">
                  Jl. Raya Bandung-Sumedang KM.21, Jatinangor
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <FiMail className="text-xl text-[#F99D26] shrink-0" />
                <span className="text-sm">suara@unpad.ac.id</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <FiPhone className="text-xl text-[#F99D26] shrink-0" />
                <span className="text-sm">+62 22 7796320</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <FiClock className="text-xl text-[#F99D26] shrink-0" />
                <span className="text-sm">Senin-Jumat, 08.00 - 16.00 WIB</span>
              </div>
            </div>

            {/* Ikon Sosial Media: Center di HP, Left di Desktop */}
            <div className="flex items-center justify-center md:justify-start gap-6 mt-2">
              <Link
                href="https://web.facebook.com/unpad/"
                target="_blank"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e293b] text-white shadow-sm transition hover:bg-[#2682F9] hover:scale-105 shrink-0"
              >
                <FaFacebookF />
              </Link>
              <Link
                href="https://www.instagram.com/universitaspadjadjaran/"
                target="_blank"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e293b] text-white shadow-sm transition hover:bg-[#2682F9] hover:scale-105 shrink-0"
              >
                <FaInstagram />
              </Link>
              <Link
                href="https://x.com/unpad"
                target="_blank"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e293b] text-white shadow-sm transition hover:bg-[#2682F9] hover:scale-105 shrink-0"
              >
                <FaTwitter />
              </Link>
            </div>
          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="mt-12 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} SuaraUnpad. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
