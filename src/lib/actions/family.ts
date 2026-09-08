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
  if (!name || name.length < 3) throw new Error("Nama keluarga minimal 3 karakter");
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized — login dulu");
  const { data: family, error } = await supabase.from(T_FAMILIES).insert({ name, owner_id: user.user.id }).select().single();
  if (error) throw new Error(error.message);
  const { error: memErr } = await supabase.from(T_MEMBERS).insert({ family_id: family.id, user_id: user.user.id, role: "OWNER" });
  if (memErr) throw new Error(memErr.message);
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
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  // gunakan RPC atomik (fix race + used_at + RLS)
  const { data, error } = await supabase.rpc("accept_invitation", { p_hash: createHash("sha256").update(token).digest("hex") });
  if (error) throw new Error(error.message);
  revalidatePath("/keluarga");
  return { familyId: data as string };
}

export async function removeFamilyMember(familyId: string, userId: string) {
  const supabase = await createClient();
  if (!supabase) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized");
  const { error } = await supabase.from(T_MEMBERS).delete().eq("family_id", familyId).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/keluarga");
}
