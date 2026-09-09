"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/app/progress-ring";
import { Flame, Trophy, CalendarDays, TrendingUp, ArrowRight, X, Users, User } from "lucide-react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { dailyProgress, isStreakDay, calendarStatus } from "@/lib/progress";
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

  // Meta kalender dihitung sekali per render dari tanggal lokal (di dalam callback
  // agar aman dari aturan purity) — dipakai grid tanggal dan kartu rincian.
  const calMeta = useMemo(() => {
    const nowD = new Date();
    const year = nowD.getFullYear();
    const month = nowD.getMonth();
    return {
      year,
      month,
      todayNum: nowD.getDate(),
      firstOffset: (new Date(year, month, 1).getDay() + 6) % 7,
      monthLabel: nowD.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      monthShort: nowD.toLocaleDateString("id-ID", { month: "long" }),
      iso: (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      label: (day: number) =>
        new Date(year, month, day).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }),
    };
  }, []);

  // Mini-grafik 7 hari terakhir per amalan — hijau penuh, amber sebagian, kosong terlewat.
  const spark = useMemo(() => {
    const days: string[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
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
  }, [habits, dayEntries]);

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
    const items: DayItem[] = habits.map((h) => {
      const e = dayEntries.find((x) => x.date === iso && x.habit_id === h.id);
      const value = e ? Number(e.value) : 0;
      const target = Number(h.target_value) || 1;
      const done = value >= target && value > 0;
      const partial = value > 0 && !done;
      const unit = h.unit ?? (h.type === "DURATION" ? "menit" : h.type === "QUANTITY" || h.type === "COUNTER" ? "kali" : "");
      return {
        id: h.id,
        name: h.name,
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
      { key: "subuh", label: "Subuh", match: ["subuh"] },
      { key: "dzuhur", label: "Dzuhur", match: ["dzuhur", "duhur", "lohor", "zuhur"] },
      { key: "ashar", label: "Ashar", match: ["ashar", "asar"] },
      { key: "maghrib", label: "Maghrib", match: ["maghrib"] },
      { key: "isya", label: "Isya", match: ["isya", "isha"] },
    ];
    const used = new Set<string>();
    const strip = PRAYERS.map((p) => {
      const found = items.find((i) => !used.has(i.id) && i.category === "Ibadah Wajib" && p.match.some((k) => i.name.toLowerCase().includes(k)));
      if (found) used.add(found.id);
      return { ...p, item: found ?? null };
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
    return { day, iso, label: calMeta.label(day), progress: dailyProgress(items), items, groups, strip, berjamaah, sendiri: wajibDone.length - berjamaah };
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
      const nowForRange = new Date();
      const thirtyAgo = localDateKey(daysAgoLocal(29, nowForRange));
      const monthStartISO = `${nowForRange.getFullYear()}-${String(nowForRange.getMonth() + 1).padStart(2, "0")}-01`;
      const rangeStart = monthStartISO < thirtyAgo ? monthStartISO : thirtyAgo;
      const { data: entries } = await supabase.from("mutabaah_entries").select("habit_id,value,status,date,context").eq("family_id", family.familyId).eq("user_id", targetId).gte("date", rangeStart);
      const entryRows = (entries ?? []) as EntryRow[];
      setDayEntries(entryRows);
      const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      const weekVals: { day: string; value: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = daysAgoLocal(i, nowForRange);
        const iso = localDateKey(d);
        const items = hRows.map((h) => { const e = entryRows.find((x) => x.date === iso && x.habit_id === h.id); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 }; });
        weekVals.push({ day: dayNames[d.getDay()], value: dailyProgress(items) });
      }
      setWeekly(weekVals);
      setAvgWeekly(weekVals.length ? Math.round(weekVals.reduce((a, b) => a + b.value, 0) / weekVals.length) : 0);
      setActiveDays(weekVals.filter((w) => w.value > 0).length);
      setBestDay(weekVals.reduce((best, cur) => (cur.value > best.value ? cur : best), weekVals[0] ?? { day: "-", value: 0 }));
      const allDays: number[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = localDateKey(daysAgoLocal(i, nowForRange));
        const items = hRows.map((h) => { const e = entryRows.find((x) => x.date === d && x.habit_id === h.id); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 }; });
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
          const d = localDateKey(daysAgoLocal(29 - idx, nowForRange));
          const e = entryRows.find((x) => x.date === d && x.habit_id === h.id);
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
        const items = hRows.map((h) => { const e = entryRows.find((x) => x.date === iso && x.habit_id === h.id); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 }; });
        const hasAny = entryRows.some((x) => x.date === iso);
        const p = hasAny ? dailyProgress(items) : null;
        cal.push({ day: d, progress: p, status: calendarStatus(p) });
      }
      setMonthDays(cal);
      if (bd.length) { const top = bd[0]; const low = bd[bd.length - 1]; setInsight(top.id === low.id ? `${top.name} terjaga dengan baik bulan ini (${top.pct}%). Pertahankan pelan-pelan.` : `${top.name} menjadi kebiasaan paling terjaga bulan ini (${top.pct}%). ${low.name} masih bertumbuh (${low.pct}%) — temani pelan-pelan.`); }
      else setInsight("Belum ada data bulan ini. Mulai dari satu isian hari ini.");
      setLoading(false);
    })();
  }, [supabase, dayKey, viewUserId]);

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
        <p className="text-sm text-muted-foreground mt-1 leading-6">Dibandingkan dengan diri kemarin — bukan dengan orang lain.</p>
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
        <p className="relative text-sm text-white/85 leading-6 mt-4">
          {avgWeekly >= 85
            ? "MasyaAllah, pekan yang terjaga. Pertahankan ritmemu."
            : avgWeekly >= 70
              ? "Alhamdulillah, ritmemu stabil minggu ini."
              : avgWeekly >= 40
                ? "Pelan-pelan — setiap isian hari ini berarti."
                : "Belum banyak terisi pekan ini, tidak apa-apa. Mulai dari satu ketukan hari ini."}
        </p>
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
        <dl className="relative mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-[11px] text-white/60">Hari terbaik</dt>
            <dd className="font-bold text-white mt-0.5 tabular-nums">{bestDay.day} · {bestDay.value}%</dd>
          </div>
          <div className="border-x border-white/10">
            <dt className="text-[11px] text-white/60">Hari terisi</dt>
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
                <dt className="text-[11px] text-white/60">Hari penuh</dt>
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
              <TrendingUp className="h-4 w-4 text-primary" /> Rincian amalan
            </h3>
            <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full font-medium">30 hari terakhir</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Diurut dari yang paling terjaga · grafik 7 hari terakhir.</p>
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
                <div key={h.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium truncate">{h.name}</span>
                    <span className={`font-bold text-xs px-2 py-0.5 rounded-full tabular-nums shrink-0 ${tone.badge}`}>{h.pct}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{h.category} · {status} · 30 hari</div>
                  <div className="mt-2 flex items-end gap-1" role="img" aria-label={`${h.name} tujuh hari terakhir`}>
                    {(spark[h.id] ?? []).map((v, i) => (
                      <div key={i} className="flex-1 rounded-full bg-muted overflow-hidden flex items-end" style={{ height: "24px" }}>
                        <div
                          className={`w-full rounded-full ${v >= 100 ? "bg-primary" : v > 0 ? "bg-amber-500" : "bg-transparent"}`}
                          style={{ height: v > 0 ? `${Math.max(v, 25)}%` : "0%" }}
                        />
                      </div>
                    ))}
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
          <h3 className="font-semibold flex items-center gap-2 capitalize">
            <Trophy className="h-4 w-4 text-amber-600" aria-hidden="true" /> Bulan ini · {calMeta.monthShort}
          </h3>
          <div className="mt-4 flex items-center gap-5">
            <div className="shrink-0">
              <div className="text-[44px] font-bold leading-none tracking-tight tabular-nums">{monthStats.avg}<span className="text-xl text-muted-foreground">%</span></div>
              <div className="text-xs text-muted-foreground mt-1.5">rata-rata 30 hari</div>
            </div>
            <div className="flex-1 min-w-0 space-y-2.5 border-l border-border/70 pl-5">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0" aria-hidden="true">
                  <Trophy className="h-4 w-4 text-amber-600" />
                </span>
                <div className="min-w-0">
                  <div className="font-bold tabular-nums leading-none">{monthStats.perfect} <span className="text-xs font-medium text-muted-foreground">hari penuh</span></div>
                  <div className="text-[11px] text-muted-foreground mt-1">terisi 100%</div>
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
          <h3 className="font-semibold text-sm">Kalender bulan ini</h3>
          <span className="ml-auto text-xs text-muted-foreground hidden sm:inline capitalize">{calMeta.monthLabel}</span>
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
                  const isToday = d.day === calMeta.todayNum;
                  const isFuture = d.day > calMeta.todayNum;
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
            {dayDetail.strip.some((s) => s.item) && (
              <div className="grid grid-cols-5 gap-1.5" role="list" aria-label="Sholat lima waktu">
                {dayDetail.strip.map((s) => {
                  const it = s.item;
                  const state = !it ? "missing" : it.status === "done" && it.context === "BERJAMAAH" ? "jamaah" : it.status === "done" ? "sendiri" : it.status === "partial" ? "partial" : "todo";
                  return (
                    <div
                      key={s.key}
                      role="listitem"
                      aria-label={`${s.label}${!it ? " — tidak ada target" : it.status === "done" ? (it.context === "BERJAMAAH" ? " — berjamaah di masjid" : " — sholat sendiri") : it.status === "partial" ? " — sebagian" : " — belum diisi"}`}
                      title={`${s.label}${!it ? " — tidak ada target" : it.status === "done" ? (it.context === "BERJAMAAH" ? " — berjamaah di masjid" : " — sholat sendiri") : ""}`}
                      className={`rounded-2xl border py-2.5 px-1 text-center transition-colors
                        ${state === "jamaah" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : ""}
                        ${state === "sendiri" ? "bg-[var(--primary-soft)] border-primary/20 text-primary" : ""}
                        ${state === "partial" ? "bg-amber-50 border-amber-200 text-amber-700" : ""}
                        ${state === "todo" ? "bg-card border-border text-muted-foreground" : ""}
                        ${state === "missing" ? "bg-transparent border-dashed border-border text-muted-foreground/50" : ""}
                      `}
                    >
                      <span className="flex justify-center" aria-hidden="true">
                        {state === "jamaah" ? <Users className="h-4 w-4" /> : state === "sendiri" ? <User className="h-4 w-4" /> : state === "partial" ? <span className="h-2 w-2 mt-1 bg-amber-500 rounded-full" /> : state === "todo" ? <span className="h-2 w-2 mt-1 rounded-full border border-current" /> : <span className="h-2 w-2 mt-1">–</span>}
                      </span>
                      <span className="block mt-1 text-[10px] font-semibold leading-tight truncate px-0.5">{s.label}</span>
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
                        {i.category === "Ibadah Wajib" && i.status === "done" && (
                          <span
                            className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${i.context === "BERJAMAAH" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground border-transparent"}`}
                          >
                            {i.context === "BERJAMAAH" ? <Users className="h-3 w-3" aria-hidden="true" /> : <User className="h-3 w-3" aria-hidden="true" />}
                            {i.context === "BERJAMAAH" ? "Berjamaah di masjid" : "Sholat sendiri"}
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
    </div>
  );
}
