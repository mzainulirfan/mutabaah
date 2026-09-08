"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readPage(input: { habit_id: string; page: number; date: string }) {
  if (!UUID_RE.test(input.habit_id)) throw new Error("Invalid habit_id");
  if (input.page < 1 || input.page > 604) throw new Error("Invalid page");
  const supabase = await createClient();
  if (!supabase) return { counted: false, value: 0 };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized");
  const user_id = auth.user.id;

  // upsert reading_logs dedup per hari
  const { error: logErr } = await supabase.from("mutabaah_reading_logs").insert({ user_id, date: input.date, page: input.page }).select().maybeSingle();
  // if duplicate (23505) → already counted today
  const already = !!(logErr && (logErr.code === "23505" || logErr.message.includes("duplicate")));
  if (logErr && !already) throw new Error(logErr.message);

  // update position
  await supabase.from("mutabaah_reading_positions").upsert({ user_id, last_page: input.page, updated_at: new Date().toISOString() });

  // count distinct pages today
  const { count } = await supabase.from("mutabaah_reading_logs").select("page", { count: "exact", head: true }).eq("user_id", user_id).eq("date", input.date);
  const value = count ?? 0;

  // get habit target to compute status
  const { data: habit } = await supabase.from("mutabaah_habits").select("target_value,type").eq("id", input.habit_id).single();
  const target = habit ? Number((habit as any).target_value) : 1;
  const status = value >= target ? "COMPLETED" : value > 0 ? "PARTIAL" : "PENDING";

  const { error: upErr } = await supabase.from("mutabaah_entries").upsert(
    { habit_id: input.habit_id, user_id, date: input.date, value, status, completed_at: status === "COMPLETED" ? new Date().toISOString() : null },
    { onConflict: "habit_id,user_id,date" }
  );
  if (upErr) throw new Error(upErr.message);

  revalidatePath("/mutabaah");
  return { counted: !already, value, status };
}

export async function getTodayReadingCount(date: string, habit_id: string) {
  const supabase = await createClient();
  if (!supabase) return 0;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 0;
  const { count } = await supabase.from("mutabaah_reading_logs").select("page", { count: "exact", head: true }).eq("user_id", auth.user.id).eq("date", date);
  return count ?? 0;
}
