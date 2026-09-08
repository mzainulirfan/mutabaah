"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const T_HABITS = "mutabaah_habits";
const T_ENTRIES = "mutabaah_entries";

export type HabitInput = {
  family_id: string;
  name: string;
  category: string;
  type: "BOOLEAN" | "QUANTITY" | "COUNTER" | "DURATION";
  target_value?: number;
  unit?: string;
  reminder_time?: string | null;
};

export async function createHabit(input: HabitInput) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized");
  const { data, error } = await supabase.from(T_HABITS).insert(input).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/mutabaah");
  revalidatePath("/keluarga");
  return data;
}

export async function updateHabit(id: string, patch: Partial<HabitInput> & { is_active?: boolean }) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized");
  const { error } = await supabase.from(T_HABITS).update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/mutabaah");
}

export async function deleteHabit(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized");
  const { error } = await supabase.from(T_HABITS).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/mutabaah");
}

export async function getTodayMutabaah(familyId: string, userId: string, date: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: habits } = await supabase.from(T_HABITS).select("*").eq("family_id", familyId).eq("is_active", true).order("sort_order");
  const { data: entries } = await supabase.from(T_ENTRIES).select("*").eq("user_id", userId).eq("date", date);
  return { habits, entries };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(v: string) { return UUID_RE.test(v); }

export async function updateMutabaahEntry(input: {
  habit_id: string;
  user_id: string;
  date: string;
  value: number;
  status: "PENDING" | "PARTIAL" | "COMPLETED" | "SKIPPED";
  note?: string | null;
}) {
  if (!isUUID(input.habit_id)) throw new Error(`Invalid habit_id "${input.habit_id}" — expected uuid (habit belum sync, refresh halaman)`);
  if (!isUUID(input.user_id)) throw new Error(`Invalid user_id "${input.user_id}"`);
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized");
  if (auth.user.id !== input.user_id) throw new Error("Forbidden: user_id mismatch");
  const payload = {
    habit_id: input.habit_id,
    user_id: input.user_id,
    date: input.date,
    value: input.value,
    status: input.status,
    note: input.note ?? null,
    completed_at: input.status === "COMPLETED" ? new Date().toISOString() : null,
  };
  const { data, error } = await supabase
    .from(T_ENTRIES)
    .upsert(payload, { onConflict: "habit_id,user_id,date" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/mutabaah");
  revalidatePath("/progress");
  return data;
}
