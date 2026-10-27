"use client";

import { useEffect, useRef, useState } from "react";

import { AdminPanel } from "./AdminUI";

type DailyPoint = { day: string; created: number; resolved: number };

// Dua slot kategorikal tervalidasi (CVD ΔE 24.7, kontras ≥ 3:1 pada latar putih).
const SERIES = [
  { key: "created", label: "Laporan masuk", color: "#2a78d6" },
  { key: "resolved", label: "Laporan selesai", color: "#eb6834" }
] as const;

const HEIGHT = 220;
const MARGIN = { top: 12, right: 8, bottom: 28, left: 32 };
const BAR_GAP = 2;
const RADIUS = 4;

function formatDay(day: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("id-ID", options);
}

// Langkah sumbu-y bulat (1, 2, 5, 10, ...) dengan paling banyak 4 garis.
function niceTicks(max: number) {
  const target = Math.max(max, 1);
  const raw = target / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map(m => m * magnitude).find(s => s >= raw) ?? magnitude * 10;
  const stepInt = Math.max(1, Math.ceil(step));
  const top = Math.ceil(target / stepInt) * stepInt;
  return Array.from({ length: top / stepInt + 1 }, (_, i) => i * stepInt);
}

// Batang dengan ujung atas membulat 4px dan alas rata di garis dasar.
function barPath(x: number, y: number, width: number, height: number) {
  if (height <= 0) return "";
  const r = Math.min(RADIUS, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

export default function ReportTrendChart({ daily }: { daily: DailyPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [showTable]);

  const totals = { created: 0, resolved: 0 };
  for (const point of daily) {
    totals.created += point.created;
    totals.resolved += point.resolved;
  }

  const ticks = niceTicks(Math.max(0, ...daily.map(point => Math.max(point.created, point.resolved))));
  const yMax = ticks[ticks.length - 1];
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const band = daily.length > 0 ? plotWidth / daily.length : 0;
  const groupWidth = Math.min(band * 0.7, 28);
  const barWidth = Math.max(1, (groupWidth - BAR_GAP) / 2);
  const y = (value: number) => MARGIN.top + plotHeight - (value / yMax) * plotHeight;
  // Label tanggal tiap 2 hari bila sempit supaya tidak bertumpuk.
  const labelEvery = band < 36 ? 2 : 1;
  const activePoint = active !== null ? daily[active] : null;

  return (
    <AdminPanel
      id="tren-laporan"
      title="Tren laporan fasilitas"
      accent="orange"
      description={`Laporan masuk dan selesai per hari, ${daily.length} hari terakhir.`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-800" aria-label="Keterangan grafik">
          {SERIES.map(series => (
            <li key={series.key} className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ backgroundColor: series.color }} />
              {series.label} <span className="font-semibold tabular-nums text-slate-900">{totals[series.key]}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setShowTable(value => !value)}
          aria-pressed={showTable}
          className="cursor-pointer text-sm font-medium text-wacana-foreground underline-offset-2 hover:underline"
        >
          {showTable ? "Lihat grafik" : "Lihat tabel"}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700">
                <th scope="col" className="py-2 pr-4 font-medium">Tanggal</th>
                {SERIES.map(series => <th key={series.key} scope="col" className="py-2 pr-4 text-right font-medium">{series.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {daily.map(point => (
                <tr key={point.day} className="border-b border-slate-100 text-slate-900">
                  <td className="py-1.5 pr-4">{formatDay(point.day, { weekday: "short", day: "numeric", month: "short" })}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">{point.created}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">{point.resolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={containerRef} className="relative w-full" style={{ height: HEIGHT }}>
          {width > 0 && (
            <svg
              width={width}
              height={HEIGHT}
              role="img"
              aria-label={`Grafik batang: ${totals.created} laporan masuk dan ${totals.resolved} laporan selesai dalam ${daily.length} hari terakhir.`}
              onPointerLeave={() => setActive(null)}
            >
              {ticks.map(tick => (
                <g key={tick}>
                  <line
                    x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)}
                    stroke={tick === 0 ? "#cbd5e1" : "#f1f5f9"} strokeWidth={1}
                  />
                  <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-slate-600 text-[11px] tabular-nums">
                    {tick}
                  </text>
                </g>
              ))}

              {daily.map((point, index) => {
                const groupX = MARGIN.left + index * band + (band - groupWidth) / 2;
                const isDimmed = active !== null && active !== index;
                return (
                  <g key={point.day} opacity={isDimmed ? 0.45 : 1}>
                    {SERIES.map((series, seriesIndex) => {
                      const value = point[series.key];
                      const x = groupX + seriesIndex * (barWidth + BAR_GAP);
                      return <path key={series.key} d={barPath(x, y(value), barWidth, y(0) - y(value))} fill={series.color} />;
                    })}
                    {index % labelEvery === (daily.length - 1) % labelEvery && (
                      <text
                        x={MARGIN.left + index * band + band / 2} y={HEIGHT - 8}
                        textAnchor="middle" className="fill-slate-600 text-[11px] tabular-nums"
                      >
                        {formatDay(point.day, { day: "numeric" })}
                      </text>
                    )}
                    {/* Area sentuh selebar satu kolom hari, lebih besar dari batangnya. */}
                    <rect
                      x={MARGIN.left + index * band} y={MARGIN.top} width={band} height={plotHeight}
                      fill="transparent"
                      onPointerEnter={() => setActive(index)}
                      onPointerDown={() => setActive(index)}
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {activePoint && active !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 min-w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
              style={{
                left: Math.min(Math.max(MARGIN.left + active * band + band / 2 - 80, 0), Math.max(0, width - 160))
              }}
            >
              <p className="mb-1 font-semibold text-slate-900">{formatDay(activePoint.day, { weekday: "long", day: "numeric", month: "long" })}</p>
              {SERIES.map(series => (
                <p key={series.key} className="flex items-center justify-between gap-3 text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ backgroundColor: series.color }} />
                    {series.label}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">{activePoint[series.key]}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </AdminPanel>
  );
}
