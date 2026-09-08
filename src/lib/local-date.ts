/** Kunci hari mutabaah berdasarkan kalender dan zona waktu perangkat pengguna. */
export function localDateKey(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Menggeser hari pada kalender lokal; aman untuk perubahan zona waktu/DST. */
export function daysAgoLocal(days: number, from: Date = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  return date;
}
