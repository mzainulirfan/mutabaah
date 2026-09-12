"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, BookOpen, Heart, Target, ChevronLeft, ChevronRight, Pencil, X } from "@/components/ui/hugeicons";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { HabitType } from "@/lib/habits";
import { getErrorMessage } from "@/lib/utils";
import { clearFamilyCache, getFamilyContext, getSessionUser } from "@/lib/family-context";

type HabitRow = { id: string; name: string; category: string; type: string; target_value: number; unit: string | null; reminder_time: string | null; is_active: boolean };

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

function TemplateGrid({ onApply }: { onApply: (key: string) => void }) {
  return (
    <div className="grid gap-2">
      {templateMeta.map((t) => (
        <button key={t.key} onClick={() => onApply(t.key)} className="text-left rounded-2xl border p-3.5 hover:border-primary/20 hover:bg-[var(--primary-soft)]/40 transition-colors flex gap-3 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <t.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="text-sm font-semibold">Paket {t.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-5">{t.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function habitTargetText(h: { type: string; target_value: number; unit: string | null }) {
  if (h.type === "BOOLEAN") return "Sekali ketuk";
  if (h.type === "DURATION") return `Target ${h.target_value} ${h.unit ?? "menit"}`;
  if (h.target_value > 1) return `Target ${h.target_value} ${h.unit ?? "kali"}`;
  return "Hitung jumlah";
}

const templates: Record<string, { name: string; category: string; type: HabitType; target: number; unit?: string }[]> = {
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
  const [newHabit, setNewHabit] = useState<{ name: string; category: string; type: HabitType; target: number; unit: string; reminder: string }>({ name: "", category: "Ibadah Wajib", type: "BOOLEAN", target: 1, unit: "", reminder: "" });
  const [adding, setAdding] = useState(false);
  const [manageHabit, setManageHabit] = useState<HabitRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", category: "Ibadah Wajib", target: 1, unit: "", reminder: "", is_active: true });
  const [savingEdit, setSavingEdit] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  function friendlyHabitError(e: unknown) {
    const m = getErrorMessage(e);
    if (/row-level security|policy|permission denied|not allowed|violates/i.test(m)) {
      return "Kamu belum punya izin kelola amalan. Minta pemilik memberi izin.";
    }
    return m;
  }

  const load = useCallback(async () => {
    const user = await getSessionUser(supabase);
    if (!user) { setLoading(false); return; }
    const family = await getFamilyContext(supabase, user.id);
    if (!family) { setLoading(false); return; }
    setFamilyId(family.familyId);
    setCanManage(family.canManageHabits);
    const { data: habitRows } = await supabase.from("mutabaah_habits").select("id,name,category,type,target_value,unit,reminder_time,is_active").eq("family_id", family.familyId).order("sort_order");
    setHabits((habitRows ?? []) as HabitRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  useEffect(() => {
    if (!err) return;
    const t = setTimeout(() => setErr(null), 4000);
    return () => clearTimeout(t);
  }, [err]);

  const selectedType = typeOptions.find((t) => t.value === newHabit.type) ?? typeOptions[0];

  const handleAddHabit = async () => {
    if (!familyId || !newHabit.name.trim()) return;
    setAdding(true);
    try {
      const { createHabit } = await import("@/lib/actions/habit");
      const isTap = newHabit.type === "BOOLEAN";
      const reminder = newHabit.reminder.trim();
      if (reminder && !/^\d{2}:\d{2}$/.test(reminder)) throw new Error("Jam pengingat tidak valid.");
      await createHabit({
        family_id: familyId,
        name: newHabit.name.trim(),
        category: newHabit.category,
        type: newHabit.type,
        target_value: isTap ? 1 : Number(newHabit.target) || 1,
        unit: isTap ? undefined : newHabit.unit.trim() || selectedType.unitPlaceholder,
        reminder_time: reminder || undefined,
      });
      clearFamilyCache();
      setNewHabit({ name: "", category: "Ibadah Wajib", type: "BOOLEAN", target: 1, unit: "", reminder: "" });
      setHabitOpen(false);
      setMsg(`Amalan "${newHabit.name.trim()}" tersimpan. Silakan isi mulai hari ini.`);
      load();
    } catch (e: unknown) { setErr(friendlyHabitError(e)); } finally { setAdding(false); }
  };

  const handleDeleteHabit = async (id: string, name: string) => {
    if (!confirm(`Hapus "${name}"? Catatan yang sudah terisi tetap tersimpan.`)) return;
    try {
      const { deleteHabit } = await import("@/lib/actions/habit");
      await deleteHabit(id);
      clearFamilyCache();
      setHabits((prev) => prev.filter((h) => h.id !== id));
      setManageHabit(null);
      setMsg(`"${name}" dihapus.`);
    } catch (e: unknown) { setErr(friendlyHabitError(e)); }
  };

  const handleToggleActive = async (h: HabitRow) => {
    try {
      const { updateHabit } = await import("@/lib/actions/habit");
      await updateHabit(h.id, { is_active: !h.is_active });
      clearFamilyCache();
      const next = { ...h, is_active: !h.is_active };
      setHabits((prev) => prev.map((x) => (x.id === h.id ? next : x)));
      setManageHabit((prev) => (prev?.id === h.id ? next : prev));
      setMsg(next.is_active ? `"${h.name}" ditampilkan lagi di mutabaah harian.` : `"${h.name}" dijeda — tidak muncul di mutabaah harian.`);
    } catch (e: unknown) { setErr(friendlyHabitError(e)); }
  };

  const openEdit = (h: HabitRow) => {
    setEditForm({ name: h.name, category: h.category, target: Number(h.target_value) || 1, unit: h.unit ?? "", reminder: (h.reminder_time ?? "").slice(0, 5), is_active: h.is_active });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!manageHabit || !editForm.name.trim()) return;
    setSavingEdit(true);
    try {
      const { updateHabit } = await import("@/lib/actions/habit");
      const keepTarget = manageHabit.type === "BOOLEAN";
      const nextTarget = keepTarget ? manageHabit.target_value : Number(editForm.target) || 1;
      const nextUnit = keepTarget ? manageHabit.unit : editForm.unit.trim() || null;
      const nextReminder = editForm.reminder.trim();
      if (nextReminder && !/^\d{2}:\d{2}$/.test(nextReminder)) throw new Error("Jam pengingat tidak valid.");
      await updateHabit(manageHabit.id, {
        name: editForm.name.trim(),
        category: editForm.category,
        target_value: nextTarget,
        unit: nextUnit ?? undefined,
        reminder_time: nextReminder || null,
        is_active: editForm.is_active,
      });
      clearFamilyCache();
      const nextFields = { name: editForm.name.trim(), category: editForm.category, target_value: nextTarget, unit: nextUnit, reminder_time: nextReminder || null, is_active: editForm.is_active };
      setHabits((prev) => prev.map((x) => (x.id === manageHabit.id ? { ...x, ...nextFields } : x)));
      setManageHabit((prev) => (prev ? { ...prev, ...nextFields } : prev));
      setEditing(false);
      setMsg(`Perubahan "${editForm.name.trim()}" tersimpan.`);
    } catch (e: unknown) { setErr(friendlyHabitError(e)); } finally { setSavingEdit(false); }
  };

  const handleApplyTemplate = async (key: string) => {
    if (!familyId) return;
    const items = templates[key];
    if (!items) return;
    if (!confirm(`Tambahkan ${items.length} amalan contoh "${key}"? Yang sudah ada tidak diduplikasi.`)) return;
    const { createHabit } = await import("@/lib/actions/habit");
    for (const it of items) {
      if (habits.some((h) => h.name === it.name)) continue;
      await createHabit({ family_id: familyId, name: it.name, category: it.category, type: it.type, target_value: it.target, unit: it.unit });
    }
    clearFamilyCache();
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
        <Link href="/profil" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-full px-2 py-1 -ml-2">
          <ChevronLeft className="h-4 w-4" /> Profil
        </Link>
        <div className="flex items-center justify-between gap-2 mt-2">
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">Amalan</h1>
          {canManage && (
            <Button size="sm" className="rounded-full shrink-0" onClick={() => setHabitOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Buat amalan
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {habits.filter((h) => h.is_active).length} aktif dari {habits.length} amalan.
          {!canManage && " Minta pemilik memberi izin kelola untuk mengubah."}
        </p>
      </div>

      {msg && <Toast kind="success" message={msg} />}
      {err && <Toast kind="error" message={err} />}

      <div>
        {habits.length === 0 ? (
          <div>
            <p className="text-sm font-medium">Belum ada amalan</p>
            <p className="text-xs text-muted-foreground mt-1">
              {canManage ? "Mulai dari contoh di bawah, nanti tetap bisa diubah." : "Belum ada target di keluarga ini."}
            </p>
            {canManage && (
              <div className="mt-3">
                <TemplateGrid onApply={(key) => void handleApplyTemplate(key)} />
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {habits.map((h) => (
                <div
                  key={h.id}
                  role={canManage ? "button" : undefined}
                  tabIndex={canManage ? 0 : undefined}
                  onClick={canManage ? () => { setManageHabit(h); setEditing(false); } : undefined}
                  onKeyDown={canManage ? (e) => { if (e.target !== e.currentTarget) return; if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setManageHabit(h); setEditing(false); } } : undefined}
                  aria-label={canManage ? `Kelola ${h.name}` : undefined}
                  className={`w-full flex items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!h.is_active ? "opacity-70 bg-muted/30" : canManage ? "hover:border-primary/20 hover:bg-muted/40 cursor-pointer" : ""}`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${h.category === "Ibadah Wajib" ? "bg-emerald-50 text-emerald-600" : h.category === "Al-Qur'an" ? "bg-sky-50 text-sky-600" : "bg-muted text-muted-foreground"}`}>
                    {h.category === "Ibadah Wajib" ? <Heart className="h-4 w-4" /> : h.category === "Al-Qur'an" ? <BookOpen className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      {h.name} {!h.is_active && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">Dijeda</span>}
                      {h.reminder_time && (
                        <span className="text-[10px] font-semibold text-primary bg-[var(--primary-soft)] px-1.5 py-0.5 rounded-full tabular-nums shrink-0">
                          {h.reminder_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${h.is_active ? "bg-primary" : "bg-muted-foreground"}`} /> {h.category} • {typeLabel(h.type)}{h.type !== "BOOLEAN" ? ` • ${habitTargetText(h)}` : ""}
                    </div>
                  </div>
                  {canManage && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />}
                </div>
              ))}
            </div>
            {canManage && (
              <details className="mt-4 rounded-2xl border p-4">
                <summary className="text-sm font-medium cursor-pointer">Mulai dari contoh</summary>
                <p className="text-xs text-muted-foreground mt-1">Yang sudah ada tidak akan diduplikasi.</p>
                <div className="mt-3">
                  <TemplateGrid onApply={(key) => void handleApplyTemplate(key)} />
                </div>
              </details>
            )}
          </>
        )}
      </div>

      {manageHabit && canManage && (
        <Sheet label={`Kelola ${manageHabit.name}`} onClose={() => setManageHabit(null)}>
          <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold truncate">{editing ? "Ubah amalan" : manageHabit.name}</h3>
              <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => setManageHabit(null)} aria-label="Tutup">
                <X className="h-4 w-4" />
              </Button>
            </div>
            {!editing ? (
              <>
                <p className="text-xs text-muted-foreground mt-1">{manageHabit.category} • {typeLabel(manageHabit.type)}{manageHabit.type !== "BOOLEAN" ? ` • ${habitTargetText(manageHabit)}` : ""} • {manageHabit.is_active ? "Aktif di mutabaah harian" : "Sedang dijeda"}</p>
                <div className="mt-5 space-y-2">
                  <button
                    onClick={() => openEdit(manageHabit)}
                    className="w-full flex items-center gap-3 rounded-2xl border p-3.5 text-left hover:border-primary/20 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      <span className="block text-sm font-medium">Ubah nama & target</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">Nama, kelompok, target, dan satuan</span>
                    </span>
                  </button>
                  <button
                    onClick={() => handleToggleActive(manageHabit)}
                    className="w-full flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-left hover:border-primary/20 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>
                      <span className="block text-sm font-medium">{manageHabit.is_active ? "Jeda amalan ini" : "Tampilkan lagi"}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{manageHabit.is_active ? "Disembunyikan dari mutabaah harian, riwayat tetap ada." : "Muncul lagi di mutabaah harian."}</span>
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${manageHabit.is_active ? "bg-[var(--primary-soft)] text-primary" : "bg-muted text-muted-foreground"}`}>
                      {manageHabit.is_active ? "Aktif" : "Dijeda"}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteHabit(manageHabit.id, manageHabit.name)}
                    className="w-full flex items-center gap-3 rounded-2xl border border-red-200 p-3.5 text-left text-red-700 hover:bg-red-50 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    <span>
                      <span className="block text-sm font-medium">Hapus amalan</span>
                      <span className="block text-xs opacity-80 mt-0.5">Catatan yang sudah terisi tetap tersimpan.</span>
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="ubah-nama" className="text-xs font-medium">Nama amalan</label>
                  <input id="ubah-nama" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mt-1.5 w-full rounded-xl border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label htmlFor="ubah-kelompok" className="text-xs font-medium">Kelompok</label>
                  <select id="ubah-kelompok" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="mt-1.5 w-full rounded-xl border bg-card px-2.5 py-2.5 text-sm">
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
                  Cara mengisinya: <span className="font-medium text-foreground">{typeLabel(manageHabit.type)}</span> — dikunci agar riwayat tetap valid.
                </div>
                {manageHabit.type !== "BOOLEAN" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="ubah-target" className="text-xs font-medium">Target per hari</label>
                      <input id="ubah-target" type="number" min={1} value={editForm.target} onChange={(e) => setEditForm({ ...editForm, target: Number(e.target.value) })} className="mt-1.5 w-full rounded-xl border bg-card px-3 py-2.5 text-sm" />
                    </div>
                    <div>
                      <label htmlFor="ubah-satuan" className="text-xs font-medium">Satuan</label>
                      <input id="ubah-satuan" value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} className="mt-1.5 w-full rounded-xl border bg-card px-3 py-2.5 text-sm" placeholder="halaman / menit" />
                    </div>
                  </div>
                )}
                <div>
                  <label htmlFor="ubah-ingatkan" className="text-xs font-medium">Ingatkan saya <span className="text-muted-foreground font-normal">(opsional)</span></label>
                  <input id="ubah-ingatkan" type="time" value={editForm.reminder} onChange={(e) => setEditForm({ ...editForm, reminder: e.target.value })} className="mt-1.5 w-full rounded-xl border bg-card px-3 py-2.5 text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1 rounded-full min-h-[44px]" onClick={() => setEditing(false)}>
                    Kembali
                  </Button>
                  <Button className="flex-1 rounded-full min-h-[44px]" onClick={handleSaveEdit} disabled={savingEdit || !editForm.name.trim()}>
                    {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Simpan
                  </Button>
                </div>
              </div>
            )}
        </Sheet>
      )}

      {habitOpen && (
        <Sheet label="Buat amalan baru" onClose={() => setHabitOpen(false)}>
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
                <select id="amalan-cara" value={newHabit.type} onChange={(e) => setNewHabit({ ...newHabit, type: e.target.value as HabitType })} className="mt-1.5 w-full rounded-xl border bg-card px-2.5 py-2.5 text-sm">
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
              <div>
                <label htmlFor="amalan-ingatkan" className="text-xs font-medium">Ingatkan saya <span className="text-muted-foreground font-normal">(opsional)</span></label>
                <input id="amalan-ingatkan" type="time" value={newHabit.reminder} onChange={(e) => setNewHabit({ ...newHabit, reminder: e.target.value })} className="mt-1.5 w-full rounded-xl border bg-card px-3 py-2.5 text-sm" />
                <p className="text-[11px] text-muted-foreground mt-1">Berbunyi bila amalan ini belum selesai. Kosongkan untuk tanpa pengingat.</p>
              </div>
              <Button className="w-full rounded-full min-h-[44px]" onClick={handleAddHabit} disabled={adding || !newHabit.name.trim()}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-1.5" />} Simpan Amalan
              </Button>
            </div>
        </Sheet>
      )}
    </div>
  );
}
