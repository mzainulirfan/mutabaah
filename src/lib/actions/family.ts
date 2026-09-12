"use server";
import { createClient } from "@/lib/supabase/server";
import { createHash, randomBytes } from "crypto";

// Catatan: tanpa revalidatePath di file ini — semua konsumen adalah client
// component yang refresh manual (clearFamilyCache + patch/refetch lokal).

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
  return family;
}

export async function updateFamily(familyId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  await supabase.from(T_FAMILIES).update({ name }).eq("id", familyId);
}

const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomInviteCode(length = 6) {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) code += INVITE_CODE_ALPHABET[bytes[i] % INVITE_CODE_ALPHABET.length];
  return code;
}

export async function createInvitation(familyId: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized");
  const token = randomBytes(24).toString("hex");
  const token_hash = createHash("sha256").update(token).digest("hex");
  const expires_at = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  // Kode 6 karakter bisa bertabrakan — coba lagi hingga 3x bila unik dilanggar.
  let code = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    code = randomInviteCode();
    const { error } = await supabase.from(T_INVITATIONS).insert({ family_id: familyId, created_by: user.user.id, token_hash, code, expires_at });
    if (!error) break;
    if (!/duplicate|unique/i.test(error.message) || attempt === 2) throw new Error(error.message);
  }
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/join/${token}`;
  return { token, url, code };
}

export async function acceptInvitation(token: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  // gunakan RPC atomik (fix race + used_at + RLS)
  const { data, error } = await supabase.rpc("accept_invitation", { p_hash: createHash("sha256").update(token).digest("hex") });
  if (error) throw new Error(error.message);
  return { familyId: data as string };
}

export async function acceptInvitationByCode(code: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(clean)) throw new Error("Kode terdiri dari 6 huruf/angka.");
  const { data, error } = await supabase.rpc("accept_invitation_by_code", { p_code: clean });
  if (error) throw new Error(error.message);
  return { familyId: data as string };
}

export async function setManagePermission(familyId: string, userId: string, allowed: boolean) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const { error } = await supabase.rpc("set_manage_permission", {
    p_family_id: familyId,
    p_user_id: userId,
    p_allowed: allowed,
  });
  if (error) throw new Error(error.message);
}

export async function setMemberRole(familyId: string, userId: string, role: "PARENT" | "MEMBER") {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const { error } = await supabase.rpc("set_member_role", {
    p_family_id: familyId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw new Error(error.message);
}

export async function setViewPermission(familyId: string, userId: string, allowed: boolean) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const { error } = await supabase.rpc("set_view_permission", {
    p_family_id: familyId,
    p_user_id: userId,
    p_allowed: allowed,
  });
  if (error) throw new Error(error.message);
}

export async function removeFamilyMember(familyId: string, userId: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Unauthorized");
  const { error } = await supabase.from(T_MEMBERS).delete().eq("family_id", familyId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}
