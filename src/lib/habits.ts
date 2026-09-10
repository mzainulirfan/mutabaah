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
