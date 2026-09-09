import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { AuthSubmitButton } from "@/components/ui/auth-submit-button";
import { signup } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";

export const metadata: Metadata = {
  title: "Daftar — Mutabaah",
  description: "Buat akun Mutabaah gratis untuk memulai mutabaah keluarga.",
};

export default async function DaftarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/onboarding");

  // Sudah login → langsung ke tujuan, jangan tampilkan form lagi.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(next);

  const loginHref = next !== "/onboarding" ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-[400px] rounded-[24px] p-7 sm:p-8 shadow-card">
        <Link href="/" className="flex items-center gap-2 justify-center rounded-full" aria-label="Mutabaah — beranda">
          <span className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold" aria-hidden="true">م</span>
          <span className="font-semibold">Mutabaah</span>
        </Link>
        <h1 className="text-center text-[22px] font-bold tracking-tight mt-5">Daftar</h1>
        <p className="text-center text-sm text-muted-foreground mt-1">Mulai kebiasaan baik, sedikit demi sedikit.</p>

        {params.error && (
          <div className="mt-5 rounded-2xl bg-[var(--destructive-soft)] border border-red-200 px-3 py-2.5 text-sm text-red-700 flex gap-2" role="alert">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" /> {params.error}
          </div>
        )}

        <form className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="name" className="text-sm font-medium">
              Nama
            </label>
            <input id="name" name="name" required minLength={2} maxLength={60} placeholder="Ayah" autoComplete="name" className="mt-1.5 w-full rounded-xl border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input id="email" name="email" type="email" required placeholder="nama@email.com" autoComplete="email" className="mt-1.5 w-full rounded-xl border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="mt-1.5">
              <PasswordInput id="password" name="password" required minLength={6} placeholder="Minimal 6 karakter" autoComplete="new-password" />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Setelah daftar, kamu akan membuat keluarga di langkah berikutnya.</p>
          </div>

          <AuthSubmitButton formAction={signup} pendingText="Mendaftarkan…">
            Daftar
          </AuthSubmitButton>
        </form>

        <div className="mt-5 text-center text-sm">
          <span className="text-muted-foreground">Sudah punya akun?</span>{" "}
          <Link href={loginHref} className="font-medium text-primary underline underline-offset-2">
            Masuk
          </Link>
        </div>
      </Card>
    </div>
  );
}
