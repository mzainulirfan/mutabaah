"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Link2, Trash2, Copy, Users, Loader2, Check } from "lucide-react";
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
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      return;
    }
    const { data: mem } = await supabase.from("mutabaah_family_members").select("family_id").eq("user_id", auth.user.id).maybeSingle();
    if (!mem) {
      setLoading(false);
      return;
    }
    const { data: fam } = await supabase.from("mutabaah_families").select("id,name").eq("id", mem.family_id).single();
    if (fam) setFamily(fam);
    const { data: famMembers } = await supabase.from("mutabaah_family_members").select("user_id,role").eq("family_id", mem.family_id);
    const ids = (famMembers ?? []).map((m: any) => m.user_id);
    const { data: profiles } = ids.length ? await supabase.from("mutabaah_profiles").select("id,name").in("id", ids) : { data: [] as any[] };
    const { data: users } = await supabase.auth.admin ? { data: null } : { data: null }; // fallback email from profile
    // we don't have email in profiles, use name + placeholder
    setMembers(
      (famMembers ?? []).map((m: any) => {
        const p = (profiles ?? []).find((x: any) => x.id === m.user_id);
        return { id: m.user_id, name: p?.name ?? m.user_id.slice(0, 6), role: m.role, email: `${(p?.name ?? "user").toLowerCase()}@keluarga.id` };
      })
    );
    const { data: habitRows } = await supabase
      .from("mutabaah_habits")
      .select("id,name,category,type,target_value,unit,is_active")
      .eq("family_id", mem.family_id)
      .order("sort_order");
    setHabits((habitRows ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateInvite = async () => {
    if (!family) return;
    setInviteLoading(true);
    try {
      const { createInvitation } = await import("@/lib/actions/family");
      const res = await createInvitation(family.id);
      setInviteUrl(res.url);
      setMsg("Undangan dibuat — berlaku 7 hari.");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAddHabit = async () => {
    if (!family || !newHabit.name.trim()) return;
    setAdding(true);
    try {
      const { createHabit } = await import("@/lib/actions/habit");
      await createHabit({
        family_id: family.id,
        name: newHabit.name.trim(),
        category: newHabit.category,
        type: newHabit.type as any,
        target_value: Number(newHabit.target) || 1,
        unit: newHabit.unit || undefined,
      });
      setNewHabit({ name: "", category: "Ibadah Wajib", type: "BOOLEAN", target: 1, unit: "" });
      setMsg("Amalan ditambahkan.");
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setAdding(false);
    }
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
      // skip if already exists by name
      if (habits.some((h) => h.name === it.name)) continue;
      await createHabit({
        family_id: family.id,
        name: it.name,
        category: it.category,
        type: it.type as any,
        target_value: it.target,
        unit: (it as any).unit ?? null,
      });
    }
    setMsg(`Template ${key} diterapkan.`);
    load();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-muted rounded-2xl" />
        <div className="h-40 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (!family) {
    return (
      <Card className="p-10 text-center">
        <Users className="h-8 w-8 mx-auto text-muted-foreground" />
        <h3 className="font-semibold mt-3">Belum ada keluarga</h3>
        <p className="text-sm text-muted-foreground mt-1">Buat keluarga di onboarding atau login sebagai ayah@mutabaah.demo.</p>
        <Button className="mt-4" onClick={() => (window.location.href = "/onboarding")}>
          Buat Keluarga
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold">Keluarga</h1>
          <p className="text-sm text-muted-foreground">
            {family.name} • {members.length} anggota • {habits.length} amalan
          </p>
        </div>
      </div>

      {msg && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 flex items-center gap-2"><Check className="h-4 w-4" /> {msg}</div>}

      <Card className="p-5">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Users className="h-4 w-4" /> Anggota
        </h2>
        <div className="mt-4 space-y-3">
          {members.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border p-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-semibold text-sm">{p.name[0]?.toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium flex items-center gap-2">
                  {p.name}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${p.role === "OWNER" ? "bg-[var(--primary-soft)] text-primary border-primary/20" : p.role === "PARENT" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-muted text-muted-foreground"}`}
                  >
                    {p.role}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{p.email}</div>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">{p.id.slice(0, 6)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-sm">Amalan / Habit</h3>
          <div className="mt-4 space-y-2 max-h-[320px] overflow-auto pr-1">
            {habits.length === 0 && <p className="text-sm text-muted-foreground">Belum ada amalan.</p>}
            {habits.map((h) => (
              <div key={h.id} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{h.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {h.category} • {h.type} {h.target_value > 1 ? `• ${h.target_value} ${h.unit ?? ""}` : ""} {h.is_active ? "" : "• nonaktif"}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteHabit(h.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border p-3 space-y-2 bg-muted/30">
            <div className="font-medium text-sm">Tambah Amalan</div>
            <input
              placeholder="Nama amalan, mis. Shalat Dhuha"
              value={newHabit.name}
              onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
              className="w-full rounded-xl border px-3 py-2 text-sm bg-card"
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={newHabit.category} onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })} className="rounded-xl border px-2 py-2 text-sm bg-card">
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select value={newHabit.type} onChange={(e) => setNewHabit({ ...newHabit, type: e.target.value })} className="rounded-xl border px-2 py-2 text-sm bg-card">
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={1} value={newHabit.target} onChange={(e) => setNewHabit({ ...newHabit, target: Number(e.target.value) })} className="rounded-xl border px-3 py-2 text-sm bg-card" placeholder="Target" />
              <input value={newHabit.unit} onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })} className="rounded-xl border px-3 py-2 text-sm bg-card" placeholder="Unit (halaman/menit)" />
            </div>
            <Button size="sm" className="w-full" onClick={handleAddHabit} disabled={adding || !newHabit.name.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-1.5" />}
              Tambah Amalan
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Undangan
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Buat link undangan — berlaku 7 hari. Token disimpan hash.</p>
            <div className="mt-3 flex gap-2">
              <div className="flex-1 rounded-full border bg-muted px-4 py-2 text-xs truncate">{inviteUrl || "Belum ada undangan"}</div>
              <Button size="sm" variant="secondary" disabled={!inviteUrl} onClick={() => navigator.clipboard.writeText(inviteUrl)}>
                <Copy className="h-4 w-4 mr-1.5" /> Salin
              </Button>
            </div>
            <Button size="md" className="w-full mt-3" onClick={handleCreateInvite} disabled={inviteLoading}>
              {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Buat Undangan Baru
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Bagikan link ke anggota keluarga. Mereka login lalu konfirmasi join.</p>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-sm">Template</h3>
            <div className="mt-3 grid gap-2">
              {[
                { key: "Anak", title: "Mutabaah Anak", items: "Shalat 5 waktu • Tilawah • Hafalan • Dzikir" },
                { key: "Harian", title: "Mutabaah Harian", items: "Shalat • Tilawah • Dzikir • Sedekah" },
                { key: "Tahfidz", title: "Mutabaah Tahfidz", items: "Murajaah • Hafalan baru • Setoran" },
              ].map((t) => (
                <button key={t.key} onClick={() => handleApplyTemplate(t.key)} className="text-left rounded-xl border p-3 hover:border-primary/20 hover:bg-muted/50 transition-colors">
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.items}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
