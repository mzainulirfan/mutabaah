"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function sanitizeEmail(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error("Email tidak valid");
  return s;
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect(`/login?error=${encodeURIComponent("Email dan password wajib")}`);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  redirect("/beranda");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const email = sanitizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) throw new Error("Nama minimal 2 karakter");
  if (password.length < 6) throw new Error("Password minimal 6 karakter");
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback` },
  });
  if (error) redirect(`/daftar?error=${encodeURIComponent("Gagal daftar — coba email lain")}`);
  revalidatePath("/", "layout");
  redirect("/beranda");
}

export async function logout() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const email = sanitizeEmail(formData.get("email"));
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback?next=/login`,
  });
  redirect("/login?sent=1");
}
