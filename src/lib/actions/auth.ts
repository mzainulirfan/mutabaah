"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function loginBack(next: string, msg: string) {
  const q = `?error=${encodeURIComponent(msg)}${next !== "/beranda" ? `&next=${encodeURIComponent(next)}` : ""}`;
  redirect(`/login${q}`);
}

function friendlySignInError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Email atau password salah. Coba lagi pelan-pelan.";
  if (/email not confirmed/i.test(message)) return "Email belum diverifikasi — cek kotak masuk, lalu coba lagi.";
  if (/too many requests|rate limit/i.test(message)) return "Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.";
  return "Tidak bisa masuk saat ini — coba lagi.";
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const next = safeNextPath(formData.get("next"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) loginBack(next, "Email dan password wajib diisi.");
  if (!EMAIL_RE.test(email)) loginBack(next, "Email tidak valid.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) loginBack(next, friendlySignInError(error.message));
  revalidatePath("/", "layout");
  redirect(next);
}

function daftarBack(next: string, msg: string) {
  const q = `?error=${encodeURIComponent(msg)}${next !== "/onboarding" ? `&next=${encodeURIComponent(next)}` : ""}`;
  redirect(`/daftar${q}`);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase tidak terkonfigurasi");
  const next = safeNextPath(formData.get("next"), "/onboarding");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!EMAIL_RE.test(email)) daftarBack(next, "Email tidak valid.");
  if (name.length < 2) daftarBack(next, "Nama minimal 2 karakter.");
  if (password.length < 6) daftarBack(next, "Password minimal 6 karakter.");
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback` },
  });
  if (error) {
    const msg = /already registered|already exists|already been registered/i.test(error.message)
      ? "Email ini sudah terdaftar. Masuk saja."
      : "Gagal mendaftar — coba email lain.";
    daftarBack(next, msg);
  }
  revalidatePath("/", "layout");
  redirect(next);
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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    redirect(`/login?error=${encodeURIComponent("Isi email yang valid dulu, lalu tekan Lupa?.")}`);
  }
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback?next=/login`,
  });
  redirect("/login?sent=1");
}
