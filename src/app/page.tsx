import type { Metadata } from "next";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/app/progress-ring";
import {
  Check,
  Users,
  CalendarHeart,
  BarChart3,
  Bell,
  ShieldCheck,
  Smartphone,
  Timer,
  LayoutTemplate,
  ArrowRight,
  HeartHandshake,
  BookOpen,
  Target,
  WifiOff,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Mutabaah — Tumbuh dalam kebiasaan baik, sedikit demi sedikit",
  description:
    "Mutabaah membantu keluarga mencatat ibadah dan kebiasaan baik harian dalam 30 detik. Konsistensi tanpa kompetisi, privat untuk keluarga, bisa di-install sebagai aplikasi.",
  keywords: ["mutabaah", "ibadah", "kebiasaan baik", "keluarga", "tilawah", "shalat", "PWA"],
  openGraph: {
    title: "Mutabaah — Tumbuh dalam kebiasaan baik, sedikit demi sedikit",
    description: "Catat ibadah & kebiasaan baik keluarga dalam 30 detik sehari. Konsistensi, bukan kompetisi.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mutabaah — Tumbuh dalam kebiasaan baik",
    description: "Catat ibadah & kebiasaan baik keluarga dalam 30 detik sehari.",
  },
};

const todayLabel = new Date().toLocaleDateString("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Asia/Jakarta",
});

const previewItems = [
  { name: "Shalat Subuh", state: "done", note: "Selesai" },
  { name: "Tilawah 3 dari 5 halaman", state: "partial", note: "60%" },
  { name: "Dzikir pagi", state: "done", note: "Selesai" },
  { name: "Membaca 10 dari 20 menit", state: "partial", note: "50%" },
] as const;

const steps = [
  {
    n: "01",
    title: "Buat target yang ringan",
    desc: "Pilih paket siap pakai — Anak, Harian, atau Tahfidz — lalu sesuaikan. Mulai dari yang kecil agar mudah dijaga.",
  },
  {
    n: "02",
    title: "Ketuk setiap hari",
    desc: "Buka aplikasi, ketuk amalan yang sudah dikerjakan. Selesai dalam 30 detik, bahkan saat offline.",
  },
  {
    n: "03",
    title: "Lihat konsistensimu",
    desc: "Progress harian, mingguan, dan streak pribadi dihitung otomatis. Dibandingkan dengan dirimu kemarin, bukan dengan orang lain.",
  },
];

const features = [
  {
    icon: Users,
    title: "Untuk keluarga",
    desc: "Orang tua mengatur target, anak mengisi harian masing-masing. Data setiap keluarga terpisah dan privat.",
  },
  {
    icon: HeartHandshake,
    title: "Konsistensi, bukan kompetisi",
    desc: "Tanpa leaderboard, tanpa penilaian. Bahasa yang mendukung dan streak personal yang menenangkan.",
  },
  {
    icon: BarChart3,
    title: "Rekap otomatis",
    desc: "Progress harian, mingguan, bulanan, dan kalender dihitung sendiri. Tak perlu rekap manual di akhir pekan.",
  },
  {
    icon: Bell,
    title: "Pengingat yang relevan",
    desc: "Diingatkan hanya jika mutabaah hari ini belum diisi. Tenang, tidak spam, dan bisa diatur.",
  },
  {
    icon: Timer,
    title: "Terisi dalam 30 detik",
    desc: "Satu ketukan per amalan, penghitung cepat untuk tilawah dan bacaan. Tanpa modal berlapis.",
  },
  {
    icon: WifiOff,
    title: "Tetap jalan saat offline",
    desc: "Checklist tersimpan di perangkat lalu tersinkron saat koneksi kembali. Cocok untuk perjalanan.",
  },
];

const templates = [
  { icon: HeartHandshake, title: "Paket Anak", desc: "Shalat 5 waktu, tilawah, dzikir pagi", count: "7 amalan" },
  { icon: Target, title: "Paket Harian", desc: "Shalat, tilawah, dzikir, sedekah, membaca", count: "6 amalan" },
  { icon: BookOpen, title: "Paket Tahfidz", desc: "Murajaah, hafalan baru, setoran, tilawah", count: "4 amalan" },
];

const faqs = [
  {
    q: "Apakah Mutabaah gratis?",
    a: "Ya. Buat akun, buat keluarga, dan isi mutabaah harian tanpa biaya dan tanpa kartu kredit.",
  },
  {
    q: "Apakah bisa dipakai tanpa internet?",
    a: "Bisa. Mutabaah adalah PWA: halaman tetap terbuka dan checklist tersimpan di perangkat, lalu tersinkron otomatis saat koneksi kembali.",
  },
  {
    q: "Apakah data ibadah keluarga saya privat?",
    a: "Ya. Setiap keluarga hanya bisa melihat datanya sendiri, dilindungi aturan akses di level database. Tidak ada profil publik dan tidak ada papan peringkat.",
  },
  {
    q: "Apakah aplikasi ini menilai ibadah saya?",
    a: "Tidak. Mutabaah hanya mencatat dan menunjukkan pola konsistensimu dari waktu ke waktu — sebagai bahan refleksi pribadi, bukan penilaian.",
  },
  {
    q: "Bagaimana cara install di HP?",
    a: "Buka Mutabaah di browser HP, lalu pilih “Install” / “Add to Home Screen”. Setelah itu ia berjalan seperti aplikasi biasa.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-card/85 backdrop-blur border-b">
        <div className="max-w-[1080px] mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 rounded-full" aria-label="Mutabaah — beranda">
            <span className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold" aria-hidden="true">
              م
            </span>
            <span className="font-semibold">Mutabaah</span>
            <span className="hidden md:inline text-xs text-muted-foreground ml-1">Tumbuh sedikit demi sedikit</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 text-sm" aria-label="Navigasi utama">
            <a href="#cara-kerja" className="px-3 py-2 rounded-full hover:bg-muted font-medium">
              Cara kerja
            </a>
            <a href="#fitur" className="px-3 py-2 rounded-full hover:bg-muted font-medium">
              Fitur
            </a>
            <a href="#template" className="px-3 py-2 rounded-full hover:bg-muted font-medium">
              Template
            </a>
            <a href="#faq" className="px-3 py-2 rounded-full hover:bg-muted font-medium">
              Tanya jawab
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonStyles("ghost", "md")}>
              Masuk
            </Link>
            <Link href="/daftar" className={buttonStyles("primary", "md")}>
              Mulai gratis
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="max-w-[1080px] mx-auto px-4 pt-12 pb-10 lg:pt-20 lg:pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                PWA • Bisa offline • Gratis untuk keluarga
              </p>
              <h1 className="mt-5 text-[34px] sm:text-[40px] lg:text-[48px] font-bold tracking-tight leading-[1.05]">
                Tumbuh dalam
                <br />
                <span className="text-primary">kebiasaan baik,</span>
                <br />
                sedikit demi sedikit.
              </h1>
              <p className="mt-5 text-[15px] lg:text-base leading-7 text-muted-foreground max-w-[52ch]">
                Mutabaah membantu keluarga mencatat ibadah dan kebiasaan harian — shalat, tilawah, dzikir, membaca — dengan pola sederhana:{" "}
                <span className="font-medium text-foreground">buka, lihat, ketuk, selesai</span> dalam 30 detik.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/daftar" className={buttonStyles("primary", "lg")}>
                  Mulai gratis <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
                <a href="#cara-kerja" className={buttonStyles("secondary", "lg")}>
                  Lihat cara kerja
                </a>
              </div>
              <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Keunggulan ringkas">
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Privat untuk keluargamu
                </li>
                <li className="flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-primary" aria-hidden="true" /> Install di HP tanpa Play Store
                </li>
                <li className="flex items-center gap-1.5">
                  <CalendarHeart className="h-4 w-4 text-primary" aria-hidden="true" /> Tanpa kompetisi
                </li>
              </ul>
            </div>

            {/* Preview produk */}
            <div className="relative" aria-label="Contoh tampilan mutabaah harian">
              <div className="rounded-[24px] bg-[var(--primary-soft)] p-3 lg:p-4">
                <div className="rounded-[20px] bg-card border shadow-card overflow-hidden">
                  <div className="p-5 border-b flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Mutabaah • Hari ini</p>
                      <p className="font-semibold mt-0.5 capitalize">{todayLabel}</p>
                    </div>
                    <ProgressRing value={82} size={72} stroke={7} />
                  </div>
                  <ul className="p-4 space-y-2.5">
                    {previewItems.map((i) => (
                      <li key={i.name} className="flex items-center gap-3 rounded-2xl border p-3">
                        <span
                          className={`h-9 w-9 rounded-full flex items-center justify-center border-2 shrink-0 ${
                            i.state === "done" ? "bg-primary border-primary text-white" : "border-amber-400 bg-amber-50"
                          }`}
                          aria-hidden="true"
                        >
                          {i.state === "done" ? <Check className="h-4 w-4" /> : <span className="h-2 w-2 bg-amber-500 rounded-full" />}
                        </span>
                        <span className="text-sm font-medium">{i.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground shrink-0">{i.note}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="px-4 py-3.5 bg-muted/50 text-xs text-muted-foreground text-center border-t">
                    Satu ketukan per amalan • Progress langsung berubah
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Angka ringkas */}
        <section className="border-y bg-card" aria-label="Angka ringkas">
          <dl className="max-w-[1080px] mx-auto px-4 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { value: "30 detik", label: "waktu mengisi mutabaah harian" },
              { value: "3 paket", label: "template siap pakai: Anak, Harian, Tahfidz" },
              { value: "0 kompetisi", label: "progress personal, tanpa leaderboard" },
            ].map((s) => (
              <div key={s.value} className="flex sm:flex-col items-baseline sm:items-start gap-2 sm:gap-1">
                <dt className="order-2 text-sm text-muted-foreground leading-6">{s.label}</dt>
                <dd className="order-1 text-2xl font-bold tracking-tight text-primary">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Cara kerja */}
        <section id="cara-kerja" className="max-w-[1080px] mx-auto px-4 py-12 lg:py-16 w-full scroll-mt-20">
          <p className="text-xs font-semibold tracking-widest uppercase text-primary">Cara kerja</p>
          <h2 className="mt-2 text-[26px] lg:text-[32px] font-bold tracking-tight">Dari niat menjadi kebiasaan</h2>
          <p className="mt-2 text-[15px] text-muted-foreground max-w-[60ch] leading-7">
            Lingkaran intinya sederhana: tentukan target, catat setiap hari, renungkan pekanan. Sisanya — hitung-menghitung dan rekap — biar aplikasi yang mengerjakan.
          </p>
          <ol className="mt-8 grid md:grid-cols-3 gap-4">
            {steps.map((s) => (
              <li key={s.n}>
                <Card className="p-6 h-full">
                  <span className="text-xs font-bold tracking-widest text-primary" aria-hidden="true">
                    {s.n}
                  </span>
                  <h3 className="font-semibold mt-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-6">{s.desc}</p>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        {/* Fitur */}
        <section id="fitur" className="bg-card border-y scroll-mt-20">
          <div className="max-w-[1080px] mx-auto px-4 py-12 lg:py-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary">Fitur</p>
            <h2 className="mt-2 text-[26px] lg:text-[32px] font-bold tracking-tight">Tenang, sederhana, mendukung</h2>
            <p className="mt-2 text-[15px] text-muted-foreground max-w-[60ch] leading-7">
              Setiap fitur dirancang agar mencatat terasa ringan — dan yang ditampilkan selalu memotivasimu untuk kembali esok hari.
            </p>
            <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f) => (
                <li key={f.title}>
                  <Card className="p-6 h-full">
                    <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="font-semibold mt-3 text-[15px]">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-6">{f.desc}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Template */}
        <section id="template" className="max-w-[1080px] mx-auto px-4 py-12 lg:py-16 w-full scroll-mt-20">
          <p className="text-xs font-semibold tracking-widest uppercase text-primary">Template</p>
          <h2 className="mt-2 text-[26px] lg:text-[32px] font-bold tracking-tight">Mulai dari paket siap pakai</h2>
          <p className="mt-2 text-[15px] text-muted-foreground max-w-[60ch] leading-7">
            Tak perlu menyusun dari nol. Pilih satu paket saat onboarding — semua isinya tetap bisa diubah atau ditambah setelahnya.
          </p>
          <ul className="mt-8 grid sm:grid-cols-3 gap-4">
            {templates.map((t) => (
              <li key={t.title}>
                <Card className="p-6 h-full flex flex-col">
                  <t.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold mt-3 text-[15px]">{t.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-6">{t.desc}</p>
                  <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-primary">
                    <LayoutTemplate className="h-3.5 w-3.5" aria-hidden="true" /> {t.count}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-card border-y scroll-mt-20">
          <div className="max-w-[720px] mx-auto px-4 py-12 lg:py-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary">Tanya jawab</p>
            <h2 className="mt-2 text-[26px] lg:text-[32px] font-bold tracking-tight">Yang sering ditanyakan</h2>
            <div className="mt-6 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-2xl border bg-background px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-[15px] font-semibold list-none min-h-[44px]">
                    {f.q}
                    <span className="text-muted-foreground transition-transform group-open:rotate-45 text-xl leading-none" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground leading-6 pb-1">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA akhir */}
        <section className="max-w-[1080px] mx-auto px-4 py-12 lg:py-16 w-full" aria-label="Ajakan memulai">
          <div className="rounded-[24px] bg-primary text-white px-6 py-10 sm:px-10 lg:px-14 lg:py-14 text-center relative overflow-hidden">
            <div className="relative">
              <h2 className="text-[26px] lg:text-[34px] font-bold tracking-tight leading-tight">Mulai malam ini, rasakan bedanya pekan depan.</h2>
              <p className="mt-3 text-white/80 text-[15px] leading-7 max-w-[52ch] mx-auto">
                Buat keluargamu, pilih satu paket template, dan isi check-in pertamamu. Konsistensi dibangun satu hari dalam satu waktu.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  href="/daftar"
                  className="inline-flex items-center justify-center h-12 px-7 text-[15px] rounded-full font-medium bg-white text-primary hover:bg-white/90 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                >
                  Buat akun gratis <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center h-12 px-7 text-[15px] rounded-full font-medium border border-white/30 text-white hover:bg-white/10 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Saya sudah punya akun
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="max-w-[1080px] mx-auto px-4 py-10 grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold" aria-hidden="true">
                م
              </span>
              <span className="font-semibold">Mutabaah</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground leading-6 max-w-[36ch]">
              Tumbuh dalam kebiasaan baik, sedikit demi sedikit. Untuk keluarga Indonesia.
            </p>
          </div>
          <nav aria-label="Tautan produk">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Produk</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#fitur" className="hover:text-primary">
                  Fitur
                </a>
              </li>
              <li>
                <a href="#template" className="hover:text-primary">
                  Template
                </a>
              </li>
              <li>
                <Link href="/onboarding" className="hover:text-primary">
                  Panduan memulai
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Tautan akun">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Akun</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/daftar" className="hover:text-primary">
                  Daftar
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary">
                  Masuk
                </Link>
              </li>
              <li>
                <Link href="/beranda" className="hover:text-primary">
                  Lihat demo
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t">
          <p className="max-w-[1080px] mx-auto px-4 py-5 text-xs text-muted-foreground text-center">© 2026 Mutabaah • Dibuat dengan tenang untuk keluarga Indonesia</p>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Mutabaah",
            applicationCategory: "LifestyleApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
            description: "PWA keluarga untuk konsistensi ibadah dan kebiasaan baik harian.",
          }),
        }}
      />
    </div>
  );
}
