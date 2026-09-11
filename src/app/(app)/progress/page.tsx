"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/app/progress-ring";
import { Flame, Trophy, CalendarDays, TrendingUp, ArrowRight, Check, X, Users, User, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { dailyProgress, isStreakDay, calendarStatus } from "@/lib/progress";
import { displayHabitName, isFriday, prayerSlotKey } from "@/lib/habits";
import { daysAgoLocal, localDateKey } from "@/lib/local-date";
import { useLocalDayKey } from "@/hooks/use-local-day-key";
import type { EntryRow } from "@/lib/supabase/types";
import { getFamilyContext, getSessionUser } from "@/lib/family-context";

type HabitRow = { id: string; name: string; category: string; type: string; target_value: number; unit?: string | null };

export default function ProgressPage() {
  const supabase = useMemo(() => createClient(), []);
  const dayKey = useLocalDayKey();
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
  const [needsLogin, setNeedsLogin] = useState(false);
  const [dayEntries, setDayEntries] = useState<EntryRow[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  // Melihat progres anggota lain (parent saja). null = diri sendiri.
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState("MEMBER");
  const [viewMembers, setViewMembers] = useState<{ id: string; name: string }[]>([]);
  // Filter bulan: 0 = berjalan, mundur s.d. -11. Mengendalikan rincian, kalender, sheet.
  const [monthOffset, setMonthOffset] = useState(0);
  const [monthLoading, setMonthLoading] = useState(false);

  // localStorage hanya ada di browser — baca di dalam callback effect agar
  // prerender server tetap aman dan tidak ada setState sinkron di badan effect.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setShowStreak(localStorage.getItem("mutabaah:streak") !== "0");
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const [weekLabel] = useState(() => {
    const end = new Date();
    const start = new Date(Date.now() - 6 * 86400000);
    const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    return `${fmt(start)} — ${fmt(end)}`;
  });

  // Meta kalender mengikuti bulan terfilter (di dalam callback agar aman purity).
  const calMeta = useMemo(() => {
    const nowD = new Date();
    const target = new Date(nowD.getFullYear(), nowD.getMonth() + monthOffset, 1);
    const year = target.getFullYear();
    const month = target.getMonth();
    const isCurrent = monthOffset === 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      year,
      month,
      isCurrent,
      daysInMonth,
      anchorDay: isCurrent ? nowD.getDate() : daysInMonth,
      todayNum: nowD.getDate(),
      firstOffset: (new Date(year, month, 1).getDay() + 6) % 7,
      monthLabel: target.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      monthShort: target.toLocaleDateString("id-ID", { month: "long" }),
      iso: (day: number) => `${year}-${pad(month + 1)}-${pad(day)}`,
      label: (day: number) =>
        new Date(year, month, day).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }),
    };
  }, [monthOffset]);

  const goMonth = (delta: number) => {
    setMonthOffset((v) => Math.max(-11, Math.min(0, v + delta)));
    setSelectedDay(null);
    setFocusHabitId(null);
  };

  // Deret 30 hari per amalan — dipakai mini-grafik 7 hari dan sheet detail.
  const spark = useMemo(() => {
    // Jangkar = hari terakhir periode yang dilihat (hari ini, atau akhir bulan lampau).
    const anchor = new Date(calMeta.year, calMeta.month, calMeta.anchorDay);
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(anchor);
      d.setDate(d.getDate() - i);
      days.push(localDateKey(d));
    }
    const map: Record<string, number[]> = {};
    for (const h of habits) {
      const target = Number(h.target_value) || 1;
      map[h.id] = days.map((iso) => {
        const e = dayEntries.find((x) => x.date === iso && x.habit_id === h.id);
        const v = e ? Number(e.value) : 0;
        if (h.type === "BOOLEAN") return v ? 100 : 0;
        return Math.round(Math.min(100, (v / target) * 100));
      });
    }
    return map;
  }, [habits, dayEntries, calMeta]);

  // Amalan yang sedang dilihat detailnya (sheet) — null berarti tertutup.
  // Selalu mode bulan terfilter (calMeta), tanpa opsi 7/30 hari.
  const [focusHabitId, setFocusHabitId] = useState<string | null>(null);
  const focusDetail = useMemo(() => {
    if (!focusHabitId) return null;
    const h = habits.find((x) => x.id === focusHabitId);
    if (!h) return null;
    const days: { iso: string; dayNum: number }[] = [];
    for (let d = 1; d <= calMeta.anchorDay; d++) {
      days.push({ iso: calMeta.iso(d), dayNum: d });
    }
    const target = Number(h.target_value) || 1;
    const series = days.map(({ iso }) => {
      const e = dayEntries.find((x) => x.date === iso && x.habit_id === h.id);
      const v = e ? Number(e.value) : 0;
      if (h.type === "BOOLEAN") return v ? 100 : 0;
      return Math.round(Math.min(100, (v / target) * 100));
    });
    const activeDays = series.filter((v) => v > 0).length;
    let longest = 0, run = 0;
    for (const v of series) {
      if (v > 0) { run++; longest = Math.max(longest, run); }
      else run = 0;
    }
    const avg = series.length ? Math.round(series.reduce((a, b) => a + b, 0) / series.length) : 0;
    // Konteks per hari khusus amalan sholat.
    const isWajib = h.category === "Ibadah Wajib";
    const contexts: ("SENDIRI" | "BERJAMAAH" | null)[] = days.map(({ iso }) => {
      if (!isWajib) return null;
      const e = dayEntries.find((x) => x.date === iso && x.habit_id === h.id);
      return e && Number(e.value) > 0 ? (e.context ?? null) : null;
    });
    const berjamaah = contexts.filter((c) => c === "BERJAMAAH").length;
    const sendiri = contexts.filter((c) => c === "SENDIRI").length;
    const rangeLabel = calMeta.isCurrent ? "bulan ini" : calMeta.monthShort.toLowerCase();
    return { habit: h, series, dates: days.map((d) => d.dayNum), avg, activeDays, longest, total: days.length, isWajib, contexts, berjamaah, sendiri, rangeLabel };
  }, [focusHabitId, habits, dayEntries, calMeta]);

  // Rincian mutabaah tanggal yang diketuk — null berarti sheet tertutup.
  const dayDetail = useMemo(() => {
    if (selectedDay === null) return null;
    const day = selectedDay;
    const iso = calMeta.iso(day);
    type DayItem = {
      id: string;
      name: string;
      category: string;
      type: string;
      value: number;
      target: number;
      unit: string;
      context: "SENDIRI" | "BERJAMAAH" | null;
      status: "done" | "partial" | "todo";
    };
    const [yy, mm, dd] = iso.split("-").map(Number);
    const cellDate = new Date(yy, mm - 1, dd);
    const items: DayItem[] = habits.map((h) => {
      const e = dayEntries.find((x) => x.date === iso && x.habit_id === h.id);
      const value = e ? Number(e.value) : 0;
      const target = Number(h.target_value) || 1;
      const done = value >= target && value > 0;
      const partial = value > 0 && !done;
      const unit = h.unit ?? (h.type === "DURATION" ? "menit" : h.type === "QUANTITY" || h.type === "COUNTER" ? "kali" : "");
      return {
        id: h.id,
        name: displayHabitName(h.name, cellDate),
        category: h.category,
        type: h.type,
        value,
        target,
        unit,
        context: e?.context ?? null,
        status: done ? ("done" as const) : partial ? ("partial" as const) : ("todo" as const),
      };
    });
    // Strip sholat 5 waktu — urut waktu sholat, bukan urut daftar.
    const PRAYERS = [
      { key: "subuh", label: "Subuh" },
      { key: "dzuhur", label: "Dzuhur" },
      { key: "ashar", label: "Ashar" },
      { key: "maghrib", label: "Maghrib" },
      { key: "isya", label: "Isya" },
    ];
    const used = new Set<string>();
    const strip = PRAYERS.map((p) => {
      const found = items.find((i) => !used.has(i.id) && i.category === "Ibadah Wajib" && prayerSlotKey(i.name, cellDate) === p.key);
      if (found) used.add(found.id);
      // Hari Jumat: slot Dzuhur berlabel Jumat.
      const label = p.key === "dzuhur" && isFriday(cellDate) ? "Jumat" : p.label;
      return { ...p, label, item: found ?? null };
    });
    const groups: { category: string; items: DayItem[] }[] = [];
    for (const i of items) {
      if (used.has(i.id)) continue;
      const g = groups.find((x) => x.category === i.category);
      if (g) g.items.push(i);
      else groups.push({ category: i.category, items: [i] });
    }
    const wajibDone = items.filter((i) => i.category === "Ibadah Wajib" && i.status === "done");
    const berjamaah = wajibDone.filter((i) => i.context === "BERJAMAAH").length;
    const sendiri = wajibDone.filter((i) => i.context === "SENDIRI").length;
    const note = dayEntries.map((x) => (x.date === iso ? x.note?.trim() : "")).find((n) => n) ?? "";
    return { day, iso, label: calMeta.label(day), progress: dailyProgress(items), items, groups, strip, berjamaah, sendiri, note };
  }, [selectedDay, calMeta, dayEntries, habits]);

  useEffect(() => {
    void (async () => {
      const user = await getSessionUser(supabase);
      if (!user) { setNeedsLogin(true); setLoading(false); return; }
      const family = await getFamilyContext(supabase, user.id);
      if (!family) { setLoading(false); return; }
      setMyId(user.id);
      setViewerRole(family.role);
      setViewMembers(family.members.map((m) => ({ id: m.user_id, name: m.name })));
      // Hanya pengelola boleh intip anggota lain; seleksi invalid kembali ke diri sendiri.
      const canViewAll = family.role !== "MEMBER";
      const targetId =
        viewUserId && canViewAll && family.members.some((m) => m.user_id === viewUserId) ? viewUserId : user.id;
      const hRows: HabitRow[] = family.habits;
      setHabits(hRows);
      setMonthLoading(true);
      try {
        const nowForRange = new Date();
        // Hero + streak: selalu 30 hari terakhir s.d. hari ini (jangkar kini).
        const thirtyAgo = localDateKey(daysAgoLocal(29, nowForRange));
        const { data: nowData } = await supabase.from("mutabaah_entries").select("habit_id,value,status,date").eq("family_id", family.familyId).eq("user_id", targetId).gte("date", thirtyAgo);
        const nowRows = (nowData ?? []) as EntryRow[];
        const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
        const weekVals: { day: string; value: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = daysAgoLocal(i, nowForRange);
          const iso = localDateKey(d);
          const items = hRows.map((h) => { const e = nowRows.find((x) => x.date === iso && x.habit_id === h.id); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0, status: e?.status }; });
          weekVals.push({ day: dayNames[d.getDay()], value: dailyProgress(items) });
        }
        setWeekly(weekVals);
        setAvgWeekly(weekVals.length ? Math.round(weekVals.reduce((a, b) => a + b.value, 0) / weekVals.length) : 0);
        setActiveDays(weekVals.filter((w) => w.value > 0).length);
        setBestDay(weekVals.reduce((best, cur) => (cur.value > best.value ? cur : best), weekVals[0] ?? { day: "-", value: 0 }));
        const streakDays: number[] = [];
        for (let i = 29; i >= 0; i--) {
          const d = localDateKey(daysAgoLocal(i, nowForRange));
          const items = hRows.map((h) => { const e = nowRows.find((x) => x.date === d && x.habit_id === h.id); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0, status: e?.status }; });
          streakDays.push(dailyProgress(items));
        }
        let curStreak = 0; for (let i = streakDays.length - 1; i >= 0; i--) { if (isStreakDay(streakDays[i])) curStreak++; else break; }
        setStreak(curStreak);

        // Bulan terfilter: tgl 1 s.d. akhir bulan (hari ini bila bulan berjalan).
        const mFirst = new Date(nowForRange.getFullYear(), nowForRange.getMonth() + monthOffset, 1);
        const mYear = mFirst.getFullYear();
        const mMon = mFirst.getMonth();
        const mDays = new Date(mYear, mMon + 1, 0).getDate();
        const mElapsed = monthOffset === 0 ? nowForRange.getDate() : mDays;
        const pad2 = (n: number) => String(n).padStart(2, "0");
        const mStart = `${mYear}-${pad2(mMon + 1)}-01`;
        const mNext = new Date(mYear, mMon + 1, 1);
        const mEndEx = `${mNext.getFullYear()}-${pad2(mNext.getMonth() + 1)}-01`;
        const { data: monthData } = await supabase.from("mutabaah_entries").select("habit_id,value,status,date,context,note").eq("family_id", family.familyId).eq("user_id", targetId).gte("date", mStart).lt("date", mEndEx);
        const monthRows = (monthData ?? []) as EntryRow[];
        setDayEntries(monthRows);
        const monthISOs: string[] = [];
        for (let d = 1; d <= mElapsed; d++) monthISOs.push(`${mYear}-${pad2(mMon + 1)}-${pad2(d)}`);
        const mDaily = monthISOs.map((iso) =>
          dailyProgress(
            hRows.map((h) => { const e = monthRows.find((x) => x.date === iso && x.habit_id === h.id); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0, status: e?.status }; })
          )
        );
        const avgMonth = mDaily.length ? Math.round(mDaily.reduce((a, b) => a + b, 0) / mDaily.length) : 0;
        const perfect = mDaily.filter((v) => v === 100).length;
        let longest = 0, run = 0; for (const v of mDaily) { if (isStreakDay(v)) { run++; longest = Math.max(longest, run); } else run = 0; }
        setMonthStats({ avg: avgMonth, perfect, longest });
        const bd = hRows.map((h) => {
          const vals = monthISOs.map((iso) => {
            const e = monthRows.find((x) => x.date === iso && x.habit_id === h.id);
            const v = e ? Number(e.value) : 0;
            if (h.type === "BOOLEAN") return v ? 100 : 0;
            return Math.round(Math.min(100, (v / Number(h.target_value)) * 100));
          });
          return { id: h.id, name: h.name, category: h.category, pct: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 };
        });
        bd.sort((a, b) => b.pct - a.pct);
        setBreakdown(bd);
        const cal: typeof monthDays = [];
        for (let d = 1; d <= mDays; d++) {
          const iso = `${mYear}-${pad2(mMon + 1)}-${pad2(d)}`;
          const items = hRows.map((h) => { const e = monthRows.find((x) => x.date === iso && x.habit_id === h.id); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0, status: e?.status }; });
          const hasAny = monthRows.some((x) => x.date === iso);
          const p = hasAny ? dailyProgress(items) : null;
          cal.push({ day: d, progress: p, status: calendarStatus(p) });
        }
        setMonthDays(cal);
        const periodLabel = monthOffset === 0 ? "bulan ini" : mFirst.toLocaleDateString("id-ID", { month: "long" });
        if (bd.length && mDaily.some((v) => v > 0)) { const top = bd[0]; const low = bd[bd.length - 1]; setInsight(top.id === low.id ? `${top.name} terjaga dengan baik ${periodLabel} (${top.pct}%). Pertahankan pelan-pelan.` : `${top.name} menjadi kebiasaan paling terjaga ${periodLabel} (${top.pct}%). ${low.name} masih bertumbuh (${low.pct}%) — temani pelan-pelan.`); }
        else setInsight(monthOffset === 0 ? "Belum ada data bulan ini. Mulai dari satu isian hari ini." : `Belum ada data pada ${periodLabel}.`);
      } finally {
        setMonthLoading(false);
        setLoading(false);
      }
    })();
  }, [supabase, dayKey, viewUserId, monthOffset]);

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

  if (needsLogin) {
    return (
      <div className="space-y-6">
        <Card className="p-10 text-center rounded-[24px] border-dashed">
          <h2 className="font-semibold mt-3">Masuk dulu, yuk</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-6">Perjalanan konsistensimu tersimpan di akunmu. Masuk untuk melihatnya.</p>
          <Link href="/login?next=/progress" className="inline-block mt-5">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary text-white text-sm font-medium px-5 py-2.5">Masuk <ArrowRight className="h-4 w-4" /></span>
          </Link>
        </Card>
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
        <h1 className="text-[26px] font-bold tracking-tight leading-tight">
          {viewUserId && viewUserId !== myId
            ? `Perjalanan ${viewMembers.find((m) => m.id === viewUserId)?.name ?? "anggota"}`
            : "Perjalananmu"}
        </h1>
        {viewerRole !== "MEMBER" && viewMembers.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Pilih anggota yang dilihat">
            {[{ id: myId ?? "", name: "Saya" }, ...viewMembers.filter((m) => m.id !== myId)].map((m) => {
              const active = (viewUserId ?? myId) === m.id;
              return (
                <button
                  key={m.id || "saya"}
                  type="button"
                  onClick={() => setViewUserId(m.id === myId ? null : m.id)}
                  aria-pressed={active}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 min-h-[44px] text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary text-white border-primary" : "bg-card hover:bg-muted"}`}
                >
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-[var(--primary-soft)] text-primary"}`} aria-hidden="true">
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  {m.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mingguan — panel hijau tua seperti Beranda */}
      <div className="rounded-[24px] p-6 text-white relative overflow-hidden bg-gradient-to-br from-[#1C5B40] via-[#17452F] to-[#102E21]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-12 -bottom-14 h-40 w-40 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-5">
          <ProgressRing value={avgWeekly} size={96} stroke={9} track="rgba(255,255,255,0.18)" bar="#E9D9A6" valueClassName="text-white" labelClassName="text-white/60" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/60">Minggu ini</p>
            <div className="text-[30px] font-bold leading-none mt-1.5 text-white tabular-nums">
              {avgWeekly}% <span className="text-sm font-normal text-white/60">rata-rata</span>
            </div>
            <p className="text-xs text-white/70 mt-1.5 tabular-nums">
              {weekLabel} · {activeDays}/7 hari terisi
            </p>
          </div>
        </div>
        {avgWeekly >= 40 && (
          <p className="relative text-sm text-white/85 leading-6 mt-4">
            {avgWeekly >= 85
              ? "MasyaAllah, pekan yang terjaga. Pertahankan ritmemu."
              : avgWeekly >= 70
                ? "Alhamdulillah, ritmemu stabil minggu ini."
                : "Pelan-pelan — setiap isian hari ini berarti."}
          </p>
        )}
        <div className="relative mt-5 flex items-end justify-between gap-1.5" role="img" aria-label={`Grafik mingguan, rata-rata ${avgWeekly} persen`}>
          {weekly.map((d, i) => {
            const isBest = d.value === bestDay.value && d.value > 0;
            return (
              <div key={d.day + i} className="flex flex-1 flex-col items-center gap-1.5 min-w-0">
                <span className={`text-[10px] font-semibold tabular-nums ${isBest ? "text-[#E9D9A6]" : "text-transparent"}`} aria-hidden={!isBest}>
                  {d.value}
                </span>
                <div className="w-full max-w-9 rounded-full bg-white/15 overflow-hidden flex items-end" style={{ height: "52px" }}>
                  <div className={`w-full rounded-full transition-all ${isBest ? "bg-[#E9D9A6]" : "bg-white/50"}`} style={{ height: `${Math.max(d.value, 4)}%` }} />
                </div>
                <span className={`text-[10px] font-medium ${isBest ? "text-[#E9D9A6]" : "text-white/60"}`}>{d.day}</span>
              </div>
            );
          })}
        </div>
        <dl className="relative mt-5 pt-4 border-t border-white/10 grid grid-cols-2 gap-2 text-center">
          <div>
            <dt className="text-[11px] text-white/60">Hari terisi (≥1 amalan)</dt>
            <dd className="font-bold text-white mt-0.5 tabular-nums">{activeDays}/7</dd>
          </div>
          <div>
            {showStreak ? (
              <>
                <dt className="text-[11px] text-white/60 flex items-center justify-center gap-1">
                  <Flame className="h-3 w-3" aria-hidden="true" /> Rangkaian
                </dt>
                <dd className="font-bold text-white mt-0.5 tabular-nums">{streak} hari</dd>
              </>
            ) : (
              <>
                <dt className="text-[11px] text-white/60">Hari sempurna (100%)</dt>
                <dd className="font-bold text-white mt-0.5 tabular-nums">{monthStats.perfect}</dd>
              </>
            )}
          </div>
        </dl>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Breakdown */}
        <Card className="rounded-[20px] p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" /> Rincian amalan
            </h3>
            <div className="flex items-center gap-0.5" role="group" aria-label="Pilih bulan">
              <button
                type="button"
                onClick={() => goMonth(-1)}
                disabled={monthOffset <= -11 || monthLoading}
                aria-label="Bulan sebelumnya"
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="text-[11px] font-semibold capitalize tabular-nums min-w-[86px] text-center" aria-live="polite">
                {monthLoading ? "Memuat…" : calMeta.monthShort}
              </span>
              <button
                type="button"
                onClick={() => goMonth(1)}
                disabled={monthOffset >= 0 || monthLoading}
                aria-label="Bulan berikutnya"
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Diurut dari yang paling terjaga · {calMeta.isCurrent ? "30 hari terakhir" : calMeta.monthLabel} · ketuk untuk histori.
          </p>
          <div className="mt-5 space-y-5">
            {(showAll ? breakdown : breakdown.slice(0, 6)).map((h) => {
              const status = h.pct >= 80 ? "Terjaga" : h.pct >= 50 ? "Bertumbuh" : "Baru dimulai";
              const tone =
                h.pct >= 80
                  ? { badge: "bg-[var(--primary-soft)] text-primary" }
                  : h.pct >= 50
                    ? { badge: "bg-amber-50 text-amber-700" }
                    : { badge: "bg-muted text-muted-foreground" };
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setFocusHabitId(h.id)}
                  aria-label={`Lihat histori ${h.name}, rata-rata ${h.pct} persen`}
                  className="block w-full text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium truncate">{h.name}</span>
                    <span className={`font-bold text-xs px-2 py-0.5 rounded-full tabular-nums shrink-0 ${tone.badge}`}>{h.pct}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{h.category} · {status}</div>
                  <div className="mt-2 flex items-end gap-1" role="img" aria-label={`${h.name} tujuh hari terakhir`}>
                    {(spark[h.id] ?? []).slice(-7).map((v, i) => (
                      <div key={i} className="flex-1 rounded-full bg-muted overflow-hidden flex items-end" style={{ height: "24px" }}>
                        <div
                          className={`w-full rounded-full ${v >= 100 ? "bg-primary" : v > 0 ? "bg-amber-500" : "bg-transparent"}`}
                          style={{ height: v > 0 ? `${Math.max(v, 25)}%` : "0%" }}
                        />
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
            {breakdown.length === 0 && (
              <p className="text-sm text-muted-foreground leading-6">
                {calMeta.isCurrent ? "Belum ada data 30 hari. Isi mutabaah hari ini untuk mulai melihat polanya." : `Belum ada data pada ${calMeta.monthLabel}.`}
              </p>
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
          <h3 className="font-semibold flex items-center gap-2 capitalize">
            <Trophy className="h-4 w-4 text-amber-600" aria-hidden="true" /> Bulan ini · {calMeta.monthShort}
          </h3>
          <div className="mt-4 flex items-center gap-5">
            <div className="shrink-0">
              <div className="text-[44px] font-bold leading-none tracking-tight tabular-nums">{monthStats.avg}<span className="text-xl text-muted-foreground">%</span></div>
              <div className="text-xs text-muted-foreground mt-1.5">rata-rata {calMeta.isCurrent ? "30 hari" : calMeta.monthShort.toLowerCase()}</div>
            </div>
            <div className="flex-1 min-w-0 space-y-2.5 border-l border-border/70 pl-5">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0" aria-hidden="true">
                  <Trophy className="h-4 w-4 text-amber-600" />
                </span>
              <div className="min-w-0">
                <div className="font-bold tabular-nums leading-none">{monthStats.perfect} <span className="text-xs font-medium text-muted-foreground">hari sempurna (100%)</span></div>
              </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center shrink-0" aria-hidden="true">
                  <Flame className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0">
                  <div className="font-bold tabular-nums leading-none">{monthStats.longest} <span className="text-xs font-medium text-muted-foreground">hari</span></div>
                  <div className="text-[11px] text-muted-foreground mt-1">rangkaian terpanjang</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-[var(--primary-soft)] border border-primary/10 p-4 text-sm leading-6">{insight}</div>
          <Link href="/mutabaah" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary rounded-full px-2 py-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Isi hari ini untuk melanjutkan <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </Card>
      </div>

      {/* Calendar — ketuk tanggal untuk melihat rinciannya di bawah */}
      <Card className="rounded-[20px] p-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <h3 className="font-semibold text-sm capitalize">Kalender · {calMeta.monthShort}</h3>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs" role="group" aria-label="Pilih tanggal untuk melihat rincian">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
            <div key={d} className="font-semibold text-muted-foreground py-1 text-[11px]" aria-hidden="true">
              {d}
            </div>
          ))}
          {(() => {
            const trailing = (7 - ((calMeta.firstOffset + monthDays.length) % 7)) % 7;
            return (
              <>
                {Array.from({ length: calMeta.firstOffset }).map((_, i) => (
                  <div key={`kosong-awal-${i}`} aria-hidden="true" />
                ))}
                {monthDays.map((d) => {
                  const isToday = calMeta.isCurrent && d.day === calMeta.todayNum;
                  const isFuture = calMeta.isCurrent && d.day > calMeta.todayNum;
                  const isSelected = selectedDay === d.day;
                  return (
                    <button
                      key={d.day}
                      type="button"
                      disabled={isFuture}
                      onClick={() => setSelectedDay(d.day)}
                      title={d.progress !== null ? `${d.progress}% terisi` : "belum ada data"}
                      aria-current={isToday ? "date" : undefined}
                      aria-pressed={isSelected}
                      aria-label={`${d.day} ${calMeta.monthLabel}${d.progress !== null ? `, ${d.progress} persen terisi` : ", belum ada data"}`}
                      className={`h-9 w-full rounded-xl flex items-center justify-center border text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40
                        ${isSelected ? "bg-primary border-primary text-white font-bold" : isToday ? "font-bold ring-2 ring-primary ring-offset-1" : "font-medium"}
                        ${!isSelected && d.status === "completed" ? "bg-[var(--primary-soft)] border-primary/20 text-primary" : ""}
                        ${!isSelected && d.status === "partial" ? "bg-amber-50 border-amber-200 text-amber-800" : ""}
                        ${!isSelected && d.status === "low" ? "bg-white border-zinc-200 text-muted-foreground" : ""}
                        ${!isSelected && d.status === "none" ? "bg-white text-muted-foreground border-dashed border-zinc-200" : ""}
                      `}
                    >
                      {d.day}
                    </button>
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
            <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" /> Terisi penuh
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" /> Sebagian terisi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white border border-zinc-300" aria-hidden="true" /> Sedikit / belum ada
          </span>
        </div>
      </Card>

      {/* Rincian tanggal — bottom sheet, muncul saat tanggal diketuk */}
      {dayDetail && (
        <Sheet label={`Rincian mutabaah ${dayDetail.label}`} onClose={() => setSelectedDay(null)}>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg capitalize leading-tight">{dayDetail.label}</h3>
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                {dayDetail.items.some((i) => i.value > 0) ? (
                  <>
                    {dayDetail.progress}% terisi
                    {dayDetail.berjamaah + dayDetail.sendiri > 0 && (
                      <span className="text-muted-foreground"> · {dayDetail.berjamaah > 0 && `${dayDetail.berjamaah} berjamaah`}{dayDetail.berjamaah > 0 && dayDetail.sendiri > 0 && " · "}{dayDetail.sendiri > 0 && `${dayDetail.sendiri} sendiri`}</span>
                    )}
                  </>
                ) : (
                  "Belum ada isian."
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              aria-label="Tutup rincian"
              className="h-11 w-11 -mr-2 rounded-full flex items-center justify-center hover:bg-muted shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 space-y-5 max-h-[55dvh] overflow-auto">
            {dayDetail.note && (
              <figure className="rounded-2xl bg-[var(--primary-soft)]/60 border border-primary/10 px-4 py-3">
                <blockquote className="text-sm leading-6">“{dayDetail.note}”</blockquote>
                <figcaption className="text-[11px] text-muted-foreground mt-1">Refleksi hari itu · privat</figcaption>
              </figure>
            )}
            {dayDetail.strip.some((s) => s.item) && (
              <div className="grid grid-cols-5 gap-1.5" role="list" aria-label="Sholat lima waktu">
                {dayDetail.strip.map((s) => {
                  const it = s.item;
                  // Kosong (data lama) = netral "Selesai", bukan "Sendiri" — agar tak menyesatkan.
                  const state = !it ? "missing" : it.status === "done" && it.context === "BERJAMAAH" ? "jamaah" : it.status === "done" && it.context === "SENDIRI" ? "sendiri" : it.status === "done" ? "done" : it.status === "partial" ? "partial" : "todo";
                  return (
                    <div
                      key={s.key}
                      role="listitem"
                      aria-label={`${s.label}${!it ? " — tidak ada target" : it.status === "done" ? (it.context === "BERJAMAAH" ? " — berjamaah di masjid" : it.context === "SENDIRI" ? " — sholat sendiri" : " — selesai") : it.status === "partial" ? " — sebagian" : " — belum diisi"}`}
                      title={`${s.label}${!it ? " — tidak ada target" : it.status === "done" ? (it.context === "BERJAMAAH" ? " — berjamaah di masjid" : it.context === "SENDIRI" ? " — sholat sendiri" : " — selesai") : ""}`}
                      className={`rounded-2xl border py-2.5 px-1 text-center transition-colors
                        ${state === "jamaah" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : ""}
                        ${state === "sendiri" ? "bg-[var(--primary-soft)] border-primary/20 text-primary" : ""}
                        ${state === "done" ? "bg-[var(--primary-soft)]/50 border-primary/10 text-primary" : ""}
                        ${state === "partial" ? "bg-amber-50 border-amber-200 text-amber-700" : ""}
                        ${state === "todo" ? "bg-card border-border text-muted-foreground" : ""}
                        ${state === "missing" ? "bg-transparent border-dashed border-border text-muted-foreground/50" : ""}
                      `}
                    >
                      <span className="flex justify-center" aria-hidden="true">
                        {state === "jamaah" ? <Users className="h-4 w-4" /> : state === "sendiri" ? <User className="h-4 w-4" /> : state === "done" ? <Check className="h-4 w-4" /> : state === "partial" ? <span className="h-2 w-2 mt-1 bg-amber-500 rounded-full" /> : state === "todo" ? <span className="h-2 w-2 mt-1 rounded-full border border-current" /> : <span className="h-2 w-2 mt-1">–</span>}
                      </span>
                      <span className="block mt-1 text-[10px] font-semibold leading-tight truncate px-0.5">{s.label}</span>
                      <span className="block text-[9px] leading-tight mt-0.5 truncate px-0.5 opacity-80">
                        {state === "jamaah" ? "Masjid" : state === "sendiri" ? "Sendiri" : state === "done" ? "Selesai" : state === "partial" ? "Sebagian" : state === "todo" ? "Belum" : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {dayDetail.groups.map((g) => (
              <section key={g.category} aria-label={`Kategori ${g.category}`}>
                <div className="flex items-center gap-2">
                  <h4 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">{g.category}</h4>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium tabular-nums bg-muted text-muted-foreground">
                    {g.items.filter((i) => i.status === "done").length}/{g.items.length}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {g.items.map((i) => (
                    <li key={i.id} className="flex items-center gap-2.5 py-2 border-b border-border/50 last:border-0">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${i.status === "done" ? "bg-primary" : i.status === "partial" ? "bg-amber-500" : "bg-zinc-300"}`}
                        aria-hidden="true"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm truncate">{i.name}</span>
                        {i.category === "Ibadah Wajib" && i.status === "done" && i.context === "BERJAMAAH" && (
                          <span
                            className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            <Users className="h-3 w-3" aria-hidden="true" />
                            Berjamaah di masjid
                          </span>
                        )}
                        {i.category === "Ibadah Wajib" && i.status === "done" && i.context === "SENDIRI" && (
                          <span
                            className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border bg-muted text-muted-foreground border-transparent"
                          >
                            <User className="h-3 w-3" aria-hidden="true" />
                            Sholat sendiri
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {i.type === "BOOLEAN" ? (i.status === "done" ? "✓" : "—") : i.unit ? `${i.value}/${i.target} ${i.unit}` : `${i.value}/${i.target}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Sheet>
      )}

      {/* Histori amalan — bottom sheet, muncul saat baris rincian diketuk */}
      {focusDetail && (
        <Sheet label={`Histori 30 hari ${focusDetail.habit.name}`} onClose={() => setFocusHabitId(null)}>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg leading-tight truncate">{focusDetail.habit.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                Rata-rata {focusDetail.avg}% · {focusDetail.activeDays}/{focusDetail.total} hari terisi
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFocusHabitId(null)}
              aria-label="Tutup histori"
              className="h-11 w-11 -mr-2 rounded-full flex items-center justify-center hover:bg-muted shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center" role="img" aria-label={`Kalender ${focusDetail.rangeLabel} ${focusDetail.habit.name}`}>
            {["S", "S", "R", "K", "J", "S", "M"].map((d, i) => (
              <span key={i} className="text-[10px] font-semibold text-muted-foreground py-0.5" aria-hidden="true">
                {d}
              </span>
            ))}
            {Array.from({ length: calMeta.firstOffset }).map((_, i) => (
              <span key={`kosong-${i}`} aria-hidden="true" />
            ))}
            {Array.from({ length: calMeta.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const v = day <= focusDetail.series.length ? (focusDetail.series[day - 1] ?? 0) : null;
              const ctx = focusDetail.isWajib && day <= focusDetail.contexts.length ? (focusDetail.contexts[day - 1] ?? null) : null;
              const isToday = calMeta.isCurrent && day === calMeta.todayNum;
              const isFuture = v === null;
              return (
                <span
                  key={day}
                  title={v === null ? "mendatang" : v >= 100 ? (ctx === "BERJAMAAH" ? "berjamaah di masjid" : "terisi penuh") : v > 0 ? `${v}% terisi` : "belum terisi"}
                  aria-current={isToday ? "date" : undefined}
                  className={`aspect-square w-full rounded-lg flex items-center justify-center text-[11px] tabular-nums border transition-colors
                    ${isToday ? "font-bold ring-2 ring-primary ring-offset-1" : "font-medium"}
                    ${isFuture ? "bg-transparent text-muted-foreground/40 border-dashed border-border" : ""}
                    ${!isFuture && v !== null && v >= 100 ? (ctx === "BERJAMAAH" ? "bg-emerald-500 border-emerald-500 text-white" : "bg-primary border-primary text-white") : ""}
                    ${!isFuture && v !== null && v > 0 && v < 100 ? "bg-amber-100 border-amber-200 text-amber-800" : ""}
                    ${!isFuture && v === 0 ? "bg-muted/60 border-transparent text-muted-foreground" : ""}
                  `}
                >
                  {day}
                </span>
              );
            })}
          </div>
          {focusDetail.isWajib && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" /> Berjamaah · {focusDetail.berjamaah}x
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" /> Sendiri · {focusDetail.sendiri}x
              </span>
              <span className="tabular-nums">{focusDetail.rangeLabel}</span>
            </div>
          )}
          <dl className="mt-4 pt-4 border-t border-border/60 grid grid-cols-2 gap-2 text-center">
            <div>
              <dt className="text-[11px] text-muted-foreground">Hari terisi</dt>
              <dd className="font-bold mt-0.5 tabular-nums">{focusDetail.activeDays}/{focusDetail.total}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">Rangkaian terpanjang</dt>
              <dd className="font-bold mt-0.5 tabular-nums">{focusDetail.longest} hari</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground leading-5">
            {focusDetail.avg >= 80
              ? "Terjaga dengan baik — pertahankan pelan-pelan."
              : focusDetail.avg >= 50
                ? "Bertumbuh — temani pelan-pelan."
                : "Baru dimulai — mulai dari target terkecil."}
          </p>
        </Sheet>
      )}
    </div>
  );
}
