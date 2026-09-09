import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { AuthSubmitButton } from "@/components/ui/auth-submit-button";
import { login, resetPassword } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";
import { AlertCircle, CheckCircle2, ChevronLeft, Users } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";

export const metadata: Metadata = {
  title: "Masuk — Mutabaah",
  description: "Masuk ke Mutabaah untuk melanjutkan mutabaah harianmu.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  // Sudah login → langsung ke tujuan, jangan tampilkan form lagi.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(next);

  const daftarHref = next !== "/beranda" ? `/daftar?next=${encodeURIComponent(next)}` : "/daftar";
  const isInviteFlow = next.startsWith("/join/") || next === "/gabung";

  return (
    <div className="min-h-screen relative flex flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[var(--primary-soft)] to-transparent" aria-hidden="true" />
      <div className="relative w-full max-w-[400px] mx-auto px-4 pt-6">
        <Link href="/" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-full px-2 py-2 -ml-2">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Beranda
        </Link>
      </div>

      <div className="relative flex-1 flex items-start sm:items-center justify-center p-4 pt-6 sm:pt-4">
        <Card className="w-full max-w-[400px] rounded-[24px] p-7 sm:p-8 shadow-card">
          <div className="flex items-center gap-2 justify-center" aria-hidden="true">
            <span className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg">م</span>
            <span className="font-semibold text-lg">Mutabaah</span>
          </div>
          <h1 className="text-center text-[22px] font-bold tracking-tight mt-5">Masuk</h1>
          <p className="text-center text-sm text-muted-foreground mt-1">
            {isInviteFlow ? "Masuk untuk bergabung ke keluargamu." : "Lanjutkan mutabaah harianmu."}
          </p>

          {isInviteFlow && !params.error && (
            <div className="mt-5 rounded-2xl bg-[var(--primary-soft)]/60 border border-primary/15 px-3 py-2.5 text-sm text-primary flex gap-2" role="status">
              <Users className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" /> Setelah masuk, kamu langsung diarahkan ke undangan.
            </div>
          )}

          {params.error && (
            <div className="mt-5 rounded-2xl bg-[var(--destructive-soft)] border border-red-200 px-3 py-2.5 text-sm text-red-700 flex gap-2" role="alert">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" /> {params.error}
            </div>
          )}
          {params.sent && (
            <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-sm text-emerald-800 flex gap-2" role="status">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" /> Link reset terkirim — cek email.
            </div>
          )}

          <form id="login-form" className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next} />
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input id="email" name="email" type="email" required placeholder="nama@email.com" autoComplete="email" className="mt-1.5 w-full min-h-[48px] rounded-xl border bg-card px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60" />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="mt-1.5">
                <PasswordInput id="password" name="password" required placeholder="••••••••" autoComplete="current-password" className="min-h-[48px] px-4 py-3 text-[15px]" />
              </div>
            </div>

            <AuthSubmitButton formAction={login} pendingText="Memeriksa…">
              Masuk
            </AuthSubmitButton>
          </form>

          <div className="mt-5 flex items-center gap-3 text-[11px] text-muted-foreground" aria-hidden="true">
            <span className="flex-1 border-t" />
            <span>Baru di Mutabaah?</span>
            <span className="flex-1 border-t" />
          </div>
          <Link href={daftarHref} className="mt-3 flex items-center justify-center h-12 px-7 text-[15px] rounded-full font-medium bg-white text-foreground border hover:bg-muted transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[48px]">
            Daftar gratis
          </Link>

          <div className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <button formAction={resetPassword} form="login-form" className="underline underline-offset-4 rounded-full px-3 py-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Lupa password?
            </button>
            <span aria-hidden="true">·</span>
            <Link href="/gabung" className="underline underline-offset-4 rounded-full px-3 py-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Punya kode undangan?
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
