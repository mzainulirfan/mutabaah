"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/app/progress-ring";
import { Flame, Trophy, CalendarDays, TrendingUp, ArrowRight } from "lucide-react";
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
  const [showAll, setShowAll] = useState(false);
  const [showStreak, setShowStreak] = useState(true);

  useEffect(() => {
    try {
      setShowStreak(localStorage.getItem("mutabaah:streak") !== "0");
    } catch {}
  }, []);

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
      const nowForRange = new Date();
      const monthStartISO = `${nowForRange.getFullYear()}-${String(nowForRange.getMonth() + 1).padStart(2, "0")}-01`;
      const rangeStart = monthStartISO < thirtyAgo ? monthStartISO : thirtyAgo;
      const { data: entries } = await supabase.from("mutabaah_entries").select("habit_id,value,status,date").eq("user_id", auth.user.id).gte("date", rangeStart);
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
      if (bd.length) { const top = bd[0]; const low = bd[bd.length - 1]; setInsight(top.id === low.id ? `${top.name} terjaga dengan baik bulan ini (${top.pct}%). Pertahankan pelan-pelan.` : `${top.name} menjadi kebiasaan paling terjaga bulan ini (${top.pct}%). ${low.name} masih bertumbuh (${low.pct}%) — temani pelan-pelan.`); }
      else setInsight("Belum ada data bulan ini. Mulai dari satu isian hari ini.");
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
        <Card className="p-10 text-center rounded-[24px] border-dashed">
          <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground" />
          <h2 className="font-semibold mt-3">Belum ada data perjalanan</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-6">Isi mutabaah sekali, dan grafik konsistensimu akan muncul di sini.</p>
          <Link href="/mutabaah" className="inline-block mt-5">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary text-white text-sm font-medium px-5 py-2.5">Isi hari ini <ArrowRight className="h-4 w-4" /></span>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold tracking-tight leading-tight">Perjalananmu</h1>
        <p className="text-sm text-muted-foreground mt-1 leading-6">Dibandingkan dengan dirimu kemarin — bukan dengan orang lain.</p>
      </div>

      {/* Mingguan — panel hijau tua seperti Beranda */}
      <div className="rounded-[24px] p-6 text-white relative overflow-hidden bg-gradient-to-br from-[#1C5B40] via-[#17452F] to-[#102E21]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative flex flex-col lg:flex-row items-center gap-6">
          <ProgressRing value={avgWeekly} size={108} stroke={10} track="rgba(255,255,255,0.18)" bar="#E9D9A6" valueClassName="text-white" labelClassName="text-white/60" />
          <div className="flex-1 text-center lg:text-left min-w-0">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/60">Minggu ini</p>
            <div className="text-[28px] font-bold leading-none mt-1 text-white">
              {avgWeekly}% <span className="text-sm font-normal text-white/60">rata-rata</span>
            </div>
            <p className="text-sm text-white/70 mt-1.5">
              {new Date(Date.now() - 6 * 86400000).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} — {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" })} · {activeDays}/7 hari terisi
            </p>
            <div className="mt-4 flex items-end gap-2 justify-center lg:justify-start" role="img" aria-label={`Grafik mingguan, rata-rata ${avgWeekly} persen`}>
              {weekly.map((d, i) => {
                const isBest = d.value === bestDay.value && d.value > 0;
                return (
                  <div key={d.day + i} className="flex flex-col items-center gap-1.5">
                    <div className="w-7 rounded-full bg-white/15 overflow-hidden flex items-end" style={{ height: "36px" }}>
                      <div className={`w-full rounded-full transition-all ${isBest ? "bg-[#E9D9A6]" : "bg-white/50"}`} style={{ height: `${d.value}%` }} />
                    </div>
                    <span className={`text-[10px] font-medium ${isBest ? "text-[#E9D9A6]" : "text-white/60"}`}>{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full lg:w-[340px]">
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <div className="text-xs text-white/60">Hari terbaik</div>
              <div className="font-bold text-white">{bestDay.day}</div>
              <div className="text-xs text-white/60">{bestDay.value}%</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <div className="text-xs text-white/60">Hari terisi</div>
              <div className="font-bold text-white">{activeDays}/7</div>
            </div>
            {showStreak ? (
              <div className="rounded-2xl bg-white/10 p-4 text-center">
                <div className="text-xs text-white/80 flex items-center justify-center gap-1">
                  <Flame className="h-3 w-3" /> Rangkaian
                </div>
                <div className="font-bold text-white">{streak} hari</div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white/10 p-4 text-center">
                <div className="text-xs text-white/60">Hari penuh</div>
                <div className="font-bold text-white">{monthStats.perfect}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Breakdown */}
        <Card className="rounded-[20px] p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Rincian amalan
            </h3>
            <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full font-medium">30 hari terakhir</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Diurut dari yang paling terjaga.</p>
          <div className="mt-5 space-y-4">
            {(showAll ? breakdown : breakdown.slice(0, 6)).map((h) => {
              const status = h.pct >= 80 ? "Terjaga" : h.pct >= 50 ? "Bertumbuh" : "Baru dimulai";
              const tone =
                h.pct >= 80
                  ? { badge: "bg-[var(--primary-soft)] text-primary", bar: "bg-primary" }
                  : h.pct >= 50
                    ? { badge: "bg-amber-50 text-amber-700", bar: "bg-amber-500" }
                    : { badge: "bg-muted text-muted-foreground", bar: "bg-zinc-300" };
              return (
                <div key={h.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium truncate">{h.name}</span>
                    <span className={`font-bold text-xs px-2 py-0.5 rounded-full tabular-nums shrink-0 ${tone.badge}`}>{h.pct}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{h.category} · {status}</div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={h.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Keterjagaan ${h.name} 30 hari terakhir`}>
                    <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${h.pct}%` }} />
                  </div>
                </div>
              );
            })}
            {breakdown.length === 0 && (
              <p className="text-sm text-muted-foreground leading-6">Belum ada data 30 hari. Isi mutabaah hari ini untuk mulai melihat polanya.</p>
            )}
          </div>
          {breakdown.length > 6 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-4 text-xs font-medium text-primary rounded-full px-3 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={showAll}
            >
              {showAll ? "Tampilkan lebih sedikit" : `Tampilkan semua (${breakdown.length})`}
            </button>
          )}
        </Card>

        {/* Monthly */}
        <Card className="rounded-[20px] p-5">
          <h3 className="font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600" /> Bulan ini · {new Date().toLocaleDateString("id-ID", { month: "long" })}
          </h3>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-muted p-4">
              <div className="text-xl font-bold">{monthStats.avg}%</div>
              <div className="text-xs text-muted-foreground">Rata-rata</div>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="text-xl font-bold flex items-center justify-center gap-1">
                <Trophy className="h-4 w-4 text-amber-600" />
                {monthStats.perfect}
              </div>
              <div className="text-xs text-muted-foreground">Hari penuh</div>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="text-xl font-bold">{monthStats.longest}</div>
              <div className="text-xs text-muted-foreground">Rangkaian terpanjang</div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-[var(--primary-soft)] border border-primary/10 p-4 text-sm leading-6">{insight}</div>
          <Link href="/mutabaah" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Isi hari ini untuk melanjutkan <ArrowRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="rounded-[20px] p-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Kalender bulan ini</h3>
          <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">{new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
            <div key={d} className="font-semibold text-muted-foreground py-1 text-[11px]">
              {d}
            </div>
          ))}
          {(() => {
            const nowD = new Date();
            const firstOffset = (new Date(nowD.getFullYear(), nowD.getMonth(), 1).getDay() + 6) % 7;
            const todayNum = nowD.getDate();
            const trailing = (7 - ((firstOffset + monthDays.length) % 7)) % 7;
            return (
              <>
                {Array.from({ length: firstOffset }).map((_, i) => (
                  <div key={`kosong-awal-${i}`} aria-hidden="true" />
                ))}
                {monthDays.map((d) => {
                  const isToday = d.day === todayNum;
                  return (
                    <div
                      key={d.day}
                      title={d.progress !== null ? `${d.progress}% terisi` : "belum ada data"}
                      aria-current={isToday ? "date" : undefined}
                      className={`h-9 w-full rounded-xl flex items-center justify-center border text-xs transition-colors
                        ${isToday ? "font-bold ring-2 ring-primary ring-offset-1" : "font-medium"}
                        ${d.status === "completed" ? "bg-[var(--primary-soft)] border-primary/20 text-primary" : ""}
                        ${d.status === "partial" ? "bg-amber-50 border-amber-200 text-amber-800" : ""}
                        ${d.status === "low" ? "bg-white border-zinc-200 text-muted-foreground" : ""}
                        ${d.status === "none" ? "bg-white text-muted-foreground border-dashed border-zinc-200" : ""}
                      `}
                    >
                      {d.day}
                    </div>
                  );
                })}
                {Array.from({ length: trailing }).map((_, i) => (
                  <div key={`kosong-akhir-${i}`} aria-hidden="true" />
                ))}
              </>
            );
          })()}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Terisi penuh
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Sebagian terisi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white border border-zinc-300" /> Sedikit / belum ada
          </span>
        </div>
      </Card>
    </div>
  );
}
