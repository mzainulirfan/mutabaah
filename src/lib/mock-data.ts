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

export const habits: Habit[] = [
  { id: "1", name: "Shalat Subuh", category: "Ibadah Wajib", type: "BOOLEAN", target: 1 },
  { id: "2", name: "Shalat Dzuhur", category: "Ibadah Wajib", type: "BOOLEAN", target: 1 },
  { id: "3", name: "Shalat Ashar", category: "Ibadah Wajib", type: "BOOLEAN", target: 1 },
  { id: "4", name: "Shalat Maghrib", category: "Ibadah Wajib", type: "BOOLEAN", target: 1 },
  { id: "5", name: "Shalat Isya", category: "Ibadah Wajib", type: "BOOLEAN", target: 1 },
  { id: "6", name: "Tilawah", category: "Al-Qur'an", type: "QUANTITY", target: 5, unit: "halaman" },
  { id: "7", name: "Hafalan", category: "Al-Qur'an", type: "QUANTITY", target: 5, unit: "ayat" },
  { id: "8", name: "Dzikir Pagi", category: "Dzikir & Doa", type: "BOOLEAN", target: 1 },
  { id: "9", name: "Dzikir Petang", category: "Dzikir & Doa", type: "BOOLEAN", target: 1 },
  { id: "10", name: "Membaca", category: "Belajar", type: "DURATION", target: 20, unit: "menit" },
  { id: "11", name: "Membantu Orang Tua", category: "Akhlak", type: "BOOLEAN", target: 1 },
];

export const initialEntries: Record<string, Entry> = {
  "1": { habitId: "1", value: 1, status: "COMPLETED" },
  "2": { habitId: "2", value: 1, status: "COMPLETED" },
  "3": { habitId: "3", value: 1, status: "COMPLETED" },
  "4": { habitId: "4", value: 0, status: "PENDING" },
  "5": { habitId: "5", value: 0, status: "PENDING" },
  "6": { habitId: "6", value: 3, status: "PARTIAL" },
  "7": { habitId: "7", value: 5, status: "COMPLETED" },
  "8": { habitId: "8", value: 1, status: "COMPLETED" },
  "9": { habitId: "9", value: 0, status: "PENDING" },
  "10": { habitId: "10", value: 10, status: "PARTIAL" },
  "11": { habitId: "11", value: 1, status: "COMPLETED" },
};

export const members = [
  { id: "m1", name: "Ahmad", progress: 86, streak: 12, avatar: "A" },
  { id: "m2", name: "Aisyah", progress: 72, streak: 7, avatar: "Ai" },
  { id: "m3", name: "Yusuf", progress: 61, streak: 3, avatar: "Y" },
];

export const weeklyData = [
  { day: "Sen", value: 92 },
  { day: "Sel", value: 78 },
  { day: "Rab", value: 85 },
  { day: "Kam", value: 94 },
  { day: "Jum", value: 68 },
  { day: "Sab", value: 81 },
  { day: "Min", value: 88 },
];

export function getHabitProgress(habit: Habit, entry: Entry | undefined): number {
  if (!entry || entry.status === "PENDING") return 0;
  if (entry.status === "COMPLETED") return 100;
  if (habit.type === "BOOLEAN") return entry.value ? 100 : 0;
  return Math.round(Math.min(100, (entry.value / habit.target) * 100));
}

export function getDailyProgress(entries: Record<string, Entry>): number {
  const progresses = habits.map((h) => getHabitProgress(h, entries[h.id]));
  if (progresses.length === 0) return 0;
  return Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length);
}
