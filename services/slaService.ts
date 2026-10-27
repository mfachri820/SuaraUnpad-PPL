import { prisma } from '@/lib/prisma';
import type { ReportCategory, ReportStatus } from '@prisma/client';

const DAY_MS = 24 * 60 * 60 * 1000;
const AVERAGE_WINDOW_DAYS = 30;
const RECENT_WINDOW_DAYS = 7;
const TREND_DAYS = 14;
const TREND_TIMEZONE = 'Asia/Jakarta';

type AverageRow = { avg_seconds: number | null; sample: bigint };
type TrendRow = { day: string; created: bigint; resolved: bigint };
type AgeRow = { under1d: bigint; d1to3: bigint; d3to7: bigint; over7d: bigint };

// Rata-rata dihitung di Postgres supaya tidak perlu memuat semua baris.
function toAverage(row: AverageRow | undefined) {
  const sample = Number(row?.sample ?? 0);
  const avgMs = row?.avg_seconds != null ? Math.round(Number(row.avg_seconds) * 1000) : null;
  return { avgMs, sample };
}

export const slaService = {
  async getSlaSummary(now = new Date()) {
    const averageSince = new Date(now.getTime() - AVERAGE_WINDOW_DAYS * DAY_MS);
    const recentSince = new Date(now.getTime() - RECENT_WINDOW_DAYS * DAY_MS);

    const [statusGroups, oldestOpen, resolvedRecently, verifyRows, resolveRows, pendingFlags, oldestFlag, reviewRows, trendRows, categoryGroups, ageRows] =
      await Promise.all([
        prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.report.findFirst({
          where: { status: { not: 'RESOLVED' } },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        }),
        prisma.report.count({ where: { status: 'RESOLVED', resolvedAt: { gte: recentSince } } }),
        prisma.$queryRaw<AverageRow[]>`
          SELECT AVG(EXTRACT(EPOCH FROM ("verified_at" - "created_at")))::float8 AS avg_seconds, COUNT(*) AS sample
          FROM "reports" WHERE "verified_at" >= ${averageSince}`,
        prisma.$queryRaw<AverageRow[]>`
          SELECT AVG(EXTRACT(EPOCH FROM ("resolved_at" - "created_at")))::float8 AS avg_seconds, COUNT(*) AS sample
          FROM "reports" WHERE "status" = 'RESOLVED' AND "resolved_at" >= ${averageSince}`,
        prisma.contentFlag.count({ where: { status: 'PENDING' } }),
        prisma.contentFlag.findFirst({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        }),
        prisma.$queryRaw<AverageRow[]>`
          SELECT AVG(EXTRACT(EPOCH FROM ("reviewed_at" - "created_at")))::float8 AS avg_seconds, COUNT(*) AS sample
          FROM "content_flags" WHERE "status" <> 'PENDING' AND "reviewed_at" >= ${averageSince}`,
        // Laporan masuk & selesai per hari kalender WIB; kolom disimpan sebagai UTC tanpa zona.
        prisma.$queryRaw<TrendRow[]>`
          WITH bounds AS (SELECT (${now.toISOString()}::timestamptz AT TIME ZONE ${TREND_TIMEZONE})::date AS today),
          days AS (
            SELECT generate_series(today - ${TREND_DAYS - 1}::int, today, interval '1 day')::date AS day FROM bounds
          )
          SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
            (SELECT COUNT(*) FROM "reports" r
              WHERE (r."created_at" AT TIME ZONE 'UTC' AT TIME ZONE ${TREND_TIMEZONE})::date = d.day) AS created,
            (SELECT COUNT(*) FROM "reports" r
              WHERE (r."resolved_at" AT TIME ZONE 'UTC' AT TIME ZONE ${TREND_TIMEZONE})::date = d.day) AS resolved
          FROM days d ORDER BY d.day`,
        prisma.report.groupBy({ by: ['category'], _count: { _all: true } }),
        // Lama menunggu laporan yang belum selesai, dihitung sejak laporan dibuat.
        prisma.$queryRaw<AgeRow[]>`
          SELECT
            COUNT(*) FILTER (WHERE age < interval '1 day') AS under1d,
            COUNT(*) FILTER (WHERE age >= interval '1 day' AND age < interval '3 days') AS d1to3,
            COUNT(*) FILTER (WHERE age >= interval '3 days' AND age < interval '7 days') AS d3to7,
            COUNT(*) FILTER (WHERE age >= interval '7 days') AS over7d
          FROM (SELECT (${now.toISOString()}::timestamptz AT TIME ZONE 'UTC') - "created_at" AS age FROM "reports" WHERE "status" <> 'RESOLVED') open_reports`
      ]);

    const byStatus: Record<ReportStatus, number> = { SUBMITTED: 0, VERIFIED: 0, IN_PROGRESS: 0, RESOLVED: 0 };
    for (const group of statusGroups) byStatus[group.status] = group._count._all;

    const byCategory = {} as Partial<Record<ReportCategory, number>>;
    for (const group of categoryGroups) byCategory[group.category] = group._count._all;
    const age = ageRows[0];

    const verify = toAverage(verifyRows[0]);
    const resolve = toAverage(resolveRows[0]);
    const review = toAverage(reviewRows[0]);

    return {
      windowDays: AVERAGE_WINDOW_DAYS,
      reports: {
        byStatus,
        open: byStatus.SUBMITTED + byStatus.VERIFIED + byStatus.IN_PROGRESS,
        oldestOpenAt: oldestOpen?.createdAt ?? null,
        resolvedLast7Days: resolvedRecently,
        avgVerifyMs: verify.avgMs,
        avgResolveMs: resolve.avgMs,
        resolvedSample: resolve.sample,
        byCategory,
        openAge: {
          under1d: Number(age?.under1d ?? 0),
          d1to3: Number(age?.d1to3 ?? 0),
          d3to7: Number(age?.d3to7 ?? 0),
          over7d: Number(age?.over7d ?? 0)
        },
        daily: trendRows.map((row) => ({ day: row.day, created: Number(row.created), resolved: Number(row.resolved) }))
      },
      flags: {
        pending: pendingFlags,
        oldestPendingAt: oldestFlag?.createdAt ?? null,
        avgReviewMs: review.avgMs,
        reviewedSample: review.sample
      }
    };
  }
};
