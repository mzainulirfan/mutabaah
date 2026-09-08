"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Link2, Trash2, Copy, Users, Loader2, Check, Sparkles, BookOpen, Heart, Target, Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type HabitRow = { id: string; name: string; category: string; type: string; target_value: number; unit: string | null; is_active: boolean };

const categories = ["Ibadah Wajib", "Ibadah Sunnah", "Al-Qur'an", "Dzikir & Doa", "Akhlak", "Belajar", "Kebiasaan Baik", "Custom"] as const;
const types = ["BOOLEAN", "QUANTITY", "COUNTER", "DURATION"] as const;

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

export default function KeluargaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<{ id: string; name: string } | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string; role: string; email: string }[]>([]);
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: "", category: "Ibadah Wajib", type: "BOOLEAN", target: 1, unit: "" });
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) { setLoading(false); return; }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setLoading(false); return; }
    const { data: mem } = await supabase.from("mutabaah_family_members").select("family_id").eq("user_id", auth.user.id).maybeSingle();
    if (!mem) { setLoading(false); return; }
    const { data: fam } = await supabase.from("mutabaah_families").select("id,name").eq("id", mem.family_id).single();
    if (fam) setFamily(fam);
    const { data: famMembers } = await supabase.from("mutabaah_family_members").select("user_id,role").eq("family_id", mem.family_id);
    const ids = (famMembers ?? []).map((m: any) => m.user_id);
    const { data: profiles } = ids.length ? await supabase.from("mutabaah_profiles").select("id,name").in("id", ids) : { data: [] as any[] };
    setMembers(
      (famMembers ?? []).map((m: any) => {
        const p = (profiles ?? []).find((x: any) => x.id === m.user_id);
        return { id: m.user_id, name: p?.name ?? m.user_id.slice(0, 6), role: m.role, email: `${(p?.name ?? "user").toLowerCase()}@keluarga.id` };
      })
    );
    const { data: habitRows } = await supabase.from("mutabaah_habits").select("id,name,category,type,target_value,unit,is_active").eq("family_id", mem.family_id).order("sort_order");
    setHabits((habitRows ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreateInvite = async () => {
    if (!family) return;
    setInviteLoading(true);
    try {
      const { createInvitation } = await import("@/lib/actions/family");
      const res = await createInvitation(family.id);
      setInviteUrl(res.url);
      setMsg("Undangan dibuat — berlaku 7 hari.");
    } catch (e: any) { setMsg(e.message); } finally { setInviteLoading(false); }
  };

  const handleAddHabit = async () => {
    if (!family || !newHabit.name.trim()) return;
    setAdding(true);
    try {
      const { createHabit } = await import("@/lib/actions/habit");
      await createHabit({ family_id: family.id, name: newHabit.name.trim(), category: newHabit.category, type: newHabit.type as any, target_value: Number(newHabit.target) || 1, unit: newHabit.unit || undefined });
      setNewHabit({ name: "", category: "Ibadah Wajib", type: "BOOLEAN", target: 1, unit: "" });
      setMsg("Amalan ditambahkan.");
      load();
    } catch (e: any) { setMsg(e.message); } finally { setAdding(false); }
  };

  const handleDeleteHabit = async (id: string) => {
    if (!confirm("Hapus amalan ini? History tetap ada.")) return;
    const { deleteHabit } = await import("@/lib/actions/habit");
    await deleteHabit(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const handleApplyTemplate = async (key: string) => {
    if (!family) return;
    const items = templates[key];
    if (!items) return;
    if (!confirm(`Terapkan template ${key} (${items.length} amalan)?`)) return;
    const { createHabit } = await import("@/lib/actions/habit");
    for (const it of items) {
      if (habits.some((h) => h.name === it.name)) continue;
      await createHabit({ family_id: family.id, name: it.name, category: it.category, type: it.type as any, target_value: it.target, unit: (it as any).unit ?? undefined });
    }
    setMsg(`Template ${key} diterapkan.`);
    load();
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-28 rounded-[24px] bg-muted" />
        <div className="h-40 rounded-[20px] bg-muted" />
      </div>
    );
  }

  if (!family) {
    return (
      <Card className="p-8 text-center rounded-[24px] border-dashed">
        <div className="h-14 w-14 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center mx-auto">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-bold text-lg mt-4">Belum ada keluarga</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-[32ch] mx-auto">Buat keluarga untuk atur amalan & undang anggota.</p>
        <Button className="mt-5 rounded-full" onClick={() => (window.location.href = "/onboarding")}>
          Buat Keluarga
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="rounded-[24px] p-6 lg:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-primary border border-primary/10">
              <Crown className="h-3.5 w-3.5" /> Keluarga
            </div>
            <h1 className="text-[26px] font-bold tracking-tight leading-none mt-3">{family.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {members.length} anggota • {habits.length} amalan • {habits.filter((h) => h.is_active).length} aktif
            </p>
            <div className="mt-3 flex -space-x-2">
              {members.slice(0, 5).map((m) => (
                <div key={m.id} className="h-8 w-8 rounded-full bg-[var(--primary-soft)] border-2 border-white flex items-center justify-center text-xs font-semibold text-primary">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
              ))}
              {members.length > 5 && <div className="h-8 w-8 rounded-full bg-muted border-2 border-white flex items-center justify-center text-xs">+{members.length - 5}</div>}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="rounded-2xl bg-muted px-4 py-3 text-center">
              <div className="text-xs text-muted-foreground">Anggota</div>
              <div className="font-bold text-lg">{members.length}</div>
            </div>
            <div className="rounded-2xl bg-[var(--primary-soft)] px-4 py-3 text-center border border-primary/10">
              <div className="text-xs text-primary">Amalan</div>
              <div className="font-bold text-primary text-lg">{habits.length}</div>
            </div>
          </div>
        </div>
      </Card>

      {msg && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><Check className="h-4 w-4" /> {msg}</div>}

      {/* Members */}
      <Card className="rounded-[20px] p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" /> Anggota keluarga
          </h2>
          <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium">{members.length} orang</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {members.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border p-3.5 hover:border-primary/15 transition-colors">
              <div className="h-11 w-11 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center font-bold text-primary">{p.name[0]?.toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold flex items-center gap-2">
                  {p.name}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${p.role === "OWNER" ? "bg-[var(--primary-soft)] text-primary border-primary/20" : p.role === "PARENT" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-muted text-muted-foreground"}`}>{p.role}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{p.email}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Habits — 3/5 */}
        <Card className="rounded-[20px] p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" /> Amalan
            </h3>
            <span className="text-xs bg-muted px-2.5 py-1 rounded-full">{habits.length} total</span>
          </div>

          {habits.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed p-6 text-center">
              <Target className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Belum ada amalan. Mulai dari template atau buat manual.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2 max-h-[320px] overflow-auto pr-1">
              {habits.map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-2xl border p-3 hover:border-primary/15 transition-colors">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${h.category === "Ibadah Wajib" ? "bg-emerald-50 text-emerald-600" : h.category === "Al-Qur'an" ? "bg-sky-50 text-sky-600" : "bg-muted text-muted-foreground"}`}>
                    {h.category === "Ibadah Wajib" ? <Heart className="h-4 w-4" /> : h.category === "Al-Qur'an" ? <BookOpen className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{h.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {h.category} • {h.type} {h.target_value > 1 ? `• ${h.target_value} ${h.unit ?? ""}` : ""}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDeleteHabit(h.id)} aria-label="Hapus">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 rounded-2xl border p-4 space-y-3 bg-muted/30">
            <div className="font-semibold text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> Tambah Amalan
            </div>
            <input placeholder="Nama amalan, mis. Shalat Dhuha" value={newHabit.name} onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })} className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="grid grid-cols-2 gap-2">
              <select value={newHabit.category} onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })} className="rounded-xl border bg-card px-2.5 py-2.5 text-sm">
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select value={newHabit.type} onChange={(e) => setNewHabit({ ...newHabit, type: e.target.value })} className="rounded-xl border bg-card px-2.5 py-2.5 text-sm">
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={1} value={newHabit.target} onChange={(e) => setNewHabit({ ...newHabit, target: Number(e.target.value) })} className="rounded-xl border bg-card px-3 py-2.5 text-sm" placeholder="Target" />
              <input value={newHabit.unit} onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })} className="rounded-xl border bg-card px-3 py-2.5 text-sm" placeholder="Unit (halaman/menit)" />
            </div>
            <Button className="w-full rounded-full" onClick={handleAddHabit} disabled={adding || !newHabit.name.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-1.5" />} Tambah Amalan
            </Button>
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card className="rounded-[20px] p-5">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Link2 className="h-4 w-4" /> Undangan
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Berlaku 7 hari. Token disimpan sebagai hash.</p>
            <div className="mt-4 flex gap-2">
              <div className="flex-1 rounded-xl border bg-muted px-3 py-2.5 text-xs truncate font-mono">{inviteUrl || "Belum ada undangan"}</div>
              <Button size="sm" variant="secondary" className="rounded-full shrink-0" disabled={!inviteUrl} onClick={() => navigator.clipboard.writeText(inviteUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button className="w-full rounded-full mt-3" onClick={handleCreateInvite} disabled={inviteLoading}>
              {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-1.5" />} Buat Undangan Baru
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">Bagikan link — anggota login lalu konfirmasi join di /join.</p>
          </Card>

          <Card className="rounded-[20px] p-5">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" /> Template
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Mulai cepat, nanti bisa diedit.</p>
            <div className="mt-4 grid gap-2">
              {[
                { key: "Anak", title: "Mutabaah Anak", items: "Shalat 5 waktu • Tilawah • Hafalan • Dzikir", icon: Heart },
                { key: "Harian", title: "Mutabaah Harian", items: "Shalat • Tilawah • Dzikir • Sedekah", icon: Target },
                { key: "Tahfidz", title: "Mutabaah Tahfidz", items: "Murajaah • Hafalan baru • Setoran", icon: BookOpen },
              ].map((t) => (
                <button key={t.key} onClick={() => handleApplyTemplate(t.key)} className="text-left rounded-2xl border p-3.5 hover:border-primary/20 hover:bg-[var(--primary-soft)]/40 transition-colors flex gap-3">
                  <t.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-5">{t.items}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
