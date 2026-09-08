"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Entry } from "@/lib/mock-data";
import { HabitCard } from "@/components/app/habit-card";
import { ProgressRing } from "@/components/app/progress-ring";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, StickyNote, WifiOff, Loader2, Sparkles } from "lucide-react";
import { enqueue, syncQueue, clearInvalidQueue } from "@/lib/offline-queue";
import { QuranReader } from "@/components/quran/quran-reader";

type DbHabit = {
  id: string;
  name: string;
  category: string;
  type: "BOOLEAN" | "QUANTITY" | "COUNTER" | "DURATION";
  target_value: number;
  unit: string | null;
};

function formatDate(d: Date) {
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function isToday(d: Date) {
  return toISO(d) === toISO(new Date());
}

export default function MutabaahPage() {
  const [dbHabits, setDbHabits] = useState<DbHabit[] | null>(null);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [date, setDate] = useState(new Date());
  const [filter, setFilter] = useState<string>("Semua");
  const [showNote, setShowNote] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerHabitId, setReaderHabitId] = useState<string | null>(null);
  const [readerPage, setReaderPage] = useState(1);

  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(
    async (d: Date) => {
      setLoading(true);
      const iso = toISO(d);
      try {
        if (!supabase) {
          const { habits: mockHabits, initialEntries } = await import("@/lib/mock-data");
          setDbHabits(mockHabits.map((h) => ({ id: h.id, name: h.name, category: h.category, type: h.type, target_value: h.target, unit: h.unit ?? null })));
          setEntries(initialEntries);
          setLoading(false);
          return;
        }
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          const { habits: mockHabits, initialEntries } = await import("@/lib/mock-data");
          setDbHabits(mockHabits.map((h) => ({ id: h.id, name: h.name, category: h.category, type: h.type, target_value: h.target, unit: h.unit ?? null })));
          setEntries(initialEntries);
          setUserId(null);
          setLoading(false);
          return;
        }
        setUserId(auth.user.id);
        const { data: membership } = await supabase.from("mutabaah_family_members").select("family_id").eq("user_id", auth.user.id).limit(1).maybeSingle();
        if (!membership) {
          setDbHabits([]);
          setEntries({});
          setLoading(false);
          return;
        }
        const { data: habits } = await supabase.from("mutabaah_habits").select("id,name,category,type,target_value,unit").eq("family_id", membership.family_id).eq("is_active", true).order("sort_order");
        setDbHabits(habits ?? []);
        const { data: dbEntries } = await supabase.from("mutabaah_entries").select("habit_id,value,status,note").eq("user_id", auth.user.id).eq("date", iso);
        const map: Record<string, Entry> = {};
        (dbEntries ?? []).forEach((e: any) => {
          map[e.habit_id] = { habitId: e.habit_id, value: Number(e.value), status: e.status, note: e.note ?? undefined };
        });
        setEntries(map);
      } catch (e: any) {
        setSyncError(e.message ?? "Gagal memuat");
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    load(date);
  }, [load, date]);

  useEffect(() => {
    clearInvalidQueue();
    if (!userId) return;
    const doSync = () =>
      syncQueue(async (e) => {
        const { updateMutabaahEntry } = await import("@/lib/actions/habit");
        await updateMutabaahEntry({ habit_id: e.habit_id, user_id: userId, date: e.date, value: e.value, status: e.status as any, note: e.note });
      })
        .then(() => setSyncError(null))
        .catch((err: any) => {
          if (err?.message?.includes("Invalid habit_id")) clearInvalidQueue();
          setSyncError(err?.message?.includes("Invalid habit_id") ? "Data lama dibersihkan — coba lagi." : "Perubahan belum tersimpan. Coba lagi.");
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

  async function persist(habitId: string, value: number, status: Entry["status"]) {
    const iso = toISO(date);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(habitId)) {
      setSyncError("Data lokal kadaluarsa — refresh halaman.");
      return;
    }
    const payload = { habit_id: habitId, value, status, date: iso };
    if (!userId) return;
    if (!navigator.onLine) {
      enqueue(payload);
      setSyncError("Offline — perubahan akan disinkronkan.");
      return;
    }
    try {
      const { updateMutabaahEntry } = await import("@/lib/actions/habit");
      await updateMutabaahEntry({ habit_id: habitId, user_id: userId, date: iso, value, status });
      setSyncError(null);
    } catch (e: any) {
      if (e?.message?.includes("Invalid habit_id")) {
        clearInvalidQueue();
        setSyncError("Data lama dibersihkan — refresh halaman.");
        return;
      }
      enqueue(payload);
      setSyncError("Perubahan belum tersimpan. Coba lagi.");
    }
  }

  function handleToggle(habitId: string) {
    const habit = dbHabits?.find((h) => h.id === habitId);
    if (!habit) return;
    setEntries((prev) => {
      const cur = prev[habitId];
      let next: Entry;
      if (!cur || cur.status === "PENDING") next = { habitId, value: habit.type === "BOOLEAN" ? 1 : habit.target_value, status: "COMPLETED" };
      else if (cur.status === "COMPLETED") next = { habitId, value: 0, status: "PENDING" };
      else next = { habitId, value: habit.target_value, status: "COMPLETED" };
      persist(habitId, next.value, next.status);
      return { ...prev, [habitId]: next };
    });
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
      <div className="space-y-5 animate-pulse">
        <div className="h-20 rounded-[24px] bg-muted" />
        <div className="h-36 rounded-[24px] bg-muted" />
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-full bg-muted" />
          <div className="h-8 w-24 rounded-full bg-muted" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted" />
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
          <h3 className="font-bold text-lg mt-4">Belum ada target mutabaah.</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[32ch] mx-auto">Tambahkan target pertama untuk memulai. Cukup 1 langkah.</p>
          <Button className="mt-5 rounded-full" onClick={() => (window.location.href = "/keluarga")}>
            Tambah Amalan
          </Button>
          {!userId && <p className="text-xs text-muted-foreground mt-3">Login sebagai ayah@mutabaah.demo untuk melihat data seed.</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header — single source tanggal di nav */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight leading-none">Mutabaah Harian</h1>
          <p className="text-sm text-muted-foreground mt-1">{!userId ? "Mode demo — login untuk simpan" : "Ketuk kartu, progress langsung berubah"}</p>
        </div>
        <Button variant="secondary" size="sm" className="rounded-full shrink-0" onClick={() => setShowNote(!showNote)}>
          <StickyNote className="h-4 w-4 mr-1.5" /> Catatan
        </Button>
      </div>

      {/* Date nav — single source tanggal */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1 rounded-full bg-muted p-1">
          <button onClick={() => setDate((d) => new Date(d.getTime() - 86400000))} className="h-8 w-8 rounded-full bg-card border flex items-center justify-center" aria-label="Hari sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="px-4 text-sm font-medium flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" /> {formatDate(date)}
          </div>
          <button onClick={() => setDate((d) => new Date(d.getTime() + 86400000))} className="h-8 w-8 rounded-full bg-card border flex items-center justify-center" aria-label="Hari berikutnya">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress hero — hanya ring, tanpa bar duplikat */}
      <Card className="rounded-[24px] p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ProgressRing value={daily} size={112} stroke={10} />
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Progress hari ini</div>
            <div className="text-[28px] font-bold leading-none mt-1">
              {daily}% <span className="text-sm font-normal text-muted-foreground">• {completedCount}/{dbHabits.length} selesai</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {daily === 100 ? "Alhamdulillah, semua target selesai! 🌿" : "Tap kartu untuk menyelesaikan — progress langsung berubah."}
            </p>
          </div>
        </div>
      </Card>

      {showNote && (
        <Card className="rounded-[20px] p-5">
          <label className="text-sm font-medium">Catatan hari ini (opsional)</label>
          <textarea
            placeholder="Tulis refleksi singkat hari ini..."
            className="mt-2 w-full min-h-[72px] rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onBlur={async (e) => {
              if (!userId || !dbHabits[0]) return;
              const { updateMutabaahEntry } = await import("@/lib/actions/habit");
              const cur = entries[dbHabits[0].id];
              if (cur) await updateMutabaahEntry({ habit_id: dbHabits[0].id, user_id: userId, date: toISO(date), value: cur.value, status: cur.status, note: e.target.value || null });
            }}
          />
          <p className="text-xs text-muted-foreground mt-2">Catatan privat, tidak dibagikan sebagai analytics.</p>
        </Card>
      )}

      {/* Category chips — tanpa count ganda */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
        {["Semua", ...categories].map((c) => {
          const active = filter === c;
          return (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium border transition-colors ${active ? "bg-primary text-white border-primary shadow-sm" : "bg-card hover:bg-muted"}`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Grouped habits — count hanya di header */}
      <div className="space-y-7">
        {grouped.map((g) => (
          <div key={g.cat}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">{g.cat}</h3>
              <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full font-medium">{g.items.length}</span>
            </div>
            <div className="grid gap-3">
              {g.items.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={{ id: h.id, name: h.name, category: h.category as any, type: h.type, target: h.target_value, unit: h.unit ?? undefined }}
                  entry={entries[h.id]}
                  onToggle={() => handleToggle(h.id)}
                  onUpdateValue={(d) => handleUpdate(h.id, d)}
                  onRead={
                    h.category === "Al-Qur'an"
                      ? () => {
                          setReaderHabitId(h.id);
                          // resume last page if any
                          const supa = createClient();
                          if (supa) {
                            supa
                              .from("mutabaah_reading_positions")
                              .select("last_page")
                              .eq("user_id", userId ?? "")
                              .maybeSingle()
                              .then(({ data }: any) => setReaderPage(data?.last_page ?? 1));
                          }
                          setReaderOpen(true);
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {syncError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800 flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" /> {syncError}
        </div>
      ) : (
        <div className="text-center text-xs text-muted-foreground">{userId ? "Tersinkron otomatis" : "Mode demo — login untuk simpan permanen"}</div>
      )}

      {readerOpen && readerHabitId && (
        <QuranReader
          open={readerOpen}
          onClose={() => setReaderOpen(false)}
          habitId={readerHabitId}
          date={toISO(date)}
          initialPage={readerPage}
          onCounted={(page, value) => {
            // optimistic update like persist
            setEntries((prev) => {
              const target = dbHabits?.find((x) => x.id === readerHabitId)?.target_value ?? 1;
              const status = value >= target ? "COMPLETED" : value > 0 ? "PARTIAL" : "PENDING";
              return { ...prev, [readerHabitId]: { habitId: readerHabitId, value, status } as Entry };
            });
          }}
        />
      )}
    </div>
  );
}
