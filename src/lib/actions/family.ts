"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createHash, randomBytes } from "crypto";

// Table names — all prefixed mutabaah_
const T_FAMILIES = "mutabaah_families";
const T_MEMBERS = "mutabaah_family_members";
const T_INVITATIONS = "mutabaah_invitations";

export async function createFamily(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Nama keluarga wajib");
  const supabase = await createClient();
  if (!supabase) return { id: "demo-family", name };
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized — login dulu");
  // Use service role to bypass RLS for the insert (still enforce owner_id = auth.uid())
  const { createServiceClient } = await import("@/lib/supabase/server");
  const service = createServiceClient();
  const client = service ?? supabase;
  const { data: family, error } = await client.from(T_FAMILIES).insert({ name, owner_id: user.user.id }).select().single();
  if (error) throw new Error(error.message + " (pastikan sudah run 004_fix_families_insert.sql di SQL Editor)");
  await client.from(T_MEMBERS).insert({ family_id: family.id, user_id: user.user.id, role: "OWNER" });
  revalidatePath("/keluarga");
  return family;
}

export async function updateFamily(familyId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from(T_FAMILIES).update({ name }).eq("id", familyId);
  revalidatePath("/keluarga");
}

export async function createInvitation(familyId: string) {
  const supabase = await createClient();
  if (!supabase) return { token: "demo-token-123", url: `http://localhost:3000/join/demo-token-123` };
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized");
  const token = randomBytes(24).toString("hex");
  const token_hash = createHash("sha256").update(token).digest("hex");
  const expires_at = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const { error } = await supabase.from(T_INVITATIONS).insert({ family_id: familyId, created_by: user.user.id, token_hash, expires_at });
  if (error) throw new Error(error.message);
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/join/${token}`;
  return { token, url };
}

export async function acceptInvitation(token: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: true };
  const token_hash = createHash("sha256").update(token).digest("hex");
  const { data: inv, error } = await supabase.from(T_INVITATIONS).select("*").eq("token_hash", token_hash).single();
  if (error || !inv) throw new Error("Undangan tidak valid");
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) throw new Error("Undangan sudah tidak berlaku.");
  if (inv.used_at) throw new Error("Undangan sudah digunakan");
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Login dulu");
  const { error: memErr } = await supabase.from(T_MEMBERS).insert({ family_id: inv.family_id, user_id: user.user.id, role: "MEMBER" });
  if (memErr) throw new Error(memErr.message);
  revalidatePath("/keluarga");
  return { familyId: inv.family_id };
}
