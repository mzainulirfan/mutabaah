"use server";
import { createClient } from "@/lib/supabase/server";

export async function savePushSubscription(input: { endpoint: string; p256dh: string; auth: string }) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized — login dulu.");
  if (!input.endpoint.startsWith("https://")) throw new Error("Endpoint tidak valid.");
  if (input.p256dh.length < 10 || input.auth.length < 10) throw new Error("Kunci langganan tidak valid.");
  const { error } = await supabase
    .from("mutabaah_push_subscriptions")
    .upsert({ user_id: auth.user.id, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth }, { onConflict: "user_id,endpoint" });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized — login dulu.");
  const { error } = await supabase.from("mutabaah_push_subscriptions").delete().eq("user_id", auth.user.id).eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
  return { ok: true };
}
