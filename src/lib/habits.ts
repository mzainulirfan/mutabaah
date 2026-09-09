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

export function getHabitProgress(habit: Habit, entry: Entry | undefined): number {
  if (!entry || entry.status === "PENDING") return 0;
  if (entry.status === "COMPLETED") return 100;
  if (habit.type === "BOOLEAN") return entry.value ? 100 : 0;
  return Math.round(Math.min(100, (entry.value / habit.target) * 100));
}
