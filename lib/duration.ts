const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Durasi ringkas berbahasa Indonesia, maksimal dua satuan: "3 hari 4 jam", "2 jam 5 menit", "45 menit".
export function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < MINUTE_MS) return "< 1 menit";

  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);

  if (days > 0) return hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`;
  if (hours > 0) return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`;
  return `${minutes} menit`;
}

// Lama waktu sejak tanggal tertentu sampai sekarang.
export function formatAge(date: string | Date, now = new Date()) {
  return formatDuration(now.getTime() - new Date(date).getTime());
}
