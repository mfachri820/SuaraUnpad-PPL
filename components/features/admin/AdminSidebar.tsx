"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { FiMenu, FiX, FiGrid, FiAlertTriangle, FiShield, FiEdit3, FiExternalLink, FiLogOut } from "react-icons/fi";
import { useAdminStats } from "./AdminStatsContext";

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { stats } = useAdminStats();

  const links = [
    { name: "Dashboard", href: "/admin", icon: FiGrid, badge: undefined },
    { name: "Laporan fasilitas", href: "/admin/reports", icon: FiAlertTriangle, badge: stats?.sla.reports.open },
    { name: "Moderasi", href: "/admin/moderation", icon: FiShield, badge: stats?.pendingFlags.total },
    { name: "Kelola konten", href: "/admin/content", icon: FiEdit3, badge: undefined },
  ];

  const handleLogout = () => {
    Cookies.remove("token");
    setIsOpen(false);
    router.push("/login");
    router.refresh();
  };

  const brand = (
    <Link href="/admin" className="flex items-baseline gap-2 text-xl font-black tracking-tight" onClick={() => setIsOpen(false)}>
      <span><span className="text-[#2682F9]">Suara</span><span className="text-[#F99D26]">MIPA</span></span>
      <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Admin</span>
    </Link>
  );

  return (
    <>
      {/* TOP BAR MOBILE */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Tutup menu admin" : "Buka menu admin"}
          aria-expanded={isOpen}
          className="p-1 text-slate-600 hover:text-[#2682F9]"
        >
          {isOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
        </button>
      </header>

      {isOpen && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setIsOpen(false)} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-5">{brand}</div>

        <nav aria-label="Navigasi admin" className="flex-1 space-y-1 px-3">
          {links.map(({ name, href, icon: Icon, badge }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-[#2682F9]/10 text-[#2682F9]" : "text-slate-700 hover:bg-slate-50 hover:text-[#2682F9]"
                }`}
              >
                <Icon className="text-lg" aria-hidden="true" />
                <span className="flex-1">{name}</span>
                {badge != null && badge > 0 && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold tabular-nums text-white">{badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-slate-200 px-3 py-4">
          <Link
            href="/home"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#2682F9]"
          >
            <FiExternalLink className="text-lg" aria-hidden="true" />
            Lihat situs
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-500 hover:bg-red-50"
          >
            <FiLogOut className="text-lg" aria-hidden="true" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
