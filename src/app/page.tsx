import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Users, Calendar, BarChart3, Bell, ShieldCheck, Smartphone } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur border-b">
        <div className="max-w-[1080px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold">م</div>
            <span className="font-semibold">Mutabaah</span>
            <span className="hidden sm:inline text-xs text-muted-foreground ml-2">Tumbuh sedikit demi sedikit</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-medium px-4 py-2 hover:bg-muted rounded-full">
              Masuk
            </Link>
            <Link href="/beranda">
              <Button size="md">Mulai Gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1080px] mx-auto px-4 py-10 lg:py-16 w-full">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              PWA • Offline-ready • Untuk Keluarga
            </div>
            <h1 className="mt-5 text-[32px] lg:text-[44px] font-bold tracking-tight leading-[1.05]">
              Tumbuh dalam
              <br />
              <span className="text-primary">kebiasaan baik,</span>
              <br />
              sedikit demi sedikit.
            </h1>
            <p className="mt-4 text-[15px] leading-6 text-muted-foreground max-w-[48ch]">
              Mutabaah membantu keluarga mencatat ibadah & kebiasaan harian dengan cepat.
              <span className="font-medium text-foreground"> Open → See → Tap → Done</span> dalam 30 detik.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/beranda">
                <Button size="lg">Buka Dashboard Demo</Button>
              </Link>
              <Link href="/onboarding">
                <Button variant="secondary" size="lg">
                  Lihat Onboarding
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Privat keluarga
              </span>
              <span className="flex items-center gap-1.5">
                <Smartphone className="h-4 w-4" /> PWA Install
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Tanpa kompetisi
              </span>
            </div>
          </div>

          {/* Preview card */}
          <div className="relative">
            <div className="rounded-[24px] bg-[var(--primary-soft)] p-3 lg:p-4">
              <div className="rounded-[20px] bg-card border shadow-card overflow-hidden">
                <div className="p-5 border-b flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Mutabaah • Hari ini</div>
                    <div className="font-semibold">Ahad, 7 September</div>
                  </div>
                  <div className="h-12 w-12 rounded-full border-4 border-primary flex items-center justify-center font-bold text-sm">
                    82%
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { name: "Shalat Subuh", done: true },
                    { name: "Tilawah 3/5 halaman", partial: true },
                    { name: "Dzikir Pagi", done: true },
                    { name: "Membaca", partial: true },
                  ].map((i) => (
                    <div key={i.name} className="flex items-center gap-3 rounded-2xl border p-3">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center border-2 ${i.done ? "bg-primary border-primary text-white" : i.partial ? "border-amber-400 bg-amber-50" : "bg-white"}`}
                      >
                        {i.done ? <Check className="h-4 w-4" /> : i.partial ? <span className="h-2 w-2 bg-amber-500 rounded-full" /> : null}
                      </div>
                      <span className="text-sm font-medium">{i.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{i.done ? "Selesai" : "Belum"}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-muted/50 text-xs text-muted-foreground text-center">
                  Tap kartu untuk menyelesaikan • Progress langsung berubah
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-card border-y">
        <div className="max-w-[1080px] mx-auto px-4 py-10 grid md:grid-cols-3 gap-4">
          {[
            { icon: Users, title: "Untuk Keluarga", desc: "Orang tua atur target, anak isi harian. Data tidak bocor antar keluarga." },
            { icon: Calendar, title: "Konsistensi, bukan kompetisi", desc: "Progress dibanding diri sendiri. Streak personal, tanpa leaderboard." },
            { icon: BarChart3, title: "Insight otomatis", desc: "Daily, weekly, monthly + calendar. Rekap tanpa hitung manual." },
            { icon: Bell, title: "Reminder yang relevan", desc: "Hanya kirim jika belum diisi. Tidak spam, bisa diatur per habit." },
            { icon: Check, title: "Isi < 30 detik", desc: "Checklist 1-tap, quantity dengan counter cepat. Offline queue." },
            { icon: ShieldCheck, title: "Privat & Calm", desc: "Bahasa mendukung, UI tenang, tidak menghakimi." },
          ].map((f) => (
            <Card key={f.title} className="p-5">
              <f.icon className="h-5 w-5 text-primary" />
              <div className="font-semibold mt-3 text-sm">{f.title}</div>
              <div className="text-sm text-muted-foreground mt-1 leading-6">{f.desc}</div>
            </Card>
          ))}
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-muted-foreground">
        © 2026 Mutabaah • Dibuat dengan tenang untuk keluarga Indonesia
      </footer>
    </div>
  );
}
