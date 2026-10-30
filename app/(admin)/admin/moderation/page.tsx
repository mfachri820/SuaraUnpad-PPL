"use client";

import ModerationQueue from '@/components/features/admin/ModerationQueue';
import { useAdminStats } from '@/components/features/admin/AdminStatsContext';

export default function AdminModerationPage() {
  const { refresh } = useAdminStats();

  return (
    <>
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Moderasi konten</h1>
        <p className="text-sm leading-relaxed text-slate-800">Tinjau komentar dan postingan yang dilaporkan pengguna.</p>
      </header>
      <ModerationQueue onActionDone={refresh} />
    </>
  );
}
