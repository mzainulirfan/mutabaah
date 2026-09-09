"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Entry, HabitCategory } from "@/lib/mock-data";
import { HabitCard } from "@/components/app/habit-card";
import { ProgressRing } from "@/components/app/progress-ring";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StickyNote, WifiOff, Sparkles } from "lucide-react";
import { enqueue, syncQueue, clearInvalidQueue } from "@/lib/offline-queue";
import { localDateKey } from "@/lib/local-date";
import type { EntryRow } from "@/lib/supabase/types";
import { getErrorMessage } from "@/lib/utils";
import { getFamilyContext, getSessionUser } from "@/lib/family-context";

type DbHabit = {
  id: string;
  name: string;
  category: string;
  type: "BOOLEAN" | "QUANTITY" | "COUNTER" | "DURATION";
  target_value: number;
  unit: string | null;
};

export default function MutabaahPage() {
  const router = useRouter();
  const [dbHabits, setDbHabits] = useState<DbHabit[] | null>(null);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [date, setDate] = useState(() => new Date());
  const [filter, setFilter] = useState<string>("Semua");
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteLoaded, setNoteLoaded] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(
    async (d: Date) => {
      setLoading(true);
      const iso = localDateKey(d);
      try {
        if (!supabase) {
          const { habits: mockHabits, initialEntries } = await import("@/lib/mock-data");
          setDbHabits(mockHabits.map((h) => ({ id: h.id, name: h.name, category: h.category, type: h.type, target_value: h.target, unit: h.unit ?? null })));
          setEntries(initialEntries);
          setNoteText("");
          setNoteLoaded("");
          setNoteSaved(false);
          setLoading(false);
          return;
        }
        const user = await getSessionUser(supabase);
        if (!user) {
          const { habits: mockHabits, initialEntries } = await import("@/lib/mock-data");
          setDbHabits(mockHabits.map((h) => ({ id: h.id, name: h.name, category: h.category, type: h.type, target_value: h.target, unit: h.unit ?? null })));
          setEntries(initialEntries);
          setNoteText("");
          setNoteLoaded("");
          setNoteSaved(false);
          setUserId(null);
          setLoading(false);
          return;
        }
        setUserId(user.id);
        const family = await getFamilyContext(supabase, user.id);
        if (!family) {
          setDbHabits([]);
          setEntries({});
          setLoading(false);
          return;
        }
        setDbHabits(family.habits);
        const { data: dbEntries } = await supabase.from("mutabaah_entries").select("habit_id,value,status,note,context").eq("family_id", family.familyId).eq("user_id", user.id).eq("date", iso);
        const map: Record<string, Entry> = {};
        ((dbEntries ?? []) as EntryRow[]).forEach((e) => {
          map[e.habit_id] = { habitId: e.habit_id, value: Number(e.value), status: e.status, note: e.note ?? undefined, context: e.context ?? null };
        });
        setEntries(map);
        const saved = Object.values(map).map((e) => e.note?.trim()).find((n) => n) ?? "";
        setNoteText(saved);
        setNoteLoaded(saved);
        setNoteSaved(!!saved);
      } catch (e: unknown) {
        setSyncError(getErrorMessage(e, "Gagal memuat"));
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    void (async () => {
      await load(date);
    })();
  }, [load, date]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const refreshDayIfNeeded = () => {
      setDate((current) => {
        const now = new Date();
        return localDateKey(current) === localDateKey(now) ? current : now;
      });
    };

    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => {
        refreshDayIfNeeded();
        scheduleMidnightRefresh();
      }, nextMidnight.getTime() - now.getTime() + 50);
    };

    scheduleMidnightRefresh();
    window.addEventListener("focus", refreshDayIfNeeded);
    document.addEventListener("visibilitychange", refreshDayIfNeeded);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refreshDayIfNeeded);
      document.removeEventListener("visibilitychange", refreshDayIfNeeded);
    };
  }, []);

  useEffect(() => {
    clearInvalidQueue();
    if (!userId) return;
    const doSync = () =>
      syncQueue(async (e) => {
        const { updateMutabaahEntry } = await import("@/lib/actions/habit");
        await updateMutabaahEntry({ habit_id: e.habit_id, user_id: userId, date: e.date, value: e.value, status: e.status as Entry["status"], note: e.note, context: e.context ?? null });
      })
        .then(() => setSyncError(null))
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : "";
          if (message.includes("Invalid habit_id")) clearInvalidQueue();
          setSyncError(message.includes("Invalid habit_id") ? "Data lama dibersihkan — coba lagi." : "Perubahan belum tersimpan. Coba lagi.");
        });
    window.addEventListener("online", doSync);
    doSync();
    return () => window.removeEventListener("online", doSync);
  }, [userId]);

  const categories = useMemo(() => Array.from(new Set((dbHabits ?? []).map((h) => h.category))), [dbHabits]);

  const daily = useMemo(() => {
    if (!dbHabits || dbHabits.length === 0) return 0;
    const progresses = dbHabits.map((h) => {
      const e = entries[h.id];
      if (!e || e.status === "PENDING") return 0;
      if (e.status === "COMPLETED") return 100;
      if (h.type === "BOOLEAN") return e.value ? 100 : 0;
      return Math.round(Math.min(100, (e.value / h.target_value) * 100));
    });
    return Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length);
  }, [dbHabits, entries]);

  const completedCount = useMemo(() => Object.values(entries).filter((e) => e.status === "COMPLETED").length, [entries]);

  async function persist(habitId: string, value: number, status: Entry["status"], context?: "SENDIRI" | "BERJAMAAH" | null) {
    const iso = localDateKey(date);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(habitId)) {
      setSyncError("Sepertinya datanya sudah lama — muat ulang halaman sekali saja, ya.");
      return;
    }
    const payload = { habit_id: habitId, value, status, date: iso, context: context ?? null };
    if (!userId) return;
    if (!navigator.onLine) {
      enqueue(payload);
      setSyncError("Kamu sedang offline — perubahan akan tersimpan otomatis saat online kembali.");
      return;
    }
    try {
      const { updateMutabaahEntry } = await import("@/lib/actions/habit");
      await updateMutabaahEntry({ habit_id: habitId, user_id: userId, date: iso, value, status, context: context ?? null });
      setSyncError(null);
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("Invalid habit_id")) {
        clearInvalidQueue();
        setSyncError("Ada data lama yang sudah dibersihkan — muat ulang halaman sekali saja.");
        return;
      }
      enqueue(payload);
      setSyncError("Perubahan belum tersimpan — akan dicoba lagi otomatis.");
    }
  }

  async function saveNote(text: string) {
    const trimmed = text.trim();
    if (!userId || !dbHabits?.length || trimmed === noteLoaded.trim()) return;
    setNoteSaving(true);
    try {
      const { updateMutabaahEntry } = await import("@/lib/actions/habit");
      // Simpan pada entri yang sudah ada; kalau belum ada, buat entri baru (PENDING + catatan)
      const target = dbHabits.find((h) => entries[h.id]) ?? dbHabits[0];
      const cur = entries[target.id];
      const value = cur?.value ?? 0;
      const status = cur?.status ?? "PENDING";
      const context = cur?.context ?? null;
      await updateMutabaahEntry({ habit_id: target.id, user_id: userId, date: localDateKey(date), value, status, note: trimmed || null, context });
      setEntries((prev) => ({ ...prev, [target.id]: { habitId: target.id, value, status, note: trimmed || undefined, context } }));
      setNoteLoaded(trimmed);
      setNoteSaved(true);
      setSyncError(null);
    } catch {
      setSyncError("Refleksi belum tersimpan — coba lagi.");
    } finally {
      setNoteSaving(false);
    }
  }

  function handleToggle(habitId: string) {
    const habit = dbHabits?.find((h) => h.id === habitId);
    if (!habit) return;
    // Sholat wajib yang belum selesai: wajib pilih Sendiri/Berjamaah dulu (bukan langsung selesai)
    if (habit.category === "Ibadah Wajib" && (!entries[habitId] || entries[habitId].status !== "COMPLETED")) return;
    setEntries((prev) => {
      const cur = prev[habitId];
      let next: Entry;
      if (!cur || cur.status === "PENDING") next = { habitId, value: habit.type === "BOOLEAN" ? 1 : habit.target_value, status: "COMPLETED" };
      else if (cur.status === "COMPLETED") next = { habitId, value: 0, status: "PENDING" };
      else next = { habitId, value: habit.target_value, status: "COMPLETED" };
      persist(habitId, next.value, next.status, null);
      return { ...prev, [habitId]: next };
    });
  }

  function handleContext(habitId: string, ctx: "SENDIRI" | "BERJAMAAH") {
    const habit = dbHabits?.find((h) => h.id === habitId);
    if (!habit) return;
    const target = habit.type === "BOOLEAN" ? 1 : habit.target_value;
    const next: Entry = { habitId, value: target, status: "COMPLETED", context: ctx };
    setEntries((prev) => ({ ...prev, [habitId]: next }));
    persist(habitId, target, "COMPLETED", ctx);
  }

  function handleUpdate(habitId: string, delta: number) {
    const habit = dbHabits?.find((h) => h.id === habitId);
    if (!habit) return;
    setEntries((prev) => {
      const cur = prev[habitId] ?? { habitId, value: 0, status: "PENDING" as const };
      const nextVal = Math.max(0, Math.min(habit.target_value, cur.value + delta));
      let status: Entry["status"] = "PENDING";
      if (nextVal === 0) status = "PENDING";
      else if (nextVal >= habit.target_value) status = "COMPLETED";
      else status = "PARTIAL";
      persist(habitId, nextVal, status);
      return { ...prev, [habitId]: { habitId, value: nextVal, status } };
    });
  }

  const filteredHabits = useMemo(() => (filter === "Semua" ? dbHabits ?? [] : (dbHabits ?? []).filter((h) => h.category === filter)), [dbHabits, filter]);
  const grouped = useMemo(
    () => categories.map((cat) => ({ cat, items: filteredHabits.filter((h) => h.category === cat) })).filter((g) => g.items.length > 0),
    [categories, filteredHabits]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-[720px] space-y-4 animate-pulse" aria-busy="true" aria-label="Memuat mutabaah">
        <div className="h-16 rounded-[20px] bg-muted" />
        <div className="h-[104px] rounded-[20px] bg-muted" />
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-full bg-muted" />
          <div className="h-9 w-24 rounded-full bg-muted" />
          <div className="h-9 w-24 rounded-full bg-muted" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[76px] rounded-[20px] bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!dbHabits || dbHabits.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center rounded-[24px] border-dashed">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-bold text-lg mt-4">Belum ada target hari ini</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[36ch] mx-auto leading-6">Mulai dari satu amalan kecil dulu. Nanti bisa ditambah pelan-pelan bersama keluarga.</p>
          <Button className="mt-5 rounded-full" onClick={() => router.push("/keluarga/amalan")}>
            Buat Target Pertama
          </Button>
        </Card>
      </div>
    );
  }



  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      {/* Judul — tanggal sebagai eyebrow, status satu kalimat */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight mt-1">Mutabaah Hari Ini</h1>
          <p className="text-sm text-muted-foreground mt-1 leading-6">
            {daily === 100
              ? "Alhamdulillah, bagian hari ini sudah selesai."
              : completedCount === 0
                ? "Hari masih baru — mulai dari satu ketukan kecil."
                : `Sudah ${completedCount} terisi, tinggal ${dbHabits.length - completedCount} lagi.`}
          </p>
        </div>
        <Button
          variant={showNote ? "secondary" : "ghost"}
          size="sm"
          className="rounded-full shrink-0 border mt-1"
          onClick={() => setShowNote(!showNote)}
          aria-expanded={showNote}
        >
          <StickyNote className="h-4 w-4 mr-1.5" /> Refleksi
        </Button>
      </div>

      {/* Kemajuan — strip ramping dengan jalan ke Progress */}
      <div className="rounded-[20px] px-5 py-4 text-white relative overflow-hidden bg-gradient-to-br from-[#1C5B40] via-[#17452F] to-[#102E21]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <ProgressRing value={daily} size={72} stroke={8} track="rgba(255,255,255,0.18)" bar="#E9D9A6" valueClassName="text-white" labelClassName="text-white/60" />
          <div className="flex-1 min-w-0">
            <p className="text-[22px] font-bold leading-none text-white tabular-nums">
              {daily}% <span className="text-xs font-normal text-white/60">· {completedCount}/{dbHabits.length} terisi</span>
            </p>
            <a href="/progress" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-white/70 underline underline-offset-4 hover:text-white">
              Lihat perjalanan mingguan →
            </a>
          </div>
        </div>
      </div>

      {showNote && (
        <Card className="rounded-[20px] p-5">
          <label htmlFor="refleksi" className="text-sm font-medium">Refleksi singkat hari ini</label>
          <textarea
            id="refleksi"
            value={noteText}
            onChange={(e) => {
              setNoteText(e.target.value);
              setNoteSaved(false);
            }}
            onBlur={() => {
              if (noteText.trim() !== noteLoaded.trim()) void saveNote(noteText);
            }}
            placeholder="Apa yang paling berkesan hari ini? Cukup satu kalimat…"
            className="mt-2 w-full min-h-[72px] rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              className="rounded-full"
              disabled={noteSaving || !userId || noteText.trim() === noteLoaded.trim()}
              onClick={() => void saveNote(noteText)}
            >
              {noteSaving ? "Menyimpan…" : noteSaved && noteText.trim() ? "Tersimpan ✓" : "Simpan refleksi"}
            </Button>
            {!userId && <span className="text-xs text-muted-foreground">Masuk untuk menyimpan.</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Hanya untukmu — catatan ini privat dan tidak dibagikan ke siapa pun.</p>
        </Card>
      )}

      {/* Saring berdasarkan kategori — menempel saat menggulir */}
      <div className="sticky top-14 z-20 -mx-4 px-4 lg:mx-0 lg:px-0 py-2 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="group" aria-label="Saring berdasarkan kategori">
          {["Semua", ...categories].map((c) => {
            const active = filter === c;
            return (
              <button
                key={c}
                onClick={() => setFilter(c)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-4 py-2 min-h-[36px] text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary text-white border-primary shadow-sm" : "bg-card hover:bg-muted"}`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Daftar amalan per kategori — hitung yang terisi, bukan total */}
      <div className="space-y-6">
        {grouped.length === 0 && (
          <Card className="rounded-[20px] p-6 text-center">
            <p className="text-sm font-medium">Tidak ada amalan pada saringan ini.</p>
            <p className="text-xs text-muted-foreground mt-1">Coba pilih kategori lain.</p>
            <Button variant="secondary" size="sm" className="rounded-full mt-4" onClick={() => setFilter("Semua")}>
              Tampilkan semua
            </Button>
          </Card>
        )}
        {grouped.map((g) => {
          const filled = g.items.filter((h) => entries[h.id]?.status === "COMPLETED").length;
          const allDone = filled === g.items.length;
          return (
            <section key={g.cat} aria-label={`Kategori ${g.cat}`}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">{g.cat}</h2>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${allDone ? "bg-[var(--primary-soft)] text-primary" : "bg-muted text-muted-foreground"}`}>
                  {filled}/{g.items.length} terisi
                </span>
              </div>
              <div className="grid gap-3">
                {g.items.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={{ id: h.id, name: h.name, category: h.category as HabitCategory, type: h.type, target: h.target_value, unit: h.unit ?? undefined }}
                  entry={entries[h.id]}
                  onToggle={() => handleToggle(h.id)}
                  onUpdateValue={(d) => handleUpdate(h.id, d)}
                  onPickContext={h.category === "Ibadah Wajib" ? (ctx) => handleContext(h.id, ctx) : undefined}
                />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {syncError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800 flex items-center justify-center gap-2" role="status">
          <WifiOff className="h-4 w-4" aria-hidden="true" /> {syncError}
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">{userId ? "Perubahan tersimpan otomatis." : "Masuk untuk menyimpan catatanmu dengan aman."}</p>
      )}
    </div>
  );
}
