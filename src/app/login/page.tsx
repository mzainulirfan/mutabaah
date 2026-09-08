import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { login, signup, resetPassword } from "@/lib/actions/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const params = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--primary-soft)]/30">
      <Card className="w-full max-w-[440px] p-8">
        <div className="flex items-center gap-2 justify-center">
          <span className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold">م</span>
          <span className="font-semibold">Mutabaah</span>
        </div>
        <h1 className="text-center font-bold text-lg mt-4">Masuk ke Mutabaah</h1>
        <p className="text-center text-sm text-muted-foreground mt-1">Gunakan email untuk melanjutkan</p>

        {params.error && <div className="mt-4 rounded-xl bg-[var(--destructive-soft)] border border-red-200 px-3 py-2 text-sm text-red-700">{params.error}</div>}
        {params.sent && <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">Link reset telah dikirim ke email.</div>}

        <form className="mt-6 space-y-3">
          <div>
            <label className="text-sm font-medium">Nama (untuk daftar)</label>
            <input name="name" placeholder="Ayah" className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input name="email" type="email" required placeholder="ayah@keluarga.id" className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input name="password" type="password" required placeholder="••••••••" className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button formAction={login} size="lg" className="w-full">
              Masuk
            </Button>
            <Button formAction={signup} variant="secondary" size="lg" className="w-full">
              Daftar
            </Button>
          </div>
          <Button formAction={resetPassword} variant="ghost" size="sm" className="w-full">
            Lupa password? Kirim link reset
          </Button>
        </form>

        <div className="mt-3">
          <Link href="/beranda" className="block">
            <Button variant="outline" className="w-full">
              Masuk sebagai Demo (tanpa Supabase)
            </Button>
          </Link>
          <p className="text-center text-xs text-muted-foreground mt-2">Demo mode aktif bila env Supabase belum diisi.</p>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Onboarding <Link href="/onboarding" className="font-medium text-primary underline">buat keluarga</Link>
        </div>
      </Card>
    </div>
  );
}
