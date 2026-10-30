"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import type { AdminStats } from "@/lib/api/types";

interface AdminStatsValue {
  stats: AdminStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AdminStatsContext = createContext<AdminStatsValue | null>(null);

// Satu sumber statistik untuk seluruh panel admin (badge sidebar, dashboard, dan antrean).
export function AdminStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStats(await apiFetch<AdminStats>("/api/admin/stats"));
      setError(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Gagal memuat statistik admin"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AdminStatsContext.Provider value={{ stats, loading, error, refresh }}>
      {children}
    </AdminStatsContext.Provider>
  );
}

export function useAdminStats() {
  const value = useContext(AdminStatsContext);
  if (!value) throw new Error("useAdminStats harus dipakai di dalam AdminStatsProvider");
  return value;
}
