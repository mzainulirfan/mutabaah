"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { HabitCard } from "@/components/app/habit-card";
import { Sparkles, ArrowRight, X } from "@/components/ui/hugeicons";
import { createClient } from "@/lib/supabase/client";
import { getFamilyContext, getSessionUser } from "@/lib/family-context";
import { enqueue } from "@/lib/offline-queue";
import { localDateKey } from "@/lib/local-date";
import type { Entry, HabitCategory } from "@/lib/habits";
import { displayHabitName, prayerSlotKey } from "@/lib/habits";
import type { EntryRow } from "@/lib/supabase/types";

const PRAYER_ORDER = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];

type QuickHabit = {
  id: string;
  name: string;
  category: string;
  type: "BOOLEAN" | "QUANTITY" | "COUNTER" | "DURATION";
  target_value: number;
  unit: string | null;
  sort_order: number;
};

// Tombol isi-cepat global: tampil di semua halaman kecuali /mutabaah
// (di sana daftar lengkapnya sudah terbuka). Data diambil sendiri agar
// tidak bergantung pada state halaman mana pun.
export function QuickFillFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [habits, setHabits] = useState<QuickHabit[]>([]);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [error, setError] = useState<string | null>(null);

  const hidden = pathname === "/mutabaah";

  const load = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    try {
      const user = await getSessionUser(supabase);
      if (!user) { setUserId(null); return; }
      setUserId(user.id);
      const family = await getFamilyContext(supabase, user.id);
      if (!family) return;
      setHabits(family.habits);
      const iso = localDateKey(new Date());
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("habit_id,value,status,context")
        .eq("family_id", family.familyId)
        .eq("user_id", user.id)
        .eq("date", iso);
      const map: Record<string, Entry> = {};
      ((data ?? []) as EntryRow[]).forEach((e) => {
        map[e.habit_id] = { habitId: e.habit_id, value: Number(e.value), status: e.status, context: e.context ?? null };
      });
      setEntries(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hidden) {
      void (async () => {
        await load();
      })();
    }
  }, [hidden, load]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const incomplete = habits.filter((h) => (entries[h.id]?.status ?? "PENDING") !== "COMPLETED");
    const rank = (h: QuickHabit) => {
      if (h.category === "Ibadah Wajib") {
        const pi = PRAYER_ORDER.indexOf(prayerSlotKey(h.name, now));
        return pi >= 0 ? pi : 99;
      }
      return 100 + h.sort_order;
    };
    return [...incomplete].sort((a, b) => rank(a) - rank(b)).slice(0, 3);
  }, [habits, entries]);

  const remaining = habits.filter((h) => (entries[h.id]?.status ?? "PENDING") !== "COMPLETED").length;

  async function persist(habitId: string, value: number, status: Entry["status"], context?: "SENDIRI" | "BERJAMAAH" | null) {
    const supabase = createClient();
    const iso = localDateKey(new Date());
    if (!supabase || !userId || !/^[0-9a-f]{8}-/.test(userId) || !/^[0-9a-f]{8}-/.test(habitId)) return;
    const payload = { habit_id: habitId, value, status, date: iso, context: context ?? null };
    if (!navigator.onLine) {
      enqueue(payload);
      setError("Kamu sedang offline — tersimpan otomatis saat online kembali.");
      return;
    }
    try {
      const { updateMutabaahEntry } = await import("@/lib/actions/habit");
      await updateMutabaahEntry({ habit_id: habitId, user_id: userId, date: iso, value, status, context: context ?? null });
      setError(null);
    } catch {
      enqueue(payload);
      setError("Perubahan belum tersimpan — akan dicoba lagi otomatis.");
    }
  }

  function toggle(habitId: string) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    if (habit.category === "Ibadah Wajib" && (entries[habitId]?.status ?? "PENDING") !== "COMPLETED") return;
    setEntries((prev) => {
      const cur = prev[habitId];
      const next: Entry =
        !cur || cur.status === "PENDING"
          ? { habitId, value: habit.type === "BOOLEAN" ? 1 : habit.target_value, status: "COMPLETED" }
          : { habitId, value: 0, status: "PENDING" };
      void persist(habitId, next.value, next.status, null);
      return { ...prev, [habitId]: next };
    });
  }

  function updateValue(habitId: string, delta: number) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    setEntries((prev) => {
      const cur = prev[habitId] ?? { habitId, value: 0, status: "PENDING" as const };
      const nextVal = Math.max(0, Math.min(habit.target_value, cur.value + delta));
      const status: Entry["status"] = nextVal === 0 ? "PENDING" : nextVal >= habit.target_value ? "COMPLETED" : "PARTIAL";
      void persist(habitId, nextVal, status, cur.context ?? null);
      return { ...prev, [habitId]: { habitId, value: nextVal, status, context: cur.context ?? null } };
    });
  }

  function pickContext(habitId: string, ctx: "SENDIRI" | "BERJAMAAH") {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const target = habit.type === "BOOLEAN" ? 1 : habit.target_value;
    const next: Entry = { habitId, value: target, status: "COMPLETED", context: ctx };
    setEntries((prev) => ({ ...prev, [habitId]: next }));
    void persist(habitId, target, "COMPLETED", ctx);
  }

  if (hidden) return null;

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null); void load(); }}
        className="lg:hidden fixed bottom-[88px] right-4 z-20 rounded-full bg-primary text-white shadow-lg px-5 py-3 flex items-center gap-2 font-medium active:scale-95 transition-transform"
        aria-label="Isi mutabaah hari ini"
        aria-haspopup="dialog"
      >
        <Sparkles className="h-4 w-4" /> Isi Hari Ini
      </button>

      {open && (
        <Sheet label="Lanjut isi hari ini" onClose={() => setOpen(false)}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold">Lanjut isi hari ini</h3>
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => setOpen(false)} aria-label="Tutup">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-6">
            {remaining === 0 ? "Alhamdulillah, semua sudah terisi. Semoga istiqamah." : `Tinggal ${remaining} lagi — mulai dari yang terdekat.`}
          </p>
          {loading ? (
            <div className="mt-4 space-y-3 animate-pulse" aria-busy="true" aria-label="Memuat amalan">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[76px] rounded-[20px] bg-muted" />
              ))}
            </div>
          ) : upcoming.length > 0 ? (
            <div className="mt-4 space-y-3 max-h-[50dvh] overflow-auto">
              {upcoming.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={{ id: h.id, name: displayHabitName(h.name, new Date()), category: h.category as HabitCategory, type: h.type, target: h.target_value, unit: h.unit ?? undefined }}
                  entry={entries[h.id]}
                  onToggle={() => toggle(h.id)}
                  onUpdateValue={(d) => updateValue(h.id, d)}
                  onPickContext={h.category === "Ibadah Wajib" ? (ctx) => pickContext(h.id, ctx) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-[var(--primary-soft)] border border-primary/10 p-4 text-sm text-primary leading-6">
              Semua amalan hari ini sudah terisi. MasyaAllah.
            </div>
          )}
          {error && <p className="text-xs text-amber-700 mt-3" role="status">{error}</p>}
          <Link href="/mutabaah" onClick={() => setOpen(false)} className="mt-4 flex items-center justify-center gap-1 rounded-full bg-primary text-white text-sm font-medium px-5 py-3 min-h-[44px]">
            Buka semua di Mutabaah <ArrowRight className="h-4 w-4" />
          </Link>
        </Sheet>
      )}
    </>
  );
}
