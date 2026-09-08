"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDailyProgress } from "@/lib/mock-data";
import type { Entry } from "@/lib/mock-data";
import { HabitCard } from "@/components/app/habit-card";
import { ProgressRing } from "@/components/app/progress-ring";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, StickyNote, WifiOff, Loader2 } from "lucide-react";
import { enqueue, syncQueue, clearInvalidQueue } from "@/lib/offline-queue";

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

export default function MutabaahPage() {
  const [dbHabits, setDbHabits] = useState<DbHabit[] | null>(null);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [date, setDate] = useState(new Date());
  const [filter, setFilter] = useState<string>("Semua");
  const [showNote, setShowNote] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(
    async (d: Date) => {
      setLoading(true);
      const iso = toISO(d);
      try {
        if (!supabase) {
          // fallback to mock
          const { habits: mockHabits, initialEntries } = await import("@/lib/mock-data");
          setDbHabits(
            mockHabits.map((h) => ({
              id: h.id,
              name: h.name,
              category: h.category,
              type: h.type,
              target_value: h.target,
              unit: h.unit ?? null,
            }))
          );
          setEntries(initialEntries);
          setLoading(false);
          return;
        }
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          // not logged in — use mock demo
          const { habits: mockHabits, initialEntries } = await import("@/lib/mock-data");
          setDbHabits(
            mockHabits.map((h) => ({
              id: h.id,
              name: h.name,
              category: h.category,
              type: h.type,
              target_value: h.target,
              unit: h.unit ?? null,
            }))
          );
          setEntries(initialEntries);
          setUserId(null);
          setLoading(false);
          return;
        }
        setUserId(auth.user.id);
        // get family via membership
        const { data: membership } = await supabase
          .from("mutabaah_family_members")
          .select("family_id")
          .eq("user_id", auth.user.id)
          .limit(1)
          .maybeSingle();
        if (!membership) {
          setDbHabits([]);
          setEntries({});
          setLoading(false);
          return;
        }
        const { data: habits } = await supabase
          .from("mutabaah_habits")
          .select("id,name,category,type,target_value,unit")
          .eq("family_id", membership.family_id)
          .eq("is_active", true)
          .order("sort_order");
        setDbHabits(habits ?? []);

        const { data: dbEntries } = await supabase
          .from("mutabaah_entries")
          .select("habit_id,value,status,note")
          .eq("user_id", auth.user.id)
          .eq("date", iso);
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

  // sync offline queue when back online — uses real userId
  useEffect(() => {
    clearInvalidQueue(); // bersihkan queue mock "5" dari demo lama
    if (!userId) return;
    const doSync = () =>
      syncQueue(async (e) => {
        const { updateMutabaahEntry } = await import("@/lib/actions/habit");
        await updateMutabaahEntry({
          habit_id: e.habit_id,
          user_id: userId,
          date: e.date,
          value: e.value,
          status: e.status as any,
          note: e.note,
        });
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

  // derive categories
  const categories = useMemo(() => Array.from(new Set((dbHabits ?? []).map((h) => h.category))), [dbHabits]);

  // daily calc uses real habits
  const daily = useMemo(() => {
    if (!dbHabits || dbHabits.length === 0) return 0;
    // adapt getDailyProgress to dbHabits
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
    // guard mock id
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
      if (!cur || cur.status === "PENDING") {
        next = { habitId, value: habit.type === "BOOLEAN" ? 1 : habit.target_value, status: "COMPLETED" };
      } else if (cur.status === "COMPLETED") {
        next = { habitId, value: 0, status: "PENDING" };
      } else {
        next = { habitId, value: habit.target_value, status: "COMPLETED" };
      }
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

  const filteredHabits = useMemo(() => {
    if (!dbHabits) return [];
    return filter === "Semua" ? dbHabits : dbHabits.filter((h) => h.category === filter);
  }, [dbHabits, filter]);

  const grouped = useMemo(
    () =>
      categories
        .map((cat) => ({ cat, items: filteredHabits.filter((h) => h.category === cat) }))
        .filter((g) => g.items.length > 0),
    [categories, filteredHabits]
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 rounded-2xl bg-muted" />
        <div className="h-32 rounded-2xl bg-muted" />
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
        <div>
          <h1 className="text-[20px] font-bold">Mutabaah Harian</h1>
          <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
        </div>
        <Card className="p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mt-4">Belum ada target mutabaah.</h3>
          <p className="text-sm text-muted-foreground mt-1">Tambahkan target pertama untuk memulai.</p>
          <Button className="mt-4" onClick={() => (window.location.href = "/keluarga")}>
            Tambah Amalan
          </Button>
          {!userId && <p className="text-xs text-muted-foreground mt-3">Login sebagai ayah@mutabaah.demo untuk melihat data seed.</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight">Mutabaah Harian</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(date)} {!userId && "• Mode demo"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate((d) => new Date(d.getTime() - 86400000))}
            className="h-9 w-9 rounded-full border bg-card flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Hari Ini
          </div>
          <button
            onClick={() => setDate((d) => new Date(d.getTime() + 86400000))}
            className="h-9 w-9 rounded-full border bg-card flex items-center justify-center"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card className="p-5 flex flex-col sm:flex-row items-center gap-6">
        <ProgressRing value={daily} />
        <div className="flex-1 text-center sm:text-left">
          <div className="text-sm font-medium text-muted-foreground">Progress hari ini</div>
          <div className="text-2xl font-bold">
            {daily}% • {completedCount} dari {dbHabits.length} target
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {daily === 100 ? "Alhamdulillah, semua target selesai! 🌿" : `Masih ada ${dbHabits.length - completedCount} target yang belum diisi hari ini.`}
          </p>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden max-w-md mx-auto sm:mx-0">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${daily}%` }} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowNote(!showNote)}>
            <StickyNote className="h-4 w-4 mr-1.5" /> Catatan
          </Button>
        </div>
      </Card>

      {showNote && (
        <Card className="p-4">
          <label className="text-sm font-medium">Catatan hari ini (opsional)</label>
          <textarea
            placeholder="Tulis refleksi singkat hari ini..."
            className="mt-2 w-full min-h-[72px] rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onBlur={async (e) => {
              // save note to first habit entry as example — real app would have per-entry note
              if (!userId || !dbHabits[0]) return;
              const { updateMutabaahEntry } = await import("@/lib/actions/habit");
              const cur = entries[dbHabits[0].id];
              if (cur)
                await updateMutabaahEntry({
                  habit_id: dbHabits[0].id,
                  user_id: userId,
                  date: toISO(date),
                  value: cur.value,
                  status: cur.status,
                  note: e.target.value || null,
                });
            }}
          />
          <p className="text-xs text-muted-foreground mt-2">Catatan privat, tidak dibagikan sebagai analytics.</p>
        </Card>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {["Semua", ...categories].map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium border transition-colors ${filter === c ? "bg-primary text-white border-primary" : "bg-card hover:bg-muted"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {grouped.map((g) => (
          <div key={g.cat}>
            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">{g.cat}</h3>
            <div className="grid gap-3">
              {g.items.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={{ id: h.id, name: h.name, category: h.category as any, type: h.type, target: h.target_value, unit: h.unit ?? undefined }}
                  entry={entries[h.id]}
                  onToggle={() => handleToggle(h.id)}
                  onUpdateValue={(d) => handleUpdate(h.id, d)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {syncError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800 flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" /> {syncError} <span className="font-medium">last-write-wins</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          {userId ? "Perubahan tersinkron ke DB." : "Mode demo — login untuk simpan permanen."}{" "}
          <span className="font-medium text-foreground">last-write-wins</span>
        </div>
      )}
    </div>
  );
}
