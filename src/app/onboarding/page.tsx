"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  HeartHandshake,
  Loader2,
  Target,
  Users,
  CircleDashed,
} from "@/components/ui/hugeicons";
import { createClient } from "@/lib/supabase/client";

type HabitType = "BOOLEAN" | "QUANTITY" | "COUNTER" | "DURATION";

type TemplateItem = {
  name: string;
  category: string;
  type: HabitType;
  target: number;
  unit?: string;
};

type TemplateKey = "Anak" | "Harian" | "Tahfidz" | "Kosong";

const TEMPLATES: Record<Exclude<TemplateKey, "Kosong">, TemplateItem[]> = {
  Anak: [
    { name: "Shalat Subuh", category: "Ibadah Wajib", type: "BOOLEAN", target: 1 },
    { name: "Shalat Dzuhur", category: "Ibadah Wajib", type: "BOOLEAN", target: 1 },
    { name: "Shalat Ashar", category: "Ibadah Wajib", type: "BOOLEAN", target: 1 },
    { name: "Shalat Maghrib", category: "Ibadah Wajib", type: "BOOLEAN", target: 1 },
    { name: "Shalat Isya", category: "Ibadah Wajib", type: "BOOLEAN", target: 1 },
    { name: "Tilawah", category: "Al-Qur'an", type: "QUANTITY", target: 2, unit: "halaman" },
    { name: "Dzikir Pagi", category: "Dzikir & Doa", type: "BOOLEAN", target: 1 },
  ],
  Harian: [
    { name: "Shalat 5 waktu", category: "Ibadah Wajib", type: "BOOLEAN", target: 1 },
    { name: "Tilawah", category: "Al-Qur'an", type: "QUANTITY", target: 2, unit: "halaman" },
    { name: "Dzikir", category: "Dzikir & Doa", type: "BOOLEAN", target: 1 },
    { name: "Sedekah", category: "Akhlak", type: "BOOLEAN", target: 1 },
    { name: "Membaca", category: "Belajar", type: "DURATION", target: 20, unit: "menit" },
    { name: "Olahraga", category: "Kebiasaan Baik", type: "BOOLEAN", target: 1 },
  ],
  Tahfidz: [
    { name: "Murajaah", category: "Al-Qur'an", type: "QUANTITY", target: 1, unit: "halaman" },
    { name: "Hafalan baru", category: "Al-Qur'an", type: "QUANTITY", target: 5, unit: "ayat" },
    { name: "Setoran", category: "Al-Qur'an", type: "BOOLEAN", target: 1 },
    { name: "Tilawah", category: "Al-Qur'an", type: "QUANTITY", target: 2, unit: "halaman" },
  ],
};

const TEMPLATE_META: { key: TemplateKey; title: string; desc: string; icon: typeof Target }[] = [
  { key: "Anak", title: "Paket Anak", desc: "Shalat 5 waktu, tilawah, dzikir pagi", icon: HeartHandshake },
  { key: "Harian", title: "Paket Harian", desc: "Shalat, tilawah, sedekah, membaca", icon: Target },
  { key: "Tahfidz", title: "Paket Tahfidz", desc: "Murajaah, hafalan baru, setoran", icon: BookOpen },
  { key: "Kosong", title: "Mulai dari nol", desc: "Susun sendiri nanti di halaman Keluarga", icon: CircleDashed },
];

const STEP_LABELS = ["Keluarga", "Template", "Selesai"];

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Terjadi kesalahan. Coba lagi.";
}

type Gate = "checking" | "auth" | "ready";

export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), []);
  const [gate, setGate] = useState<Gate>("checking");
  const [step, setStep] = useState(0);

  const [familyName, setFamilyName] = useState("");
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [template, setTemplate] = useState<TemplateKey | null>(null);
  const [applying, setApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      setGate(data.user ? "ready" : "auth");
    })();
  }, [supabase]);

  const handleCreateFamily = async () => {
    const name = familyName.trim();
    if (name.length < 3) {
      setNameError("Nama keluarga minimal 3 karakter, misalnya “Keluarga Ahmad”.");
      return;
    }
    setNameError(null);
    setNotice(null);
    setCreating(true);
    try {
      const { createFamily } = await import("@/lib/actions/family");
      const fd = new FormData();
      fd.set("name", name);
      const res = (await createFamily(fd)) as { id: string; name: string };
      setFamilyId(res.id);
      setStep(1);
    } catch (e) {
      setNotice(errMsg(e));
    } finally {
      setCreating(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!familyId || !template) return;
    if (template === "Kosong") {
      setAppliedCount(0);
      setStep(2);
      return;
    }
    setNotice(null);
    setApplying(true);
    try {
      const { createHabits } = await import("@/lib/actions/habit");
      const items = TEMPLATES[template];
      const res = await createHabits(
        familyId,
        items.map((it) => ({ name: it.name, category: it.category, type: it.type, target_value: it.target, unit: it.unit }))
      );
      setAppliedCount(res.added);
      setStep(2);
    } catch (e) {
      setNotice(errMsg(e));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[640px] mx-auto px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold rounded-full" aria-label="Kembali ke beranda Mutabaah">
            <span className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold" aria-hidden="true">
              م
            </span>
            Mutabaah
          </Link>
          <Link href={gate === "ready" ? "/beranda" : "/login"} className="text-xs text-muted-foreground underline underline-offset-4 rounded-full px-2 py-1">
            Lewati panduan
          </Link>
        </div>

        <div className="mt-8">
          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight leading-tight">Siapkan mutabaah keluargamu</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-6">Tiga langkah pendek. Tanpa data yang tidak perlu.</p>

          {/* Indikator langkah */}
          <ol className="mt-6 flex items-center gap-2" aria-label="Kemajuan panduan">
            {STEP_LABELS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={label} className="flex-1">
                  <div
                    className={`h-1.5 rounded-full transition-colors ${done ? "bg-primary" : active ? "bg-primary/60" : "bg-muted"}`}
                    role="progressbar"
                    aria-valuenow={step + 1}
                    aria-valuemin={1}
                    aria-valuemax={STEP_LABELS.length}
                    aria-label={`Langkah ${step + 1} dari ${STEP_LABELS.length}: ${STEP_LABELS[step]}`}
                  />
                  <p className={`mt-2 text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className="mr-1 text-muted-foreground" aria-hidden="true">
                      {i + 1}.
                    </span>
                    {label}
                  </p>
                </li>
              );
            })}
          </ol>

          {notice && (
            <div className="mt-5 rounded-2xl bg-[var(--destructive-soft)] border border-red-200 px-4 py-2.5 text-sm text-red-700" role="alert">
              {notice}
            </div>
          )}

          {gate === "checking" && (
            <Card className="mt-6 p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground" aria-busy="true" aria-label="Memuat">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Menyiapkan panduan…
            </Card>
          )}

          {gate === "auth" && (
            <Card className="mt-6 p-6 sm:p-8 text-center">
              <h2 className="font-semibold text-lg">Masuk dulu, yuk</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-6">
                Panduan ini akan membuatkan keluarga dan amalan awal di akunmu. Daftar gratis — cukup email dan kata sandi.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link href="/daftar" className={buttonStyles("primary", "lg")}>
                  Daftar gratis
                </Link>
                <Link href="/login" className={buttonStyles("secondary", "lg")}>
                  Saya sudah punya akun
                </Link>
              </div>
            </Card>
          )}

          {gate === "ready" && step === 0 && (
            <Card className="mt-6 p-6 sm:p-8">
              <h2 className="font-semibold text-lg">Siapa nama keluargamu?</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-6">Contoh: “Keluarga Ahmad”. Bisa diubah kapan saja.</p>
              <div className="mt-4">
                <label htmlFor="family-name" className="text-sm font-medium">
                  Nama keluarga
                </label>
                <input
                  id="family-name"
                  value={familyName}
                  onChange={(e) => {
                    setFamilyName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFamily();
                  }}
                  placeholder="Keluarga Ahmad"
                  maxLength={60}
                  autoComplete="off"
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? "family-name-error" : undefined}
                  className="mt-1.5 w-full rounded-xl border bg-card px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
                />
                {nameError && (
                  <p id="family-name-error" className="mt-2 text-[13px] text-red-700" role="alert">
                    {nameError}
                  </p>
                )}
              </div>
              <div className="mt-6">
                <Button size="lg" className="w-full" onClick={handleCreateFamily} disabled={creating || familyName.trim().length === 0}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />}
                  {creating ? "Membuat keluarga…" : "Buat keluarga dan lanjut"}
                </Button>
                <p className="mt-4 text-center text-sm">
                  <span className="text-muted-foreground">Dapat kode undangan dari keluarga?</span>{" "}
                  <Link href="/gabung" className="font-medium text-primary underline underline-offset-2">
                    Gabung saja
                  </Link>
                </p>
              </div>
            </Card>
          )}

          {gate === "ready" && step === 1 && (
            <div className="mt-6">
              <h2 className="font-semibold text-lg">Pilih amalan awal</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-6">
                Satu paket untuk mengawali. Semua isi tetap bisa diubah atau ditambah setelahnya.
              </p>
              <div className="mt-4 grid gap-3" role="radiogroup" aria-label="Pilihan template">
                {TEMPLATE_META.map((t) => {
                  const selected = template === t.key;
                  const count = t.key === "Kosong" ? null : TEMPLATES[t.key].length;
                  return (
                    <button
                      key={t.key}
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setTemplate(t.key)}
                      className={`text-left rounded-2xl border p-4 flex gap-3 items-start min-h-[64px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selected ? "border-primary bg-[var(--primary-soft)]/50" : "bg-card hover:border-primary/30"
                      }`}
                    >
                      <t.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="flex-1">
                        <span className="text-[15px] font-semibold flex items-center gap-2">
                          {t.title}
                          {count !== null && (
                            <span className="text-[11px] font-semibold text-primary bg-[var(--primary-soft)] rounded-full px-2 py-0.5">
                              {count} amalan
                            </span>
                          )}
                        </span>
                        <span className="block text-[13px] text-muted-foreground mt-0.5 leading-5">{t.desc}</span>
                      </span>
                      <span
                        className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          selected ? "border-primary bg-primary text-white" : "border-input text-transparent"
                        }`}
                        aria-hidden="true"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex gap-2">
                <Button variant="secondary" size="lg" onClick={() => setStep(0)} disabled={applying} aria-label="Kembali ke langkah nama keluarga">
                  <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" /> Kembali
                </Button>
                <Button size="lg" className="flex-1" onClick={handleApplyTemplate} disabled={applying || !template}>
                  {applying && <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />}
                  {applying ? "Menyiapkan amalan…" : template === "Kosong" ? "Lanjut tanpa template" : "Pakai template ini"}
                </Button>
              </div>
            </div>
          )}

          {gate === "ready" && step === 2 && (
            <Card className="mt-6 p-6 sm:p-8 text-center">
              <span className="mx-auto h-14 w-14 rounded-full bg-[var(--success-soft)] flex items-center justify-center" aria-hidden="true">
                <Check className="h-7 w-7 text-[var(--success)]" />
              </span>
              <h2 className="font-semibold text-xl mt-4">Alhamdulillah, siap dimulai</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-6">
                {appliedCount > 0 ? (
                  <>
                    <span className="font-medium text-foreground">{familyName.trim()}</span> sudah punya {appliedCount} amalan awal. Isi
                    check-in pertamamu hari ini — cukup 30 detik.
                  </>
                ) : (
                  <>
                    <span className="font-medium text-foreground">{familyName.trim()}</span> sudah dibuat. Tambahkan amalan pertama
                    kapan pun kamu siap.
                  </>
                )}
              </p>
              <div className="mt-6 grid gap-2">
                <Link href="/mutabaah" className={buttonStyles("primary", "lg", "w-full")}>
                  Isi mutabaah hari ini <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/beranda" className={buttonStyles("secondary", "md", "w-full")}>
                    Lihat beranda
                  </Link>
                  <Link href="/keluarga/anggota" className={buttonStyles("secondary", "md", "w-full")}>
                    <Users className="mr-1.5 h-4 w-4" aria-hidden="true" /> Ajak anggota
                  </Link>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-5">
                Anggota keluarga bisa diajak lewat tautan undangan kapan saja — tidak harus sekarang.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
