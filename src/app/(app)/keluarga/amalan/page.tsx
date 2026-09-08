"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, Check, BookOpen, Heart, Target, ChevronLeft, X } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type HabitRow = { id: string; name: string; category: string; type: string; target_value: number; unit: string | null; is_active: boolean };

const categories = ["Ibadah Wajib", "Ibadah Sunnah", "Al-Qur'an", "Dzikir & Doa", "Akhlak", "Belajar", "Kebiasaan Baik", "Custom"] as const;

const typeOptions = [
  { value: "BOOLEAN", label: "Sekali ketuk", hint: "Cukup ketuk sekali kalau sudah dikerjakan. Contoh: Shalat Subuh.", unitPlaceholder: "" },
  { value: "QUANTITY", label: "Hitung jumlah", hint: "Catat berapa banyak yang dibaca. Contoh: Tilawah 5 halaman.", unitPlaceholder: "halaman / ayat" },
  { value: "COUNTER", label: "Hitung pengulangan", hint: "Ketuk + setiap selesai satu putaran. Contoh: dzikir 33 kali.", unitPlaceholder: "kali" },
  { value: "DURATION", label: "Hitung menit", hint: "Catat berapa lama waktunya. Contoh: membaca 20 menit.", unitPlaceholder: "menit" },
] as const;

function typeLabel(type: string) {
  return typeOptions.find((t) => t.value === type)?.label ?? type;
}

function habitTargetText(h: { type: string; target_value: number; unit: string | null }) {
  if (h.type === "BOOLEAN") return "Sekali ketuk";
  if (h.type === "DURATION") return `Target ${h.target_value} ${h.unit ?? "menit"}`;
  if (h.target_value > 1) return `Target ${h.target_value} ${h.unit ?? "kali"}`;
  return "Hitung jumlah";
}

const templates: Record<string, { name: string; category: string; type: string; target: number; unit?: string }[]> = {
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

const templateMeta = [
  { key: "Anak", title: "Anak", desc: "Shalat 5 waktu • Tilawah • Dzikir", icon: Heart },
  { key: "Harian", title: "Harian", desc: "Shalat • Tilawah • Sedekah", icon: Target },
  { key: "Tahfidz", title: "Tahfidz", desc: "Murajaah • Hafalan • Setoran", icon: BookOpen },
];

export default function AmalanPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [habitOpen, setHabitOpen] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: "", category: "Ibadah Wajib", type: "BOOLEAN", target: 1, unit: "" });
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) { setLoading(false); return; }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setLoading(false); return; }
    const { data: mem } = await supabase.from("mutabaah_family_members").select("family_id").eq("user_id", auth.user.id).maybeSingle();
    if (!mem) { setLoading(false); return; }
    setFamilyId(mem.family_id);
    const { data: habitRows } = await supabase.from("mutabaah_habits").select("id,name,category,type,target_value,unit,is_active").eq("family_id", mem.family_id).order("sort_order");
    setHabits((habitRows ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  const selectedType = typeOptions.find((t) => t.value === newHabit.type) ?? typeOptions[0];

  const handleAddHabit = async () => {
    if (!familyId || !newHabit.name.trim()) return;
    setAdding(true);
    try {
      const { createHabit } = await import("@/lib/actions/habit");
      const isTap = newHabit.type === "BOOLEAN";
      await createHabit({
        family_id: familyId,
        name: newHabit.name.trim(),
        category: newHabit.category,
        type: newHabit.type as any,
        target_value: isTap ? 1 : Number(newHabit.target) || 1,
        unit: isTap ? undefined : newHabit.unit.trim() || selectedType.unitPlaceholder,
      });
      setNewHabit({ name: "", category: "Ibadah Wajib", type: "BOOLEAN", target: 1, unit: "" });
      setHabitOpen(false);
      setMsg(`Amalan "${newHabit.name.trim()}" tersimpan. Silakan isi mulai hari ini.`);
      load();
    } catch (e: any) { setMsg(e.message); } finally { setAdding(false); }
  };

  const handleDeleteHabit = async (id: string, name: string) => {
    if (!confirm(`Hapus "${name}"? Catatan yang sudah terisi tetap tersimpan.`)) return;
    const { deleteHabit } = await import("@/lib/actions/habit");
    await deleteHabit(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const handleApplyTemplate = async (key: string) => {
    if (!familyId) return;
    const items = templates[key];
    if (!items) return;
    if (!confirm(`Tambahkan ${items.length} amalan contoh "${key}"? Yang sudah ada tidak diduplikasi.`)) return;
    const { createHabit } = await import("@/lib/actions/habit");
    for (const it of items) {
      if (habits.some((h) => h.name === it.name)) continue;
      await createHabit({ family_id: familyId, name: it.name, category: it.category, type: it.type as any, target_value: it.target, unit: (it as any).unit ?? undefined });
    }
    setMsg(`Contoh "${key}" ditambahkan. Bisa diubah setelahnya.`);
    load();
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Memuat amalan">
        <div className="h-10 w-40 rounded-full bg-muted" />
        <div className="h-40 rounded-[20px] bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/keluarga" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-full px-2 py-1 -ml-2">
          <ChevronLeft className="h-4 w-4" /> Keluarga
        </Link>
        <div className="flex items-center justify-between gap-2 mt-2">
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">Amalan</h1>
          <Button size="sm" className="rounded-full shrink-0" onClick={() => setHabitOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Buat amalan
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{habits.filter((h) => h.is_active).length} aktif dari {habits.length} amalan.</p>
      </div>

      {msg && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2" role="status"><Check className="h-4 w-4 shrink-0" /> {msg}</div>}

      <Card className="rounded-[20px] p-5">
        {habits.length === 0 ? (
          <div>
            <p className="text-sm font-medium">Mulai dari contoh, yuk</p>
            <p className="text-xs text-muted-foreground mt-1">Pilih satu paket di bawah, nanti tetap bisa diubah.</p>
            <div className="mt-3 grid gap-2">
              {templateMeta.map((t) => (
                <button key={t.key} onClick={() => handleApplyTemplate(t.key)} className="text-left rounded-2xl border p-3.5 hover:border-primary/20 hover:bg-[var(--primary-soft)]/40 transition-colors flex gap-3 min-h-[44px]">
                  <t.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">Paket {t.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-5">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {habits.map((h) => (
                <div key={h.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${!h.is_active ? "opacity-60 bg-muted/30" : "hover:border-primary/15"}`}>
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${h.category === "Ibadah Wajib" ? "bg-emerald-50 text-emerald-600" : h.category === "Al-Qur'an" ? "bg-sky-50 text-sky-600" : "bg-muted text-muted-foreground"}`}>
                    {h.category === "Ibadah Wajib" ? <Heart className="h-4 w-4" /> : h.category === "Al-Qur'an" ? <BookOpen className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      {h.name} {!h.is_active && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">Dijeda</span>}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${h.is_active ? "bg-primary" : "bg-muted-foreground"}`} /> {h.category} • {typeLabel(h.type)}{h.type !== "BOOLEAN" ? ` • ${habitTargetText(h)}` : ""}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer" title={h.is_active ? "Jeda amalan ini" : "Tampilkan lagi amalan ini"}>
                    <input type="checkbox" checked={h.is_active} aria-label={h.is_active ? `Jeda ${h.name}` : `Tampilkan lagi ${h.name}`} onChange={async (e) => { const { updateHabit } = await import("@/lib/actions/habit"); await updateHabit(h.id, { is_active: e.target.checked }); setHabits((prev) => prev.map((x) => (x.id === h.id ? { ...x, is_active: e.target.checked } : x))); }} className="sr-only peer" />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                  <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => handleDeleteHabit(h.id, h.name)} aria-label={`Hapus ${h.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <details className="mt-4 rounded-2xl border p-4">
              <summary className="text-sm font-medium cursor-pointer">Mulai dari contoh</summary>
              <p className="text-xs text-muted-foreground mt-1">Yang sudah ada tidak akan diduplikasi.</p>
              <div className="mt-3 grid gap-2">
                {templateMeta.map((t) => (
                  <button key={t.key} onClick={() => handleApplyTemplate(t.key)} className="text-left rounded-2xl border p-3.5 hover:border-primary/20 hover:bg-[var(--primary-soft)]/40 transition-colors flex gap-3 min-h-[44px]">
                    <t.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">Paket {t.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-5">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </details>
          </>
        )}
      </Card>

      {habitOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Buat amalan baru">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHabitOpen(false)} />
          <div className="relative w-full max-w-[440px] rounded-t-[24px] sm:rounded-[24px] bg-card p-6 shadow-card max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Buat amalan baru</h3>
              <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setHabitOpen(false)} aria-label="Tutup">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="amalan-nama" className="text-xs font-medium">Nama amalan</label>
                <input id="amalan-nama" placeholder="Contoh: Shalat Dhuha, Tilawah" value={newHabit.name} onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })} className="mt-1.5 w-full rounded-xl border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label htmlFor="amalan-kelompok" className="text-xs font-medium">Kelompok</label>
                <select id="amalan-kelompok" value={newHabit.category} onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })} className="mt-1.5 w-full rounded-xl border bg-card px-2.5 py-2.5 text-sm">
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="amalan-cara" className="text-xs font-medium">Cara mengisinya</label>
                <select id="amalan-cara" value={newHabit.type} onChange={(e) => setNewHabit({ ...newHabit, type: e.target.value })} className="mt-1.5 w-full rounded-xl border bg-card px-2.5 py-2.5 text-sm">
                  {typeOptions.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1.5 leading-5">{selectedType.hint}</p>
              </div>
              {newHabit.type !== "BOOLEAN" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="amalan-target" className="text-xs font-medium">Target per hari</label>
                    <input id="amalan-target" type="number" min={1} value={newHabit.target} onChange={(e) => setNewHabit({ ...newHabit, target: Number(e.target.value) })} className="mt-1.5 w-full rounded-xl border bg-card px-3 py-2.5 text-sm" placeholder="Contoh: 5" />
                  </div>
                  <div>
                    <label htmlFor="amalan-satuan" className="text-xs font-medium">Satuan</label>
                    <input id="amalan-satuan" value={newHabit.unit} onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })} className="mt-1.5 w-full rounded-xl border bg-card px-3 py-2.5 text-sm" placeholder={selectedType.unitPlaceholder} />
                  </div>
                </div>
              )}
              <Button className="w-full rounded-full min-h-[44px]" onClick={handleAddHabit} disabled={adding || !newHabit.name.trim()}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-1.5" />} Simpan Amalan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
