"use client";

import ReportTrendChart from '@/components/features/admin/ReportTrendChart';
import ReportBreakdown from '@/components/features/admin/ReportBreakdown';
import { AdminNotice } from '@/components/features/admin/AdminUI';
import { useAdminStats } from '@/components/features/admin/AdminStatsContext';
import { formatAge, formatDuration } from '@/lib/duration';

const durationOrEmpty = (ms: number | null) => (ms == null ? '—' : formatDuration(ms));

export default function AdminDashboardPage() {
  const { stats, loading, error } = useAdminStats();

  return (
    <>
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Dashboard admin</h1>
        <p className="text-sm leading-relaxed text-slate-800">
          Pantau waktu penanganan laporan dan moderasi konten.
        </p>
      </header>

      <section aria-labelledby="ringkasan-sla-title" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ringkasan-sla-title" className="text-lg font-bold text-slate-900">Waktu penanganan</h2>
          {stats && <p className="text-xs text-slate-700">Rata-rata dari {stats.sla.windowDays} hari terakhir</p>}
        </div>
        {loading ? (
          <p role="status" className="admin-empty">Memuat ringkasan aktivitas...</p>
        ) : error ? (
          <AdminNotice feedback={{ type: 'error', message: error }} />
        ) : stats ? (
          <>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {[
                {
                  label: 'Laporan terbuka',
                  value: String(stats.sla.reports.open),
                  detail: `${stats.sla.reports.resolvedLast7Days} selesai dalam 7 hari`,
                  color: 'text-laporan-foreground',
                },
                {
                  label: 'Laporan tertua menunggu',
                  value: stats.sla.reports.oldestOpenAt ? formatAge(stats.sla.reports.oldestOpenAt) : '—',
                  detail: stats.sla.reports.oldestOpenAt ? 'sejak laporan dibuat' : 'Tidak ada laporan terbuka',
                  color: 'text-laporan-foreground',
                },
                {
                  label: 'Rata-rata verifikasi',
                  value: durationOrEmpty(stats.sla.reports.avgVerifyMs),
                  detail: 'dari laporan masuk',
                  color: 'text-slate-900',
                },
                {
                  label: 'Rata-rata selesai',
                  value: durationOrEmpty(stats.sla.reports.avgResolveMs),
                  detail: `dari ${stats.sla.reports.resolvedSample} laporan selesai`,
                  color: 'text-slate-900',
                },
                {
                  label: 'Konten menunggu moderasi',
                  value: String(stats.pendingFlags.total),
                  detail: stats.sla.flags.oldestPendingAt
                    ? `tertua ${formatAge(stats.sla.flags.oldestPendingAt)}`
                    : 'Tidak ada yang menunggu',
                  color: 'text-red-700',
                },
                {
                  label: 'Rata-rata tinjau laporan konten',
                  value: durationOrEmpty(stats.sla.flags.avgReviewMs),
                  detail: `dari ${stats.sla.flags.reviewedSample} laporan ditinjau`,
                  color: 'text-slate-900',
                },
              ].map(({ label, value, detail, color }) => (
                <div key={label} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                  <dt className="text-sm font-medium leading-5 text-slate-800">{label}</dt>
                  <dd className={'mt-2 break-words text-xl font-bold tabular-nums sm:text-2xl ' + color}>{value}</dd>
                  <dd className="mt-1 text-xs leading-5 text-slate-700">{detail}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-slate-700">
              Total: {stats.totalPosts} postingan · {stats.totalAnnouncements} pengumuman · {stats.totalPolicies} wacana · {stats.totalReports} laporan fasilitas
            </p>
            <ReportTrendChart daily={stats.sla.reports.daily} />
            <ReportBreakdown reports={stats.sla.reports} />
          </>
        ) : null}
      </section>
    </>
  );
}
