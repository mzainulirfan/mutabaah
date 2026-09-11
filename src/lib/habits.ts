export type HabitType = "BOOLEAN" | "QUANTITY" | "COUNTER" | "DURATION";
export type HabitCategory =
  | "Ibadah Wajib"
  | "Ibadah Sunnah"
  | "Al-Qur'an"
  | "Dzikir & Doa"
  | "Akhlak"
  | "Belajar"
  | "Kebiasaan Baik";

export type Habit = {
  id: string;
  name: string;
  category: HabitCategory;
  type: HabitType;
  target: number;
  unit?: string;
  streak?: number;
};

export type EntryStatus = "PENDING" | "PARTIAL" | "COMPLETED" | "SKIPPED";

export type SholatContext = "SENDIRI" | "BERJAMAAH";

export type Entry = {
  habitId: string;
  value: number;
  status: EntryStatus;
  note?: string;
  context?: SholatContext | null;
};

const DZUHUR_RE = /dzuhur|duhur|lohor|zhuhur|zuhur/i;

export function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}

// Hari Jumat: amalan Dzuhur tampil sebagai Sholat Jumat (tampilan saja,
// data & riwayat tidak berubah).
export function displayHabitName(name: string, date: Date): string {
  if (isFriday(date) && DZUHUR_RE.test(name) && !/jumat/i.test(name)) {
    return name.replace(DZUHUR_RE, "Jumat");
  }
  return name;
}

// Slot waktu sholat untuk pengurutan & strip: "jumat" menempati slot dzuhur di hari Jumat.
export function prayerSlotKey(name: string, date: Date): string {
  const n = name.toLowerCase();
  if (n.includes("subuh")) return "subuh";
  if (isFriday(date) && n.includes("jumat")) return "dzuhur";
  if (/dzuhur|duhur|lohor|zhuhur|zuhur/.test(n)) return "dzuhur";
  if (/ashar|asar/.test(n)) return "ashar";
  if (n.includes("maghrib")) return "maghrib";
  if (/isya|isha/.test(n)) return "isya";
  return "";
}
