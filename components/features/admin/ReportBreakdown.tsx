"use client";

import { useState } from "react";
import { REPORT_CATEGORY_LABELS, REPORT_STATUS_LABELS, ReportCategory, ReportStatus, SlaSummary } from "@/lib/api/types";

import { AdminPanel } from "./AdminUI";

type ReportSla = SlaSummary["reports"];

// Ramp ordinal satu hue (biru 250 → 650), tervalidasi: terang ke gelap, ujung terang ≥ 2:1.
const ORDINAL_BLUE = ["#86b6ef", "#5598e7", "#256abf", "#104281"];
const BAR_COLOR = "#2a78d6";

const STAGES: ReportStatus[] = ["SUBMITTED", "VERIFIED", "IN_PROGRESS", "RESOLVED"];
const AGE_BUCKETS = [
  { key: "under1d", label: "< 1 hari" },
  { key: "d1to3", label: "1–3 hari" },
  { key: "d3to7", label: "3–7 hari" },
  { key: "over7d", label: "> 7 hari" }
] as const;

const percent = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

function Block({ title, children, summary }: { title: string; children: React.ReactNode; summary: string }) {
  return (
    <div className="min-w-0 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {children}
      <p className="text-xs text-slate-700">{summary}</p>
    </div>
  );
}

function HorizontalBars({ rows, label }: { rows: { label: string; value: number; color: string }[]; label: string }) {
  const max = Math.max(1, ...rows.map(row => row.value));
  return (
    <ul className="space-y-2" aria-label={label}>
      {rows.map(row => (
        <li key={row.label} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-slate-800" title={row.label}>{row.label}</span>
          <span className="h-3 rounded-r bg-slate-100" aria-hidden="true">
            {row.value > 0 && (
              <span className="block h-full rounded-r" style={{ width: `${(row.value / max) * 100}%`, backgroundColor: row.color }} />
            )}
          </span>
          <span className="min-w-6 text-right tabular-nums text-slate-900">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}

function stageSummary(byStatus: Record<ReportStatus, number>, total: number) {
  if (total === 0) return "Belum ada laporan.";
  return `${percent(byStatus.RESOLVED, total)}% selesai · ${byStatus.SUBMITTED} menunggu verifikasi`;
}

function categorySummary(rows: { label: string; value: number }[]) {
  return rows.length > 0 ? `Terbanyak: ${rows[0].label.toLowerCase()}` : "Belum ada laporan.";
}

function ageSummary(openAge: ReportSla["openAge"], open: number) {
  if (open === 0) return "Tidak ada laporan terbuka.";
  return openAge.over7d > 0 ? `${openAge.over7d} laporan menunggu lebih dari seminggu` : "Tidak ada yang menunggu lebih dari seminggu";
}

export default function ReportBreakdown({ reports }: { reports: ReportSla }) {
  const [activeStage, setActiveStage] = useState<ReportStatus | null>(null);
  const total = STAGES.reduce((sum, stage) => sum + reports.byStatus[stage], 0);

  const categoryRows = (Object.keys(REPORT_CATEGORY_LABELS) as ReportCategory[])
    .map(category => ({ label: REPORT_CATEGORY_LABELS[category], value: reports.byCategory[category] ?? 0, color: BAR_COLOR }))
    .filter(row => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const ageRows = AGE_BUCKETS.map((bucket, index) => ({
    label: bucket.label,
    value: reports.openAge[bucket.key],
    color: ORDINAL_BLUE[index]
  }));

  return (
    <AdminPanel
      id="komposisi-laporan"
      title="Komposisi laporan fasilitas"
      accent="orange"
    >
      <div className="space-y-6">
        <Block title="Tahap penanganan" summary={stageSummary(reports.byStatus, total)}>
          <div
            className={"flex h-6 w-full gap-0.5 overflow-hidden rounded " + (total === 0 ? "bg-slate-100" : "bg-white")}
            role="img"
            aria-label={STAGES.map(stage => `${REPORT_STATUS_LABELS[stage]} ${percent(reports.byStatus[stage], total)}%`).join(", ")}
            onPointerLeave={() => setActiveStage(null)}
          >
            {STAGES.map((stage, index) => reports.byStatus[stage] > 0 && (
              <span
                key={stage}
                className="h-full transition-opacity"
                style={{
                  flex: `${reports.byStatus[stage]} 1 0`,
                  backgroundColor: ORDINAL_BLUE[index],
                  opacity: activeStage && activeStage !== stage ? 0.4 : 1
                }}
                onPointerEnter={() => setActiveStage(stage)}
                onPointerDown={() => setActiveStage(stage)}
              />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4" aria-label="Keterangan tahap">
            {STAGES.map((stage, index) => (
              <li
                key={stage}
                className={"flex items-center gap-2 rounded-md px-1 transition-colors " + (activeStage === stage ? "bg-slate-100" : "")}
              >
                <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: ORDINAL_BLUE[index] }} />
                <span className="min-w-0 truncate text-slate-800">{REPORT_STATUS_LABELS[stage]}</span>
                <span className="ml-auto tabular-nums text-slate-900" title={`${reports.byStatus[stage]} laporan`}>
                  {percent(reports.byStatus[stage], total)}%
                </span>
              </li>
            ))}
          </ul>
        </Block>

        <div className="grid gap-6 md:grid-cols-2">
          <Block title="Kategori laporan" summary={categorySummary(categoryRows)}>
            <HorizontalBars rows={categoryRows} label="Jumlah laporan per kategori" />
          </Block>

          <Block title="Lama menunggu" summary={ageSummary(reports.openAge, reports.open)}>
            <HorizontalBars rows={ageRows} label="Jumlah laporan terbuka per lama menunggu" />
          </Block>
        </div>
      </div>
    </AdminPanel>
  );
}
