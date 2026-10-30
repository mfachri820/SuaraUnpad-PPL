"use client";

import ReportQueue from '@/components/features/admin/ReportQueue';
import { useAdminStats } from '@/components/features/admin/AdminStatsContext';

export default function AdminReportsPage() {
  const { stats, refresh } = useAdminStats();

  return (
    <>
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Laporan fasilitas</h1>
        <p className="text-sm leading-relaxed text-slate-800">Verifikasi, proses, dan selesaikan laporan kerusakan fasilitas.</p>
      </header>
      <ReportQueue counts={stats?.sla.reports.byStatus} onActionDone={refresh} />
    </>
  );
}
