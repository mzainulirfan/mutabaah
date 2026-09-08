"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/app/progress-ring";
import { Flame, ChevronRight, CheckCircle2, Users, Sparkles, TrendingUp, TrendingDown, Bell } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { dailyProgress, isStreakDay } from "@/lib/progress";

export default function BerandaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [familyName, setFamilyName] = useState("Keluarga");
  const [role, setRole] = useState<string>("OWNER");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Ayah");
  const [members, setMembers] = useState<{ id: string; name: string; progress: number; streak: number; role: string }[]>([]);
  const [familyProgress, setFamilyProgress] = useState(0);
  const [delta, setDelta] = useState<number | null>(null);
  const [weekly, setWeekly] = useState<{ day: string; value: number }[]>([]);
  const [recent, setRecent] = useState<{ name: string; act: string; time: string; type: "completed" | "pending" }[]>([]);
  const [todayLabel, setTodayLabel] = useState("");
  const [greeting, setGreeting] = useState("Selamat pagi");
  const [showStreak, setShowStreak] = useState(true);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 11) setGreeting("Selamat pagi");
    else if (h < 15) setGreeting("Selamat siang");
    else if (h < 18) setGreeting("Selamat sore");
    else setGreeting("Selamat malam");
    setTodayLabel(new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    try {
      setShowStreak(localStorage.getItem("mutabaah:streak") !== "0");
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        const { members: mockMembers, weeklyData } = await import("@/lib/mock-data");
        setMembers(mockMembers.map((m) => ({ id: m.id, name: m.name, progress: m.progress, streak: m.streak, role: m.id === "m1" ? "OWNER" : "MEMBER" })));
        setFamilyProgress(78);
        setDelta(3);
        setWeekly(weeklyData);
        setRecent([
          { name: "Ahmad", act: "Tilawah selesai, alhamdulillah", time: "05:42", type: "completed" },
          { name: "Aisyah", act: "Dzikir pagi selesai, alhamdulillah", time: "06:10", type: "completed" },
          { name: "Yusuf", act: "Mutabaah hari ini menunggu diisi", time: "—", type: "pending" },
        ]);
        setFamilyName("Keluarga Ahmad");
        setRole("OWNER");
        setUserId("m1");
        setUserName("Ayah");
        setLoading(false);
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      setUserId(auth.user.id);
      setUserName((auth.user.user_metadata?.name as string) ?? auth.user.email?.split("@")[0] ?? "Ayah");
      const { data: membership } = await supabase.from("mutabaah_family_members").select("family_id,role").eq("user_id", auth.user.id).maybeSingle();
      if (!membership) { setLoading(false); return; }
      setRole(membership.role);
      const [{ data: family }, { data: familyMembers }] = await Promise.all([
        supabase.from("mutabaah_families").select("name").eq("id", membership.family_id).single(),
        supabase.from("mutabaah_family_members").select("user_id,role").eq("family_id", membership.family_id),
      ]);
      if (family) setFamilyName(family.name);
      const userIds = (familyMembers ?? []).map((m: any) => m.user_id);
      if (userIds.length === 0) { setLoading(false); return; }
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const thirtyAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
      const [{ data: profiles }, { data: habits }, { data: todayEntries }, { data: yesterdayEntries }, { data: last30 }, { data: recentEntries }] = await Promise.all([
        supabase.from("mutabaah_profiles").select("id,name").in("id", userIds),
        supabase.from("mutabaah_habits").select("id,target_value,type").eq("family_id", membership.family_id).eq("is_active", true),
        supabase.from("mutabaah_entries").select("user_id,habit_id,value,status").in("user_id", userIds).eq("date", today),
        supabase.from("mutabaah_entries").select("user_id,habit_id,value,status").in("user_id", userIds).eq("date", yesterday),
        supabase.from("mutabaah_entries").select("user_id,date,value,habit_id,status").in("user_id", userIds).gte("date", thirtyAgo),
        supabase.from("mutabaah_entries").select("user_id,habit_id,status,completed_at").in("user_id", userIds).order("completed_at", { ascending: false }).limit(5),
      ]);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.name]));
      const todayMap = new Map((todayEntries ?? []).map((e: any) => [`${e.user_id}:${e.habit_id}`, e]));
      const yMap = new Map((yesterdayEntries ?? []).map((e: any) => [`${e.user_id}:${e.habit_id}`, e]));
      const last30Map = new Map((last30 ?? []).map((e: any) => [`${e.user_id}|${e.date}|${e.habit_id}`, e]));
      const memberStats: typeof members = [];
      let familySum = 0; let familySumYesterday = 0;
      for (const m of familyMembers ?? []) {
        const name = (profileMap.get(m.user_id) as string) ?? m.user_id.slice(0, 6);
        const items = (habits ?? []).map((h: any) => {
          const e: any = todayMap.get(`${m.user_id}:${h.id}`);
          return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 };
        });
        const itemsY = (habits ?? []).map((h: any) => {
          const e: any = yMap.get(`${m.user_id}:${h.id}`);
          return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 };
        });
        const prog = dailyProgress(items);
        const progY = dailyProgress(itemsY);
        familySum += prog; familySumYesterday += progY;
        const days: string[] = []; for (let i = 29; i >= 0; i--) days.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
        const dailyVals = days.map((d) => {
          const itemsD = (habits ?? []).map((h: any) => { const e: any = last30Map.get(`${m.user_id}|${d}|${h.id}`); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 }; });
          return dailyProgress(itemsD);
        });
        let streak = 0; for (let i = dailyVals.length - 1; i >= 0; i--) { if (isStreakDay(dailyVals[i])) streak++; else break; }
        memberStats.push({ id: m.user_id, name, progress: prog, streak, role: m.role });
      }
      const fp = memberStats.length ? Math.round(familySum / memberStats.length) : 0;
      const fpY = memberStats.length ? Math.round(familySumYesterday / memberStats.length) : 0;
      setMembers(memberStats);
      setFamilyProgress(fp);
      setDelta(memberStats.length ? fp - fpY : null);
      const weekDays: { day: string; value: number }[] = [];
      const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const iso = d.toISOString().slice(0, 10);
        const perMember = memberStats.map((_, idx) => {
          const uid = userIds[idx];
          const itemsD = (habits ?? []).map((h: any) => { const e: any = last30Map.get(`${uid}|${iso}|${h.id}`); return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 }; });
          return dailyProgress(itemsD);
        });
        weekDays.push({ day: dayNames[d.getDay()], value: perMember.length ? Math.round(perMember.reduce((a, b) => a + b, 0) / perMember.length) : 0 });
      }
      setWeekly(weekDays);
      const habitIds = (recentEntries ?? []).map((r: any) => r.habit_id);
      const { data: habitNames } = habitIds.length ? await supabase.from("mutabaah_habits").select("id,name").in("id", habitIds) : { data: [] as any[] };
      const habitNameMap = new Map((habitNames ?? []).map((h: any) => [h.id, h.name]));
      const recentList = (recentEntries ?? []).map((r: any) => {
        const name = (profileMap.get(r.user_id) as string) ?? "Anggota keluarga";
        const habitName = habitNameMap.get(r.habit_id) ?? "Mutabaah";
        const time = r.completed_at ? new Date(r.completed_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";
        if (r.status === "COMPLETED") return { name, act: `${habitName} selesai, alhamdulillah`, time, type: "completed" as const };
        if (r.status === "PARTIAL") return { name, act: `${habitName} sebagian terisi`, time, type: "pending" as const };
        return { name, act: `${habitName} menunggu diisi`, time, type: "pending" as const };
      });
      setRecent(recentList.length ? recentList : memberStats.map((m) => ({ name: m.name, act: m.progress > 0 ? "Mutabaah hari ini sudah terisi" : "Mutabaah hari ini menunggu diisi", time: "—", type: m.progress > 0 ? ("completed" as const) : ("pending" as const) })));
      setLoading(false);
    })();
  }, [supabase]);

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
            <Link href="/login"><Button variant="secondary" className="rounded-full">Saya sudah punya akun</Button></Link>
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

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
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

      {/* Perjalanan hari ini — panel hijau tua, tidak lagi dominan putih */}
      <div className="rounded-[24px] p-6 text-white relative overflow-hidden bg-gradient-to-br from-[#1C5B40] via-[#17452F] to-[#102E21]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-12 -bottom-14 h-52 w-52 rounded-full bg-black/10" aria-hidden="true" />
        <div className="relative flex flex-col lg:flex-row items-center gap-6">
          <ProgressRing
            value={heroValue}
            size={112}
            stroke={10}
            track="rgba(255,255,255,0.18)"
            bar="#E9D9A6"
            valueClassName="text-white"
            labelClassName="text-white/60"
          />
          <div className="flex-1 text-center lg:text-left min-w-0">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/60">{isMemberOnly ? "Perjalananmu hari ini" : "Perjalanan keluarga hari ini"}</p>
            <div className="flex items-center gap-2 justify-center lg:justify-start mt-1">
              <span className="text-[28px] font-bold leading-none text-white">{heroValue}%</span>
              {delta !== null && delta !== 0 && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${delta > 0 ? "bg-white/15 text-white" : "bg-black/20 text-white/70"}`}>
                  {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {delta > 0 ? "+" : ""}{delta}% dari kemarin
                </span>
              )}
              {delta === 0 && <span className="text-xs text-white/60">sama seperti kemarin</span>}
            </div>
            <p className="text-sm text-white/70 mt-2 leading-6">
              {delta !== null && delta > 0
                ? "Alhamdulillah, ada kemajuan kecil dari kemarin."
                : delta !== null && delta < 0
                  ? "Sedikit lebih rendah dari kemarin — tidak apa-apa, hari ini kesempatan baru."
                  : isMemberOnly
                    ? `${self.streak > 0 ? `${self.streak} hari berturut-turut terisi. ` : ""}Dibandingkan dengan dirimu kemarin, bukan dengan orang lain.`
                    : `${filledCount} dari ${members.length} anggota sudah mengisi hari ini.`}
            </p>
            <div className="mt-4 h-2 rounded-full bg-white/15 overflow-hidden" role="progressbar" aria-valuenow={heroValue} aria-valuemin={0} aria-valuemax={100} aria-label="Kemajuan hari ini">
              <div className="h-full bg-[#E9D9A6] transition-all duration-700" style={{ width: `${heroValue}%` }} />
            </div>
            {!isMemberOnly && (
              <div className="mt-4 flex items-center gap-2 justify-center lg:justify-start">
                <div className="flex -space-x-2" aria-hidden="true">
                  {members.slice(0, 4).map((m) => (
                    <div key={m.id} className="h-8 w-8 rounded-full bg-white/15 border-2 border-[#17452F] flex items-center justify-center text-xs font-semibold text-white">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {members.length > 4 && <div className="h-8 w-8 rounded-full bg-black/25 border-2 border-[#17452F] flex items-center justify-center text-xs font-medium text-white">+{members.length - 4}</div>}
                </div>
                <span className="text-xs text-white/60">{familyName} · melangkah bersama, bukan berlomba</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 w-full lg:w-[280px]">
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <div className="text-xs text-white/60">Hari terisi</div>
              <div className="font-bold text-lg text-white">{activeDays}/7</div>
              <div className="text-[11px] text-white/60">minggu ini</div>
            </div>
            {showStreak ? (
              <div className="rounded-2xl bg-white/10 p-4 text-center">
                <div className="text-xs text-white/80 flex items-center justify-center gap-1">
                  <Flame className="h-3 w-3" /> Rangkaian
                </div>
                <div className="font-bold text-white text-lg">{heroStreak} hari</div>
                <div className="text-[11px] text-white/60">berturut-turut</div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white/10 p-4 text-center">
                <div className="text-xs text-white/60">Anggota</div>
                <div className="font-bold text-lg text-white">{members.length}</div>
                <div className="text-[11px] text-white/60">dalam keluarga</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Anggota — daftar ringkas dalam satu kartu */}
      <section aria-label="Anggota keluarga">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" /> Anggota keluarga
          </h2>
          <Link href={isMemberOnly ? "/progress" : "/keluarga"} className="text-xs font-medium text-primary inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-muted" aria-label={isMemberOnly ? "Lihat perjalananku" : "Kelola keluarga"}>
            {isMemberOnly ? "Perjalananku" : `Kelola (${members.length})`} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <Card className="rounded-[20px] p-2">
          <ul className="divide-y divide-border/60">
            {members.map((m) => {
              const done = m.progress >= 70;
              return (
                <li key={m.id}>
                  <Link
                    href="/mutabaah"
                    aria-label={`Lihat mutabaah ${m.name}, ${m.progress} persen terisi`}
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
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="rounded-[20px] p-5 lg:col-span-2">
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

        <Card className="rounded-[20px] p-5">
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
                  <Link href="/keluarga" className="font-medium underline underline-offset-2">
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

      <Link href="/mutabaah" className="lg:hidden fixed bottom-[88px] right-4 z-20 rounded-full bg-primary text-white shadow-lg px-5 py-3 flex items-center gap-2 font-medium active:scale-95 transition-transform" aria-label="Isi mutabaah hari ini">
        <Sparkles className="h-4 w-4" /> Isi Hari Ini
      </Link>
    </div>
  );
}
