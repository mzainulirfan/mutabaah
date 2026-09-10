// Shared progress calculation — PRD §14-17
export function habitProgress(type: string, value: number, target: number): number {
  if (value <= 0) return 0;
  if (type === "BOOLEAN") return 100;
  return Math.round(Math.min(100, (value / target) * 100));
}

// Satu-satunya penilai per-amalan yang sadar status. Tanpa entri / PENDING → 0,
// COMPLETED → 100, sisanya ikut angka. SKIPPED tetap dihitung seperti sekarang
// (tidak dikeluarkan dari rata-rata) — mengubahnya butuh keputusan produk.
export function entryProgress(type: string, value: number, target: number, status?: string): number {
  if (!status || status === "PENDING") return 0;
  if (status === "COMPLETED") return 100;
  return habitProgress(type, value, target);
}

export function dailyProgress(items: { type: string; target: number; value: number; status?: string }[]): number {
  if (items.length === 0) return 0;
  const sum = items.reduce(
    (a, i) => a + (i.status === undefined ? habitProgress(i.type, i.value, i.target) : entryProgress(i.type, i.value, i.target, i.status)),
    0
  );
  return Math.round(sum / items.length);
}

export function isStreakDay(progress: number, threshold = 70) {
  return progress >= threshold;
}

export function calcStreak(dailyValues: number[], threshold = 70): number {
  let streak = 0;
  for (let i = dailyValues.length - 1; i >= 0; i--) {
    if (dailyValues[i] >= threshold) streak++;
    else break;
  }
  return streak;
}

export function calendarStatus(progress: number | null): "completed" | "partial" | "low" | "none" {
  if (progress === null) return "none";
  if (progress >= 85) return "completed";
  if (progress >= 50) return "partial";
  if (progress > 0) return "low";
  return "none";
}
