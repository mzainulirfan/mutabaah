"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/app/progress-ring";
import { Flame, Trophy, CalendarDays, Sparkles, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { dailyProgress, isStreakDay, calendarStatus } from "@/lib/progress";

type HabitRow = { id: string; name: string; category: string; type: string; target_value: number };

export default function ProgressPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [weekly, setWeekly] = useState<{ day: string; value: number }[]>([]);
  const [avgWeekly, setAvgWeekly] = useState(0);
  const [bestDay, setBestDay] = useState<{ day: string; value: number }>({ day: "-", value: 0 });
  const [activeDays, setActiveDays] = useState(0);
  const [streak, setStreak] = useState(0);
  const [breakdown, setBreakdown] = useState<{ id: string; name: string; category: string; pct: number }[]>([]);
  const [monthStats, setMonthStats] = useState<{ avg: number; perfect: number; longest: number }>({ avg: 0, perfect: 0, longest: 0 });
  const [insight, setInsight] = useState("Memuat…");
  const [monthDays, setMonthDays] = useState<{ day: number; progress: number | null; status: ReturnType<typeof calendarStatus> }[]>([]);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        const { weeklyData, habits: mockHabits } = await import("@/lib/mock-data");
        setWeekly(weeklyData);
        setAvgWeekly(82);
        setBestDay({ day: "Kam", value: 94 });
        setActiveDays(7);
        setStreak(7);
        setHabits(mockHabits.map((h) => ({ id: h.id, name: h.name, category: h.category, type: h.type, target_value: h.target })));
        setBreakdown(mockHabits.slice(0, 6).map((h) => ({ id: h.id, name: h.name, category: h.category, pct: 70 + Math.floor(Math.random() * 30) })));
        setMonthStats({ avg: 78, perfect: 9, longest: 12 });
        setInsight("Tilawah menjadi kebiasaan paling konsisten bulan ini. Dzikir petang perlu perhatian (54%).");
        setMonthDays(Array.from({ length: 30 }, (_, i) => ({ day: i + 1, progress: 60 + Math.random() * 40, status: "completed" as const })));
        setLoading(false);
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      const { data: mem } = await supabase.from("mutabaah_family_members").select("family_id").eq("user_id", auth.user.id).maybeSingle();
      if (!mem) { setLoading(false); return; }
      const { data: habitRows } = await supabase.from("mutabaah_habits").select("id,name,category,type,target_value").eq("family_id", mem.family_id).eq("is_active", true).order("sort_order");
      const hRows: HabitRow[] = (habitRows ?? []) as any;
      setHabits(hRows);
      const thirtyAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
      const { data: entries } = await supabase.from("mutabaah_entries").select("habit_id,value,status,date").eq("user_id", auth.user.id).gte("date", thirtyAgo);
      const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      const weekVals: { day: string; value: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const iso = d.toISOString().slice(0, 10);
        const items = hRows.map((h) => { const e = (entries ?? []).find((x: any) => x.date === iso && x.habit_id === h.id); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 }; });
        weekVals.push({ day: dayNames[d.getDay()], value: dailyProgress(items) });
      }
      setWeekly(weekVals);
      setAvgWeekly(weekVals.length ? Math.round(weekVals.reduce((a, b) => a + b.value, 0) / weekVals.length) : 0);
      setActiveDays(weekVals.filter((w) => w.value > 0).length);
      setBestDay(weekVals.reduce((best, cur) => (cur.value > best.value ? cur : best), weekVals[0] ?? { day: "-", value: 0 }));
      const allDays: number[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        const items = hRows.map((h) => { const e = (entries ?? []).find((x: any) => x.date === d && x.habit_id === h.id); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 }; });
        allDays.push(dailyProgress(items));
      }
      let curStreak = 0; for (let i = allDays.length - 1; i >= 0; i--) { if (isStreakDay(allDays[i])) curStreak++; else break; }
      setStreak(curStreak);
      let longest = 0, run = 0; for (const v of allDays) { if (isStreakDay(v)) { run++; longest = Math.max(longest, run); } else run = 0; }
      const avgMonth = allDays.length ? Math.round(allDays.reduce((a, b) => a + b, 0) / allDays.length) : 0;
      const perfect = allDays.filter((v) => v === 100).length;
      setMonthStats({ avg: avgMonth, perfect, longest });
      const bd = hRows.map((h) => {
        const vals = allDays.map((_, idx) => {
          const d = new Date(Date.now() - (29 - idx) * 86400000).toISOString().slice(0, 10);
          const e = (entries ?? []).find((x: any) => x.date === d && x.habit_id === h.id);
          const v = e ? Number(e.value) : 0;
          if (h.type === "BOOLEAN") return v ? 100 : 0;
          return Math.round(Math.min(100, (v / Number(h.target_value)) * 100));
        });
        return { id: h.id, name: h.name, category: h.category, pct: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 };
      });
      bd.sort((a, b) => b.pct - a.pct);
      setBreakdown(bd);
      const now = new Date(); const year = now.getFullYear(); const month = now.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate();
      const cal: typeof monthDays = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const items = hRows.map((h) => { const e = (entries ?? []).find((x: any) => x.date === iso && x.habit_id === h.id); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 }; });
        const hasAny = (entries ?? []).some((x: any) => x.date === iso);
        const p = hasAny ? dailyProgress(items) : null;
        cal.push({ day: d, progress: p, status: calendarStatus(p) });
      }
      setMonthDays(cal);
      if (bd.length) { const top = bd[0]; const low = bd[bd.length - 1]; setInsight(`${top.name} menjadi kebiasaan paling konsisten bulan ini (${top.pct}%). ${low.name} perlu perhatian (${low.pct}%).`); }
      else setInsight("Belum ada data bulan ini.");
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-32 rounded-[24px] bg-muted" />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-[20px] bg-muted" />
          <div className="h-64 rounded-[20px] bg-muted" />
        </div>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="p-10 text-center rounded-[24px]">
          <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground" />
          <h2 className="font-semibold mt-3">Belum ada data progress</h2>
          <p className="text-sm text-muted-foreground mt-1">Isi mutabaah dulu di /mutabaah.</p>
          <Link href="/mutabaah" className="inline-block mt-4">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">Isi hari ini <ArrowRight className="h-4 w-4" /></span>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-primary border border-primary/10">
          <Sparkles className="h-3.5 w-3.5" /> Konsistensi, bukan kompetisi
        </div>
        <h1 className="text-[26px] font-bold tracking-tight mt-3 leading-none">Progress</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Lihat perkembangan harian, mingguan, dan bulanan.</p>
      </div>

      {/* Weekly hero */}
      <Card className="rounded-[24px] p-6 lg:p-7">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <ProgressRing value={avgWeekly} size={112} stroke={10} />
          <div className="flex-1 text-center lg:text-left">
            <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Mingguan</div>
            <div className="text-[28px] font-bold leading-none mt-1">
              {avgWeekly}% <span className="text-sm font-normal text-muted-foreground">rata-rata</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(Date.now() - 6 * 86400000).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} — {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} • {activeDays}/7 hari aktif
            </p>
            <div className="mt-4 flex items-end gap-2 h-[56px] justify-center lg:justify-start">
              {weekly.map((d, i) => {
                const isBest = d.value === bestDay.value && d.value > 0;
                return (
                  <div key={d.day + i} className="flex flex-col items-center gap-1.5">
                    <div className="w-7 rounded-full bg-muted overflow-hidden flex items-end" style={{ height: "36px" }}>
                      <div className={`w-full rounded-full transition-all ${isBest ? "bg-primary" : "bg-primary/60"}`} style={{ height: `${d.value}%` }} />
                    </div>
                    <span className={`text-[10px] font-medium ${isBest ? "text-primary" : "text-muted-foreground"}`}>{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full lg:w-[340px]">
            <div className="rounded-2xl bg-muted p-4 text-center">
              <div className="text-xs text-muted-foreground">Best</div>
              <div className="font-bold">{bestDay.day}</div>
              <div className="text-xs text-muted-foreground">{bestDay.value}%</div>
            </div>
            <div className="rounded-2xl bg-muted p-4 text-center">
              <div className="text-xs text-muted-foreground">Aktif</div>
              <div className="font-bold">{activeDays}/7</div>
            </div>
            <div className="rounded-2xl bg-[var(--primary-soft)] p-4 text-center border border-primary/10">
              <div className="text-xs text-primary flex items-center justify-center gap-1">
                <Flame className="h-3 w-3" /> Streak
              </div>
              <div className="font-bold text-primary">{streak} hari</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Breakdown */}
        <Card className="rounded-[20px] p-5">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Rincian amalan (30 hari)
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Diurut paling konsisten.</p>
          <div className="mt-5 space-y-4">
            {breakdown.slice(0, 6).map((h) => {
              const isTop = h.pct >= 80;
              return (
                <div key={h.id}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium truncate pr-3">{h.name}</span>
                    <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${isTop ? "bg-[var(--primary-soft)] text-primary" : "bg-amber-50 text-amber-700"}`}>{h.pct}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground -mt-0.5">{h.category}</div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isTop ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${h.pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Monthly */}
        <Card className="rounded-[20px] p-5">
          <h3 className="font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600" /> Bulanan — {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </h3>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-muted p-4">
              <div className="text-xl font-bold">{monthStats.avg}%</div>
              <div className="text-xs text-muted-foreground">Avg</div>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="text-xl font-bold flex items-center justify-center gap-1">
                <Trophy className="h-4 w-4 text-amber-600" />
                {monthStats.perfect}
              </div>
              <div className="text-xs text-muted-foreground">Sempurna</div>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="text-xl font-bold">{monthStats.longest}</div>
              <div className="text-xs text-muted-foreground">Streak max</div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-[var(--primary-soft)] border border-primary/10 p-4 text-sm leading-6">{insight}</div>
          <Link href="/mutabaah" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Isi hari ini untuk perbaiki <ArrowRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="rounded-[20px] p-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Kalender</h3>
          <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">Warna = progress harian</span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
            <div key={d} className="font-semibold text-muted-foreground py-1 text-[11px]">
              {d}
            </div>
          ))}
          {monthDays.map((d) => (
            <div
              key={d.day}
              title={d.progress !== null ? `${d.progress}%` : "no data"}
              className={`h-9 w-full rounded-xl flex items-center justify-center font-medium border text-xs transition-colors
                ${d.status === "completed" ? "bg-[var(--primary-soft)] border-primary/20 text-primary" : ""}
                ${d.status === "partial" ? "bg-amber-50 border-amber-200 text-amber-800" : ""}
                ${d.status === "low" ? "bg-white border-zinc-200 text-muted-foreground" : ""}
                ${d.status === "none" ? "bg-white text-muted-foreground border-dashed border-zinc-200" : ""}
              `}
            >
              {d.day}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" /> completed ≥85%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> partial ≥50%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white border border-zinc-300" /> low / no data
          </span>
        </div>
      </Card>
    </div>
  );
}
