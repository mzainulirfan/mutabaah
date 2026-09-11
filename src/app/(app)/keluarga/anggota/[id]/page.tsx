"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Flame, TrendingUp, Sprout } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { dailyProgress, calcStreak } from "@/lib/progress";
import { displayHabitName } from "@/lib/habits";
import { daysAgoLocal, localDateKey } from "@/lib/local-date";
import type { EntryRow } from "@/lib/supabase/types";
import { getFamilyContext, getSessionUser } from "@/lib/family-context";

const roleLabel: Record<string, string> = { OWNER: "Pemilik", PARENT: "Orang tua", MEMBER: "Anggota" };
const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

type BreakdownRow = { id: string; name: string; category: string; pct: number };
type TodayRow = {
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
type Spotlight = { name: string; pct: number } | null;

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [missing, setMissing] = useState(false);
  const [name, setName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [todayPct, setTodayPct] = useState(0);
  const [todayList, setTodayList] = useState<TodayRow[]>([]);
  const [streak, setStreak] = useState(0);
  const [week, setWeek] = useState<{ day: string; value: number }[]>([]);
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([]);
  const [top, setTop] = useState<Spotlight>(null);
  const [low, setLow] = useState<Spotlight>(null);

  useEffect(() => {
    void (async () => {
      const { id } = await params;
      const user = await getSessionUser(supabase);
      if (!user) { setDenied(true); setLoading(false); return; }
      const ctx = await getFamilyContext(supabase, user.id);
      if (!ctx || (ctx.role !== "OWNER" && ctx.role !== "PARENT")) { setDenied(true); setLoading(false); return; }
      const target = ctx.members.find((m) => m.user_id === id);
      if (!target) { setMissing(true); setLoading(false); return; }
      setName(target.name);
      setMemberRole(target.role);

      const habits = ctx.habits;
      const now = new Date();
      const today = localDateKey(now);
      const thirtyAgo = localDateKey(daysAgoLocal(29, now));
      const [{ data: todayData }, { data: last30Data }] = await Promise.all([
        supabase.from("mutabaah_entries").select("habit_id,value,status,context").eq("family_id", ctx.familyId).eq("user_id", id).eq("date", today),
        supabase.from("mutabaah_entries").select("habit_id,value,status,date").eq("family_id", ctx.familyId).eq("user_id", id).gte("date", thirtyAgo),
      ]);
      const todayRows = (todayData ?? []) as EntryRow[];
      const rows30 = (last30Data ?? []) as EntryRow[];

      const progressOf = (rows: EntryRow[]) =>
        dailyProgress(
          habits.map((h) => {
            const e = rows.find((x) => x.habit_id === h.id);
            return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0, status: e?.status };
          })
        );
      setTodayPct(progressOf(todayRows));
      setTodayList(
        habits.map((h) => {
          const e = todayRows.find((x) => x.habit_id === h.id);
          const value = e ? Number(e.value) : 0;
          const target = Number(h.target_value) || 1;
          const done = value >= target && value > 0;
          return {
            id: h.id,
            name: displayHabitName(h.name, now),
            category: h.category,
            type: h.type,
            value,
            target,
            unit: h.unit ?? (h.type === "DURATION" ? "menit" : ""),
            context: e?.context ?? null,
            status: done ? ("done" as const) : value > 0 ? ("partial" as const) : ("todo" as const),
          };
        })
      );

      const allDays: number[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = localDateKey(daysAgoLocal(i, now));
        allDays.push(progressOf(rows30.filter((x) => x.date === d)));
      }
      setStreak(calcStreak(allDays));

      const weekVals: { day: string; value: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = daysAgoLocal(i, now);
        const iso = localDateKey(d);
        weekVals.push({ day: dayNames[d.getDay()], value: progressOf(rows30.filter((x) => x.date === iso)) });
      }
      setWeek(weekVals);

      const bd: BreakdownRow[] = habits.map((h) => {
        const vals: number[] = [];
        for (let i = 29; i >= 0; i--) {
          const d = localDateKey(daysAgoLocal(i, now));
          const e = rows30.find((x) => x.date === d && x.habit_id === h.id);
          const v = e ? Number(e.value) : 0;
          const target = Number(h.target_value) || 1;
          vals.push(h.type === "BOOLEAN" ? (v ? 100 : 0) : Math.round(Math.min(100, (v / target) * 100)));
        }
        return { id: h.id, name: h.name, category: h.category, pct: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 };
      });
      bd.sort((a, b) => b.pct - a.pct);
      setBreakdown(bd);
      setTop(bd.length > 0 ? { name: bd[0].name, pct: bd[0].pct } : null);
      setLow(bd.length > 1 ? { name: bd[bd.length - 1].name, pct: bd[bd.length - 1].pct } : null);
      setLoading(false);
    })();
  }, [supabase, params]);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Memuat progres anggota">
        <div className="h-20 rounded-[24px] bg-muted" />
        <div className="h-36 rounded-[24px] bg-muted" />
        <div className="h-40 rounded-[20px] bg-muted" />
      </div>
    );
  }

  if (denied) {
    return (
      <Card className="p-8 text-center rounded-[24px] border-dashed">
        <h2 className="font-bold text-lg">Halaman orang tua</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-6">Halaman ini hanya untuk pemilik dan orang tua.</p>
        <Link href="/beranda" className="inline-flex items-center justify-center mt-5 rounded-full bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 min-h-[44px]">
          Kembali ke Beranda
        </Link>
      </Card>
    );
  }

  if (missing) {
    return (
      <div className="space-y-6">
        <Link href="/keluarga/anggota" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-full px-2 py-1 -ml-2">
          <ChevronLeft className="h-4 w-4" /> Anggota
        </Link>
        <Card className="p-8 text-center rounded-[24px] border-dashed">
          <h2 className="font-bold text-lg">Anggota tidak ditemukan</h2>
          <p className="text-sm text-muted-foreground mt-1">Mungkin sudah keluar dari keluarga.</p>
        </Card>
      </div>
    );
  }

  const doneToday = todayList.filter((i) => i.status === "done").length;

  return (
    <div className="space-y-6">
      <Link href="/keluarga/anggota" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-full px-2 py-1 -ml-2">
        <ChevronLeft className="h-4 w-4" /> Anggota
      </Link>

      {/* Hero */}
      <div className="rounded-[24px] p-6 text-white relative overflow-hidden bg-gradient-to-br from-[#1C5B40] via-[#17452F] to-[#102E21]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-12 -bottom-14 h-40 w-40 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center text-white font-bold text-lg shrink-0" aria-hidden="true">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/60">Progres hari ini</p>
            <h1 className="text-[22px] font-bold tracking-tight leading-tight truncate text-white">{name}</h1>
            <p className="text-xs text-white/70 mt-1 tabular-nums">
              {roleLabel[memberRole] ?? "Anggota"} · {doneToday}/{todayList.length} amalan terisi
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[30px] font-bold leading-none tabular-nums">{todayPct}%</div>
            {streak > 0 && (
              <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-white/70 tabular-nums">
                <Flame className="h-3 w-3" aria-hidden="true" /> {streak} hari
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sorotan — bahan obrolan: apa yang diapresiasi, apa yang ditemani */}
      {(top ?? low) && (
        <section aria-label="Sorotan">
          <div className="grid grid-cols-2 gap-3">
            {top && (
              <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-emerald-700 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" aria-hidden="true" /> Terjaga
                </p>
                <p className="font-semibold text-sm mt-1.5 truncate">{top.name}</p>
                <p className="text-xs text-emerald-700 tabular-nums mt-0.5">{top.pct}% · 30 hari</p>
              </div>
            )}
            {low && (
              <div className="rounded-[20px] border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-amber-700 flex items-center gap-1">
                  <Sprout className="h-3 w-3" aria-hidden="true" /> Bertumbuh
                </p>
                <p className="font-semibold text-sm mt-1.5 truncate">{low.name}</p>
                <p className="text-xs text-amber-700 tabular-nums mt-0.5">{low.pct}% · 30 hari</p>
              </div>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground leading-5 mt-3">
            Apresiasi yang terjaga, temani yang bertumbuh — tanpa membandingkan dengan kakak atau adik.
          </p>
        </section>
      )}

      {/* Hari ini — rincian per amalan yang menjelaskan angka % di Beranda */}
      <Card className="rounded-[20px] p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-sm">Hari ini</h2>
          <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full font-medium tabular-nums">
            {doneToday}/{todayList.length} selesai
          </span>
        </div>
        <ul className="mt-3 space-y-1">
          {todayList.map((i) => (
            <li key={i.id} className="flex items-center gap-2.5 py-2 border-b border-border/50 last:border-0">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${i.status === "done" ? "bg-primary" : i.status === "partial" ? "bg-amber-500" : "bg-zinc-300"}`}
                aria-hidden="true"
              />
              <span className="flex-1 min-w-0">
                <span className="block text-sm truncate">{i.name}</span>
                {i.category === "Ibadah Wajib" && i.status === "done" && (
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    {i.context === "BERJAMAAH" ? "Berjamaah di masjid" : "Sholat sendiri"}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {i.type === "BOOLEAN" ? (i.status === "done" ? "✓" : "—") : i.unit ? `${i.value}/${i.target} ${i.unit}` : `${i.value}/${i.target}`}
              </span>
            </li>
          ))}
          {todayList.length === 0 && <li className="py-2 text-sm text-muted-foreground">Belum ada amalan di keluarga ini.</li>}
        </ul>
      </Card>

      {/* 7 hari */}
      <Card className="rounded-[20px] p-5">
        <h2 className="font-semibold text-sm">7 hari terakhir</h2>
        <div className="mt-4 flex items-end gap-1.5" role="img" aria-label={`Grafik 7 hari ${name}`}>
          {week.map((d, i) => (
            <div key={d.day + i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <div className="w-full max-w-[28px] rounded-full bg-muted overflow-hidden flex items-end" style={{ height: "52px" }}>
                <div className={`w-full rounded-full ${d.value === 0 ? "bg-transparent" : d.value >= 70 ? "bg-primary" : "bg-amber-500"}`} style={{ height: `${Math.max(d.value, d.value > 0 ? 8 : 0)}%` }} />
              </div>
              <span className="text-[11px] text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Rincian amalan */}
      <Card className="rounded-[20px] p-5">
        <h2 className="font-semibold text-sm">Rincian amalan</h2>
        <p className="text-xs text-muted-foreground mt-1">Rata-rata 30 hari terakhir.</p>
        <div className="mt-4 space-y-4">
          {breakdown.map((h) => {
            const tone = h.pct >= 80 ? "bg-primary" : h.pct >= 50 ? "bg-amber-500" : "bg-zinc-300";
            return (
              <div key={h.id}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium truncate">{h.name}</span>
                  <span className="font-bold text-xs tabular-nums text-muted-foreground shrink-0">{h.pct}%</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={h.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${h.name} ${name}`}>
                  <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${h.pct}%` }} />
                </div>
              </div>
            );
          })}
          {breakdown.length === 0 && <p className="text-sm text-muted-foreground">Belum ada amalan di keluarga ini.</p>}
        </div>
      </Card>
    </div>
  );
}
