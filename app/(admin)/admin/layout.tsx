"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/features/admin/AdminSidebar";
import { AdminStatsProvider } from "@/components/features/admin/AdminStatsContext";
import { getTokenPayload } from "@/lib/clientAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  // Proxy sudah menolak non-admin; cek ulang di klien sebelum memuat data admin.
  useEffect(() => {
    const payload = getTokenPayload();
    if (!payload) {
      router.replace("/login");
      return;
    }
    if (payload.role !== "ADMIN") {
      router.replace("/home");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- token cookie hanya bisa dibaca di klien
    setIsAdmin(true);
  }, [router]);

  if (!isAdmin) return null;

  return (
    <AdminStatsProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </div>
      </div>
    </AdminStatsProvider>
  );
}
