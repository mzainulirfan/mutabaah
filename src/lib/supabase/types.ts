import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { EntryStatus, SholatContext } from "@/lib/habits";

/** Klien Supabase (browser maupun server) tanpa skema generik — baris hasil query diketik di situs pakai. */
export type DbClient = SupabaseClient;
export type DbUser = User;

/** Satu baris mentah dari tabel mutabaah_entries (kolom yang umum di-select). */
export type EntryRow = {
  user_id: string;
  habit_id: string;
  value: number;
  status: EntryStatus;
  note: string | null;
  context: SholatContext | null;
  date: string;
  completed_at: string | null;
};

export type MemberLinkRow = { family_id: string; role: string };
export type FamilyNameRow = { name: string };
export type FamilyMemberRow = { user_id: string; role: string; can_manage_habits?: boolean | null; can_view_family?: boolean | null };
export type ProfileRow = { id: string; name: string };
export type HabitListRow = {
  id: string;
  name: string;
  category: string;
  type: string;
  target_value: number;
  unit: string | null;
  reminder_time?: string | null;
  sort_order: number;
};
