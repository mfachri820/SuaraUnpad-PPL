import Link from "next/link";
import { FiMapPin, FiMail, FiPhone, FiClock } from "react-icons/fi";
import { FaFacebookF, FaInstagram, FaTwitter } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white pt-12 pb-8 px-4 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <Link href="/" className="mb-2 text-3xl font-black tracking-tight">
              <span className="text-[#2682F9]">Suara</span>
              <span className="text-[#F99D26]">Unpad</span>
            </Link>
            <p className="text-lg text-slate-700 leading-snug">
              Sebuah <span className="italic">one-stop</span> platform{" "}
              <br className="hidden md:block" />
              untuk Unpad yang lebih <span className="font-bold">UNGGUL</span>
            </p>
          </div>

          <div className="flex flex-col gap-6 md:min-w-75">
            {/* List Kontak */}
            <div className="flex flex-col gap-3">
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

            <div className="flex items-center gap-6 mt-2">
              <Link
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e293b] text-white shadow-sm transition hover:bg-[#2682F9] hover:scale-105"
              >
                <FaFacebookF />
              </Link>
              <Link
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e293b] text-white shadow-sm transition hover:bg-[#2682F9] hover:scale-105"
              >
                <FaInstagram />
              </Link>
              <Link
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e293b] text-white shadow-sm transition hover:bg-[#2682F9] hover:scale-105"
              >
                <FaTwitter />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} SuaraUnpad. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
