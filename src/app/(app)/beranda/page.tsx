"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/app/progress-ring";
import { Flame, ChevronRight, CheckCircle2, Users, Sparkles, TrendingUp, TrendingDown, Bell, Quote } from "@/components/ui/hugeicons";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { dailyProgress, isStreakDay } from "@/lib/progress";
import type { Entry } from "@/lib/habits";
import { daysAgoLocal, localDateKey } from "@/lib/local-date";
import { useLocalDayKey } from "@/hooks/use-local-day-key";
import type { EntryRow } from "@/lib/supabase/types";
import { getFamilyContext, getSessionUser } from "@/lib/family-context";

export default function BerandaPage() {
  const supabase = useMemo(() => createClient(), []);
  const dayKey = useLocalDayKey();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("OWNER");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Ayah");
  const [selfDelta, setSelfDelta] = useState<number | null>(null);
  const [selfActive, setSelfActive] = useState(0);
  type Quote = { userId: string; name: string; isMine: boolean; date: string; label: string; text: string };
  const [slide, setSlide] = useState<{ list: Quote[]; idx: number }>({ list: [], idx: 0 });
  const [members, setMembers] = useState<{ id: string; name: string; progress: number; streak: number; role: string }[]>([]);
  const [familyProgress, setFamilyProgress] = useState(0);
  const [delta, setDelta] = useState<number | null>(null);
  const [weekly, setWeekly] = useState<{ day: string; value: number }[]>([]);
  const [recent, setRecent] = useState<{ name: string; act: string; time: string; type: "completed" | "pending" }[]>([]);
  const [todayLabel] = useState(() =>
    new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  );
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 11) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  });
  const [showStreak, setShowStreak] = useState(true);
  const [myHabits, setMyHabits] = useState<{ id: string; name: string; category: string; type: "BOOLEAN" | "QUANTITY" | "COUNTER" | "DURATION"; target_value: number; unit: string | null; sort_order: number }[]>([]);
  const [myEntries, setMyEntries] = useState<Record<string, Entry>>({});

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

  // Slideshow refleksi sekeluarga — acak, berganti tiap 5 menit bila lebih dari 1,
  // kocok ulang tiap putaran penuh; hormati preferensi reduced motion.
  useEffect(() => {
    if (slide.list.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setSlide((s) => {
        if (s.list.length < 2) return s;
        const next = (s.idx + 1) % s.list.length;
        if (next !== 0) return { list: s.list, idx: next };
        const arr = [...s.list];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return { list: arr, idx: 0 };
      });
    }, 300000);
    return () => clearInterval(t);
  }, [slide.list.length]);

  useEffect(() => {
    // setState hanya di dalam kelanjutan async (pola fetch-on-mount yang diizinkan),
    // bukan sinkron di badan effect.
    void (async () => {
      const user = await getSessionUser(supabase);
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      setUserName((user.user_metadata?.name as string) ?? user.email?.split("@")[0] ?? "Ayah");
      const now = new Date();
      const today = localDateKey(now);
      const yesterday = localDateKey(daysAgoLocal(1, now));
      const thirtyAgo = localDateKey(daysAgoLocal(29, now));
      const ctx = await getFamilyContext(supabase, user.id);
      if (!ctx) { setLoading(false); return; }
      setRole(ctx.role);
      setMyHabits(ctx.habits);
      const familyMembers = ctx.members.map((m) => ({ user_id: m.user_id, role: m.role }));
      const userIds = ctx.members.map((m) => m.user_id);
      if (userIds.length === 0) { setLoading(false); return; }
      const habits = ctx.habits;
      const [{ data: todayEntries }, { data: yesterdayEntries }, { data: last30 }, { data: recentEntries }] = await Promise.all([
        supabase.from("mutabaah_entries").select("user_id,habit_id,value,status,context").eq("family_id", ctx.familyId).eq("date", today),
        supabase.from("mutabaah_entries").select("user_id,habit_id,value,status").eq("family_id", ctx.familyId).eq("date", yesterday),
        supabase.from("mutabaah_entries").select("user_id,date,value,habit_id,status,note").eq("family_id", ctx.familyId).gte("date", thirtyAgo),
        supabase.from("mutabaah_entries").select("user_id,habit_id,status,context,completed_at").eq("family_id", ctx.familyId).order("completed_at", { ascending: false }).limit(5),
      ]);
      const profileMap = new Map(ctx.members.map((m) => [m.user_id, m.name] as const));
      const myMap: Record<string, Entry> = {};
      ((todayEntries ?? []) as EntryRow[]).forEach((e) => {
        if (e.user_id !== user.id) return;
        myMap[e.habit_id] = { habitId: e.habit_id, value: Number(e.value), status: e.status, context: e.context ?? null };
      });
      setMyEntries(myMap);
      const todayMap = new Map(((todayEntries ?? []) as EntryRow[]).map((e) => [`${e.user_id}:${e.habit_id}`, e]));
      const yMap = new Map(((yesterdayEntries ?? []) as EntryRow[]).map((e) => [`${e.user_id}:${e.habit_id}`, e]));
      const last30Map = new Map(((last30 ?? []) as EntryRow[]).map((e) => [`${e.user_id}|${e.date}|${e.habit_id}`, e]));
      // Refleksi sekeluarga 30 hari terakhir via RPC (teks + nama saja, tanpa angka).
      // Gagal (mis. migrasi 011 belum jalan) → fallback ke milik sendiri.
      const toQuote = (userId: string, name: string, date: string, text: string) => {
        const [yy, mm, dd] = date.split("-").map(Number);
        return {
          userId,
          name,
          isMine: userId === user.id,
          date,
          label: new Date(yy, mm - 1, dd).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" }),
          text,
        };
      };
      const shuffle = <T,>(arr: T[]) => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };
      try {
        const { data: famQuotes } = await supabase.rpc("get_family_reflections", { p_family_id: ctx.familyId });
        const rows = ((famQuotes ?? []) as { user_id: string; name: string; date: string; note: string }[])
          .filter((r) => r.note?.trim())
          .slice(0, 24)
          .map((r) => toQuote(r.user_id, r.name, r.date, r.note.trim()));
        setSlide({ list: shuffle(rows).slice(0, 12), idx: 0 });
      } catch {
        const seenDates = new Set<string>();
        const fallback: { userId: string; name: string; isMine: boolean; date: string; label: string; text: string }[] = [];
        for (const e of ((last30 ?? []) as EntryRow[])) {
          const text = e.note?.trim() ?? "";
          if (e.user_id !== user.id || !text || seenDates.has(e.date)) continue;
          seenDates.add(e.date);
          fallback.push(toQuote(e.user_id, profileMap.get(e.user_id) ?? "Saya", e.date, text));
        }
        fallback.sort((a, b) => (a.date < b.date ? 1 : -1));
        setSlide({ list: shuffle(fallback).slice(0, 12), idx: 0 });
      }
      const memberStats: typeof members = [];
      let familySum = 0; let familySumYesterday = 0;
      let myDelta: number | null = null; let myActive = 0;
      for (const m of familyMembers ?? []) {
        const name = profileMap.get(m.user_id) ?? m.user_id.slice(0, 6);
        const items = (habits ?? []).map((h) => {
          const e = todayMap.get(`${m.user_id}:${h.id}`);
          return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0, status: e?.status };
        });
        const itemsY = (habits ?? []).map((h) => {
          const e = yMap.get(`${m.user_id}:${h.id}`);
          return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0, status: e?.status };
        });
        const prog = dailyProgress(items);
        const progY = dailyProgress(itemsY);
        familySum += prog; familySumYesterday += progY;
        const days: string[] = []; for (let i = 29; i >= 0; i--) days.push(localDateKey(daysAgoLocal(i, now)));
        const dailyVals = days.map((d) => {
          const itemsD = (habits ?? []).map((h) => { const e = last30Map.get(`${m.user_id}|${d}|${h.id}`); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0, status: e?.status }; });
          return dailyProgress(itemsD);
        });
        let streak = 0; for (let i = dailyVals.length - 1; i >= 0; i--) { if (isStreakDay(dailyVals[i])) streak++; else break; }
        if (m.user_id === user.id) {
          myDelta = prog - progY;
          myActive = dailyVals.slice(-7).filter((v) => v > 0).length;
        }
        memberStats.push({ id: m.user_id, name, progress: prog, streak, role: m.role });
      }
      const fp = memberStats.length ? Math.round(familySum / memberStats.length) : 0;
      const fpY = memberStats.length ? Math.round(familySumYesterday / memberStats.length) : 0;
      setMembers(memberStats);
      setFamilyProgress(fp);
      setDelta(memberStats.length ? fp - fpY : null);
      setSelfDelta(myDelta);
      setSelfActive(myActive);
      const weekDays: { day: string; value: number }[] = [];
      const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      for (let i = 6; i >= 0; i--) {
        const d = daysAgoLocal(i, now);
        const iso = localDateKey(d);
        const perMember = memberStats.map((_, idx) => {
          const uid = userIds[idx];
          const itemsD = (habits ?? []).map((h) => { const e = last30Map.get(`${uid}|${iso}|${h.id}`); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0, status: e?.status }; });
          return dailyProgress(itemsD);
        });
        weekDays.push({ day: dayNames[d.getDay()], value: perMember.length ? Math.round(perMember.reduce((a, b) => a + b, 0) / perMember.length) : 0 });
      }
      setWeekly(weekDays);
      const habitNameMap = new Map(habits.map((habit) => [habit.id, habit.name] as const));
      const recentList = ((recentEntries ?? []) as EntryRow[]).map((r) => {
        const name = profileMap.get(r.user_id) ?? "Anggota keluarga";
        const habitName = habitNameMap.get(r.habit_id) ?? "Mutabaah";
        const time = r.completed_at ? new Date(r.completed_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";
        if (r.status === "COMPLETED") return { name, act: r.context === "BERJAMAAH" ? `${habitName} — berjamaah di masjid, alhamdulillah` : `${habitName} selesai, alhamdulillah`, time, type: "completed" as const };
        if (r.status === "PARTIAL") return { name, act: `${habitName} sebagian terisi`, time, type: "pending" as const };
        return { name, act: `${habitName} menunggu diisi`, time, type: "pending" as const };
      });
      setRecent(recentList.length ? recentList : memberStats.map((m) => ({ name: m.name, act: m.progress > 0 ? "Mutabaah hari ini sudah terisi" : "Mutabaah hari ini menunggu diisi", time: "—", type: m.progress > 0 ? ("completed" as const) : ("pending" as const) })));
      setLoading(false);
    })();
  }, [supabase, dayKey]);

  // Catatan: isi-cepat kini ditangani komponen global QuickFillFab (AppShell).

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Memuat beranda">
        <div className="h-20 rounded-[24px] bg-muted" />
        <div className="h-36 rounded-[24px] bg-muted" />
        <div className="flex gap-4 overflow-hidden">
          <div className="h-32 w-64 rounded-2xl bg-muted shrink-0" />
          <div className="h-32 w-64 rounded-2xl bg-muted shrink-0" />
          <div className="h-32 w-64 rounded-2xl bg-muted shrink-0" />
        </div>
      </div>
    );
  }

  if (!members.length) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center rounded-[24px] border-dashed">
          <div className="h-14 w-14 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center mx-auto">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-bold text-lg mt-4">Mulai dari keluarga kecilmu</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-[36ch] mx-auto leading-6">Buat keluarga, undang anggota tersayang, lalu pilih target pertama bersama. Pelan-pelan, yang penting jalan terus.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/onboarding"><Button className="rounded-full">Buat Keluarga</Button></Link>
            <Link href="/gabung"><Button variant="secondary" className="rounded-full">Gabung pakai kode</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  const avgWeekly = weekly.length ? Math.round(weekly.reduce((a, b) => a + b.value, 0) / weekly.length) : 0;
  const activeDays = weekly.filter((d) => d.value > 0).length;
  const bestDay = weekly.reduce((best, cur) => (cur.value > best.value ? cur : best), weekly[0] ?? { day: "-", value: 0 });
  const filledCount = members.filter((m) => m.progress >= 70).length;
  const waitingCount = members.length - filledCount;
  const isMemberOnly = role === "MEMBER";
  const self = members.find((m) => userId != null && m.id === userId) ?? members.find((m) => m.name === userName) ?? members[0];
  const heroValue = isMemberOnly ? self.progress : familyProgress;
  const heroStreak = isMemberOnly ? self.streak : Math.max(...members.map((m) => m.streak), 0);
  const deltaView = isMemberOnly ? selfDelta : delta;
  const activeView = isMemberOnly ? selfActive : activeDays;

  const remainingMine = myHabits.filter((h) => (myEntries[h.id]?.status ?? "PENDING") !== "COMPLETED").length;

  return (
    <div className="space-y-6 pb-6 lg:pb-0 overflow-x-clip">
      {/* Sapaan — minimal */}
      <section aria-label="Sapaan">
        <p className="text-xs text-muted-foreground">{todayLabel}</p>
        <h1 className="text-[26px] font-bold tracking-tight mt-1 leading-tight">
          {greeting}, {userName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isMemberOnly
            ? self.progress >= 70
              ? "Alhamdulillah, sudah selesai hari ini."
              : "Satu ketukan kecil hari ini sudah cukup."
            : waitingCount === 0
              ? "Alhamdulillah, semua sudah mengisi."
              : `Tinggal ${waitingCount} belum mengisi.`}
        </p>
      </section>

      {/* Perjalanan hari ini — panel hijau tua, selaras dengan Progress */}
      <div className="rounded-[24px] p-6 text-white relative overflow-hidden bg-gradient-to-br from-[#1C5B40] via-[#17452F] to-[#102E21]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-12 -bottom-14 h-40 w-40 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-5">
          <ProgressRing
            value={heroValue}
            size={96}
            stroke={9}
            track="rgba(255,255,255,0.18)"
            bar="#E9D9A6"
            valueClassName="text-white"
            labelClassName="text-white/60"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/60">{isMemberOnly ? "Perjalananmu hari ini" : "Perjalanan keluarga hari ini"}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[30px] font-bold leading-none text-white tabular-nums">{heroValue}%</span>
              {deltaView !== null && deltaView !== 0 && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${deltaView > 0 ? "bg-white/15 text-white" : "bg-black/20 text-white/70"}`}>
                  {deltaView > 0 ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />} {deltaView > 0 ? "+" : ""}{deltaView}%
                </span>
              )}
            </div>
            <p className="text-xs text-white/70 mt-1.5 leading-5">
              {deltaView !== null && deltaView > 0
                ? "Naik dari kemarin, alhamdulillah."
                : deltaView !== null && deltaView < 0
                  ? "Sedikit di bawah kemarin — hari ini kesempatan baru."
                  : isMemberOnly
                    ? "Dibandingkan dengan dirimu kemarin."
                    : `${filledCount} dari ${members.length} anggota sudah mengisi.`}
            </p>
          </div>
        </div>
        <dl className="relative mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-[11px] text-white/60">Hari terisi</dt>
            <dd className="font-bold text-white mt-0.5 tabular-nums">{activeView}/7</dd>
          </div>
          <div className="border-x border-white/10">
            {showStreak ? (
              <>
                <dt className="text-[11px] text-white/60 flex items-center justify-center gap-1">
                  <Flame className="h-3 w-3" aria-hidden="true" /> Rangkaian
                </dt>
                <dd className="font-bold text-white mt-0.5 tabular-nums">{heroStreak} hari</dd>
              </>
            ) : (
              <>
                <dt className="text-[11px] text-white/60">Anggota</dt>
                <dd className="font-bold text-white mt-0.5 tabular-nums">{members.length}</dd>
              </>
            )}
          </div>
          <div>
            {isMemberOnly ? (
              <>
                <dt className="text-[11px] text-white/60">Tersisa</dt>
                <dd className="font-bold text-white mt-0.5 tabular-nums">{remainingMine} target</dd>
              </>
            ) : (
              <>
                <dt className="text-[11px] text-white/60">Sudah mengisi</dt>
                <dd className="font-bold text-white mt-0.5 tabular-nums">{filledCount}/{members.length}</dd>
              </>
            )}
          </div>
        </dl>
      </div>

      {/* Refleksi sekeluarga — slideshow kutipan acak, di bawah hero */}
      {slide.list.length > 0 && (
        <section aria-label="Refleksi keluarga" aria-live="polite">
          <Card className="rounded-[20px] p-5 bg-[var(--primary-soft)]/40 border-primary/10">
            <div className="flex items-start gap-3">
              <span className="h-9 w-9 rounded-xl bg-card border border-primary/10 flex items-center justify-center shrink-0" aria-hidden="true">
                <Quote className="h-4 w-4 text-primary" />
              </span>
              <div className="flex-1 min-w-0">
                <blockquote key={`${slide.idx % slide.list.length}-${slide.list[slide.idx % slide.list.length].date}`} className="text-[15px] leading-7 font-medium">
                  “{slide.list[slide.idx % slide.list.length].text}”
                </blockquote>
                <p className="text-xs text-muted-foreground mt-1.5 capitalize tabular-nums">
                  {slide.list[slide.idx % slide.list.length].isMine ? "Refleksimu" : slide.list[slide.idx % slide.list.length].name} · {slide.list[slide.idx % slide.list.length].label}
                </p>
              </div>
            </div>
            {slide.list.length > 1 && (
              <div className="mt-3 flex items-center justify-center gap-1.5" role="group" aria-label="Pilih refleksi">
                {slide.list.map((q, i) => (
                  <button
                    key={`${q.userId}-${q.date}`}
                    type="button"
                    onClick={() => setSlide((s) => ({ list: s.list, idx: i }))}
                    aria-label={`Tampilkan refleksi ${q.isMine ? "milikmu" : q.name}, ${q.label}`}
                    aria-pressed={i === slide.idx % slide.list.length}
                    className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i === slide.idx % slide.list.length ? "w-5 bg-primary" : "w-2 bg-black/15 hover:bg-black/25"}`}
                  />
                ))}
              </div>
            )}
          </Card>
        </section>
      )}

      {/* Anggota & kabar — hanya untuk orang tua; anak hanya melihat miliknya sendiri */}
      {!isMemberOnly && (
        <>
      {/* Anggota — daftar ringkas dalam satu kartu */}
      <section aria-label="Anggota keluarga">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" /> Anggota keluarga
          </h2>
          <Link href="/profil" className="text-xs font-medium text-primary inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-muted" aria-label="Kelola keluarga">
            Kelola ({members.length}) <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <Card className="rounded-[20px] p-2">
          <ul className="divide-y divide-border/60">
            {members.map((m) => {
              const done = m.progress >= 70;
              return (
                <li key={m.id}>
                  <Link
                    href={`/keluarga/anggota/${m.id}`}
                    aria-label={`Lihat progres ${m.name}, ${m.progress} persen terisi`}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="h-10 w-10 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center font-bold text-primary text-sm shrink-0" aria-hidden="true">
                      {m.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-sm leading-none truncate">{m.name}</span>
                      <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={`h-1.5 w-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
                        {done ? "Sudah mengisi" : "Belum mengisi"}
                        {showStreak && m.streak > 0 ? ` · ${m.streak} hari` : ""}
                      </span>
                    </span>
                    <span className={`text-sm font-bold tabular-nums ${done ? "text-primary" : "text-muted-foreground"}`}>{m.progress}%</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

          {/* Minggu ini + kabar — reflektif, bukan kompetitif */}
          <div className="grid lg:grid-cols-3 gap-6 min-w-0">
        <Card className="rounded-[20px] p-5 lg:col-span-2 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-sm">Perjalanan minggu ini</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Rata-rata {avgWeekly}% · {activeDays}/7 hari terisi</p>
            </div>
            <Link href="/progress" className="text-xs font-medium text-primary inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-1 hover:bg-muted" aria-label="Lihat semua progress mingguan">
              Lihat semua <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 flex items-end gap-1.5" role="img" aria-label={`Perjalanan minggu ini, rata-rata ${avgWeekly} persen`}>
            {weekly.map((d, i) => {
              const max = Math.max(...weekly.map((w) => w.value));
              const isBest = d.value === max && d.value > 0;
              const isToday = i === weekly.length - 1;
              return (
                <div key={d.day + i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <div
                    className={`w-full max-w-[28px] rounded-full overflow-hidden flex items-end transition-colors ${isBest ? "bg-[var(--primary-soft)]" : "bg-muted"}`}
                    style={{ height: "52px" }}
                  >
                    <div
                      className={`w-full rounded-full transition-all duration-700 ${d.value === 0 ? "bg-transparent" : isBest ? "bg-primary" : "bg-primary/40"}`}
                      style={{ height: `${Math.max(d.value, d.value > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className={`text-[11px] leading-none px-1.5 py-0.5 rounded-full ${isToday ? "font-semibold text-primary bg-[var(--primary-soft)]" : isBest ? "font-medium text-primary" : "text-muted-foreground"}`}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
          {bestDay.value > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">Hari paling terisi: <span className="font-medium text-foreground">{bestDay.day} ({bestDay.value}%)</span> — masyaAllah.</p>
          )}
        </Card>

        <Card className="rounded-[20px] p-5 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Kabar terbaru</h3>
            {waitingCount > 0 && (
              <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">{waitingCount} menunggu</span>
            )}
          </div>
          <div className="mt-4">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground leading-6">Belum ada kabar. Nanti setiap isian akan muncul di sini sebagai pengingat kebaikan.</p>
            ) : (
              <ul className="relative space-y-0">
                <span className="absolute left-[3px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />
                {recent.slice(0, 3).map((a, i) => (
                  <li key={i} className="relative flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ring-4 ring-card ${a.type === "completed" ? "bg-emerald-500" : "bg-amber-500"}`}
                      aria-hidden="true"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm leading-tight truncate">
                        <span className="font-medium">{a.name}</span>
                        <span className="text-muted-foreground"> · {a.act}</span>
                      </span>
                    </span>
                    {a.time && a.time !== "—" && (
                      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 mt-0.5">{a.time}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`mt-4 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs leading-6 border ${waitingCount ? "bg-muted/60 border-border/60 text-muted-foreground" : "bg-[var(--primary-soft)]/50 border-primary/10 text-primary"}`}>
            {waitingCount ? (
              <>
                <Bell className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Belum semua terisi hari ini — tidak apa-apa.{" "}
                  <Link href="/keluarga/anggota" className="font-medium underline underline-offset-2">
                    Ingatkan dengan lembut
                  </Link>
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Alhamdulillah, semua sudah mengisi hari ini.</span>
              </>
            )}
          </div>
        </Card>
          </div>
        </>
      )}

      {isMemberOnly && (
        <Card className="rounded-[20px] p-5">
          <h2 className="font-semibold text-sm">Hari ini, satu langkah</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-5">
            {remainingMine === 0 ? "Alhamdulillah, semua sudah terisi. Semoga istiqamah." : `Tinggal ${remainingMine} target lagi — mulai dari yang terdekat.`}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/mutabaah" className="flex items-center justify-center gap-1 rounded-full bg-primary text-white text-sm font-medium px-4 py-3 min-h-[44px]">
              Isi mutabaah
            </Link>
            <Link href="/progress" className="flex items-center justify-center gap-1 rounded-full border bg-card text-sm font-medium px-4 py-3 min-h-[44px] hover:bg-muted">
              Perjalananku
            </Link>
          </div>
        </Card>
      )}

      {/* FAB isi-cepat global dari AppShell (QuickFillFab) */}
    </div>
  );
}
