"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Users, LayoutTemplate, Sparkles, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const steps = [
  { n: 1, title: "Buat keluarga", desc: "Beri nama keluarga, contoh: Keluarga Ahmad" },
  { n: 2, title: "Tambahkan anggota", desc: "Undang Bunda, Ahmad, Aisyah, Yusuf" },
  { n: 3, title: "Pilih template", desc: "Anak • Harian • Tahfidz • Ramadhan" },
  { n: 4, title: "Mulai mutabaah", desc: "Check-in pertama < 30 detik" },
];

export default function OnboardingPage() {
  const [name, setName] = useState("Keluarga Ahmad");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const supabase = createClient();
      if (!supabase) {
        setMsg("Supabase tidak terkonfigurasi — pakai demo mode ke /beranda");
        setLoading(false);
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setMsg("Login dulu di /login");
        setLoading(false);
        return;
      }
      const { createFamily } = await import("@/lib/actions/family");
      const fd = new FormData();
      fd.set("name", name.trim());
      const res: any = await createFamily(fd);
      setFamilyId(res.id);
      setMsg(`Keluarga "${res.name}" dibuat ✓`);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[960px] mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold">
          <span className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-white">م</span> Mutabaah
        </Link>

        <div className="mt-8 grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <h1 className="text-[28px] font-bold tracking-tight leading-none">Onboarding 3–4 langkah</h1>
            <p className="text-sm text-muted-foreground mt-2">Jangan minta data yang tidak diperlukan.</p>

            <div className="mt-6 grid gap-3">
              {steps.map((s) => (
                <Card key={s.n} className="p-4 flex gap-4">
                  <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">{s.n}</div>
                  <div>
                    <div className="font-semibold text-sm">{s.title}</div>
                    <div className="text-sm text-muted-foreground">{s.desc}</div>
                  </div>
                  <Check className="ml-auto h-5 w-5 text-primary" />
                </Card>
              ))}
            </div>

            <Card className="mt-6 p-5">
              <label className="text-sm font-medium">Nama keluarga</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Keluarga Ahmad"
                className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {msg && <div className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm">{msg}</div>}
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" onClick={handleCreate} disabled={loading || !name.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Buat Keluarga
                </Button>
                <Link href={familyId ? "/keluarga" : "/beranda"}>
                  <Button variant="secondary">{familyId ? "Ke Keluarga" : "Lewati"}</Button>
                </Link>
              </div>
              {familyId && (
                <Link href="/beranda" className="block mt-3">
                  <Button variant="outline" className="w-full">
                    Lanjut ke Beranda
                  </Button>
                </Link>
              )}
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4" /> Template populer
              </h3>
              <div className="mt-3 space-y-2">
                {["Mutabaah Anak (7 amalan)", "Mutabaah Harian (6 amalan)", "Mutabaah Tahfidz (4 amalan)"].map((t) => (
                  <div key={t} className="w-full text-left rounded-xl border px-3 py-2.5 text-sm bg-muted/50">
                    {t}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Pilih template setelah buat keluarga di /keluarga.</p>
            </Card>
            <Card className="p-5 bg-[var(--primary-soft)] border-primary/20">
              <div className="flex items-center gap-2 font-semibold text-primary text-sm">
                <Sparkles className="h-4 w-4" /> Kenapa cepat?
              </div>
              <p className="text-sm leading-6 mt-2 text-muted-foreground">Daily check-in tanpa modal. Tap kartu → optimistic update → progress berubah.</p>
            </Card>
            <Card className="p-5">
              <div className="font-semibold text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Preview anggota
              </div>
              <div className="mt-3 flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <img key={i} src={`https://i.pravatar.cc/100?img=${10 + i}`} alt="avatar" className="h-8 w-8 rounded-full border-2 border-white" />
                ))}
                <span className="h-8 w-8 rounded-full bg-muted border-2 border-white flex items-center justify-center text-xs font-medium">+2</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
