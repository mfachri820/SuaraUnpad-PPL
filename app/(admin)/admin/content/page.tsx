"use client";

import { useCallback, useEffect, useState } from 'react';
import { fetchPolicies } from '@/components/features/policies/PolicyFetch';
import type { Policy } from '@/components/features/policies/types';
import AnnouncementForm from '@/components/features/admin/AnnouncementForm';
import PolicyStatusForm from '@/components/features/admin/PolicyStatusForm';
import PolicyCreateForm from '@/components/features/admin/PolicyCreateForm';
import { useAdminStats } from '@/components/features/admin/AdminStatsContext';

// Kartu sebaris sama tinggi (pengumuman + status wacana, lalu buat wacana); tombol kirim menempel di bawah.
const CONTENT_PANEL = 'flex h-full flex-col';

export default function AdminContentPage() {
  const { refresh } = useAdminStats();
  const [policies, setPolicies] = useState<Policy[]>([]);

  const loadPolicies = useCallback(async () => {
    try {
      setPolicies(await fetchPolicies());
    } catch (err: unknown) {
      console.error('Gagal memuat daftar wacana', err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- muat daftar wacana sekali saat halaman dibuka
    void loadPolicies();
  }, [loadPolicies]);

  const handlePolicyCreated = async () => {
    await Promise.all([loadPolicies(), refresh()]);
  };

  return (
    <>
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Kelola konten</h1>
        <p className="text-sm leading-relaxed text-slate-800">Buat pengumuman dan wacana kebijakan.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <AnnouncementForm onCreated={refresh} className={CONTENT_PANEL} />
        <PolicyStatusForm policies={policies} onUpdated={loadPolicies} className={CONTENT_PANEL} />
        <PolicyCreateForm onCreated={handlePolicyCreated} className={CONTENT_PANEL} />
      </div>
    </>
  );
}
