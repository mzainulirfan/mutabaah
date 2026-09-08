"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/app/progress-ring";
import { Flame, ChevronRight, CheckCircle2, Clock3, Users, Sparkles, ArrowRight, CalendarDays, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { dailyProgress, isStreakDay } from "@/lib/progress";

export default function BerandaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [familyName, setFamilyName] = useState("Keluarga");
  const [role, setRole] = useState<string>("OWNER");
  const [userName, setUserName] = useState("Ayah");
  const [members, setMembers] = useState<{ id: string; name: string; progress: number; streak: number; role: string }[]>([]);
  const [familyProgress, setFamilyProgress] = useState(0);
  const [delta, setDelta] = useState<number | null>(null);
  const [weekly, setWeekly] = useState<{ day: string; value: number }[]>([]);
  const [recent, setRecent] = useState<{ name: string; act: string; time: string; type: "completed" | "pending" }[]>([]);
  const [todayLabel, setTodayLabel] = useState("");
  const [greeting, setGreeting] = useState("Selamat pagi");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 11) setGreeting("Selamat pagi");
    else if (h < 15) setGreeting("Selamat siang");
    else if (h < 18) setGreeting("Selamat sore");
    else setGreeting("Selamat malam");
    setTodayLabel(new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
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
          { name: "Ahmad", act: "Tilawah selesai", time: "05:42", type: "completed" },
          { name: "Aisyah", act: "Dzikir pagi selesai", time: "06:10", type: "completed" },
          { name: "Yusuf", act: "Belum isi hari ini", time: "—", type: "pending" },
        ]);
        setFamilyName("Keluarga Ahmad");
        setRole("OWNER");
        setUserName("Ayah");
        setLoading(false);
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      setUserName((auth.user.user_metadata?.name as string) ?? auth.user.email?.split("@")[0] ?? "Ayah");
      const { data: membership } = await supabase.from("mutabaah_family_members").select("family_id,role").eq("user_id", auth.user.id).maybeSingle();
      if (!membership) { setLoading(false); return; }
      setRole(membership.role);
      // Parallelize: family + members (2) → then all data in parallel (5 queries → ~600ms vs 1.5s seq)
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
      // Index entries for O(1) lookup (was Array.find inside nested loops)
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
      // recentEntries already fetched in parallel above — reuse
      const habitIds = (recentEntries ?? []).map((r: any) => r.habit_id);
      const { data: habitNames } = habitIds.length ? await supabase.from("mutabaah_habits").select("id,name").in("id", habitIds) : { data: [] as any[] };
      const habitNameMap = new Map((habitNames ?? []).map((h: any) => [h.id, h.name]));
      const recentList = (recentEntries ?? []).map((r: any) => {
        const name = (profileMap.get(r.user_id) as string) ?? "Anggota";
        const act = habitNameMap.get(r.habit_id) ?? r.habit_id.slice(0, 6);
        const time = r.completed_at ? new Date(r.completed_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";
        return { name, act: r.status === "COMPLETED" ? `${act} selesai` : `${act} ${r.status}`, time, type: (r.status === "COMPLETED" ? "completed" : "pending") as "completed" | "pending" };
      });
      setRecent(recentList.length ? recentList : memberStats.map((m) => ({ name: m.name, act: m.progress ? "Mutabaah terisi" : "Belum isi hari ini", time: "—", type: m.progress ? ("completed" as const) : ("pending" as const) })));
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
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
          <h2 className="font-bold text-lg mt-4">Belum ada keluarga</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-[32ch] mx-auto">Buat keluarga untuk mulai mutabaah bersama. Cukup 1 langkah.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/onboarding"><Button className="rounded-full">Buat Keluarga</Button></Link>
            <Link href="/login"><Button variant="secondary" className="rounded-full">Masuk</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  const avgWeekly = weekly.length ? Math.round(weekly.reduce((a, b) => a + b.value, 0) / weekly.length) : 0;
  const activeDays = weekly.filter((d) => d.value > 0).length;
  const bestDay = weekly.reduce((best, cur) => (cur.value > best.value ? cur : best), weekly[0] ?? { day: "-", value: 0 });
  const pendingCount = members.filter((m) => m.progress < 70).length;
  const isMemberOnly = role === "MEMBER";
  const self = members.find((m) => m.name === userName) ?? members[0];

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Greeting — role aware */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-primary border border-primary/10">
            <CalendarDays className="h-3.5 w-3.5" /> {todayLabel} • {isMemberOnly ? "Mode Anggota" : familyName}
          </div>
          <h1 className="text-[26px] font-bold tracking-tight mt-3 leading-none">
            {greeting}, {isMemberOnly ? userName : familyName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {isMemberOnly ? (self.progress >= 70 ? "Konsisten hari ini — lanjutkan besok 🌿" : `Masih ada target yang belum diisi hari ini.`) : pendingCount === 0 ? "Alhamdulillah, semua anggota konsisten hari ini 🌿" : `Masih ada ${pendingCount} anggota yang perlu perhatian.`}
          </p>
        </div>
        <Link href="/mutabaah" className="hidden lg:block">
          <Button size="lg" className="rounded-full shadow-sm">
            Isi Mutabaah <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Hero — 2 kolom, ringkas */}
      <Card className="rounded-[24px] p-6">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <ProgressRing value={isMemberOnly ? self.progress : familyProgress} size={112} stroke={10} />
          <div className="flex-1 text-center lg:text-left min-w-0">
            <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{isMemberOnly ? "Progress kamu" : "Progress keluarga"}</div>
            <div className="flex items-center gap-2 justify-center lg:justify-start mt-1">
              <span className="text-[28px] font-bold leading-none">{isMemberOnly ? self.progress : familyProgress}%</span>
              {delta !== null && delta !== 0 && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${delta > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {delta > 0 ? "+" : ""}{delta}%
                </span>
              )}
              {delta === 0 && <span className="text-xs text-muted-foreground">stabil vs kemarin</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isMemberOnly ? `${self.streak} hari streak • ${self.progress >= 70 ? "konsisten" : "perlu perhatian"}` : `Rata-rata ${members.length} anggota • ${members.filter((m) => m.progress >= 70).length} konsisten`}
            </p>
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all duration-700" style={{ width: `${isMemberOnly ? self.progress : familyProgress}%` }} />
            </div>
            {!isMemberOnly && (
              <div className="mt-4 flex items-center gap-2 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {members.slice(0, 4).map((m) => (
                    <div key={m.id} className="h-8 w-8 rounded-full bg-[var(--primary-soft)] border-2 border-white flex items-center justify-center text-xs font-semibold text-primary">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {members.length > 4 && <div className="h-8 w-8 rounded-full bg-muted border-2 border-white flex items-center justify-center text-xs font-medium">+{members.length - 4}</div>}
                </div>
                <span className="text-xs text-muted-foreground">{familyName}</span>
              </div>
            )}
          </div>
          {/* 2 mini stat — bukan 3 */}
          <div className="grid grid-cols-2 gap-3 w-full lg:w-[280px]">
            <div className="rounded-2xl bg-muted p-4 text-center">
              <div className="text-xs text-muted-foreground">Hari aktif</div>
              <div className="font-bold text-lg">{activeDays}/7</div>
              <div className="text-[11px] text-muted-foreground">minggu ini</div>
            </div>
            <div className="rounded-2xl bg-[var(--primary-soft)] p-4 text-center border border-primary/10">
              <div className="text-xs text-primary flex items-center justify-center gap-1">
                <Flame className="h-3 w-3" /> Streak
              </div>
              <div className="font-bold text-primary text-lg">{isMemberOnly ? self.streak : Math.max(...members.map((m) => m.streak), 0)} hari</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Members — horizontal scroll mobile, grid desktop */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" /> {isMemberOnly ? "Keluarga" : "Anggota keluarga"}
          </h2>
          <Link href={isMemberOnly ? "/progress" : "/keluarga"} className="text-xs font-medium text-primary">
            {isMemberOnly ? "Progress →" : "Kelola →"}
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible scrollbar-none">
          {members.map((m) => {
            const isGood = m.progress >= 70;
            return (
              <Link key={m.id} href="/mutabaah" className="snap-start shrink-0 w-[260px] lg:w-auto group rounded-[20px] border bg-card p-4 hover:shadow-soft hover:border-primary/15 transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center font-bold text-primary text-sm">{m.name.slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm leading-none truncate">
                      {m.name} {m.role !== "MEMBER" && <span className="text-[10px] font-medium text-muted-foreground">• {m.role}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                      <span className={`h-2 w-2 rounded-full ${isGood ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {isGood ? "Konsisten" : "Perlu perhatian"}
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${isGood ? "bg-[var(--primary-soft)] text-primary" : "bg-amber-50 text-amber-700"}`}>{m.progress}%</span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1.5">
                    <span>Hari ini</span>
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" /> {m.streak} hari
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full transition-all ${isGood ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${m.progress}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Weekly + Recent */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="rounded-[20px] p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Minggu ini</h3>
            <Link href="/progress" className="text-xs font-medium text-primary flex items-center gap-1">
              Detail <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-5 flex items-end gap-2 h-[88px]">
            {weekly.map((d, i) => {
              const isBest = d.value === Math.max(...weekly.map((w) => w.value)) && d.value > 0;
              return (
                <div key={d.day + i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full rounded-full bg-muted overflow-hidden flex items-end" style={{ height: "64px" }}>
                    <div className={`w-full rounded-full transition-all duration-700 ${isBest ? "bg-primary" : "bg-primary/70"}`} style={{ height: `${d.value}%` }} />
                  </div>
                  <span className={`text-[11px] font-medium ${isBest ? "text-primary" : "text-muted-foreground"}`}>{d.day}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>Rata-rata {avgWeekly}%</span>
            <span>{activeDays}/7 hari aktif</span>
          </div>
        </Card>

        <Card className="rounded-[20px] p-5">
          <h3 className="font-semibold text-sm">Aktivitas terbaru</h3>
          <div className="mt-4 space-y-3">
            {recent.slice(0, 3).map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${a.type === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"}`}>
                  {a.type === "completed" ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight truncate">{a.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {a.act} {a.time ? `• ${a.time}` : ""}
                  </div>
                </div>
              </div>
            ))}
            {recent.length === 0 && <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>}
          </div>
          <div className={`mt-4 rounded-2xl p-3 text-xs leading-5 border ${pendingCount ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"}`}>
            {pendingCount ? (
              <>
                <span className="font-semibold">Pengingat lembut:</span> Masih ada {pendingCount} anggota belum isi.
              </>
            ) : (
              <>🌿 Alhamdulillah, semua sudah mengisi hari ini.</>
            )}
          </div>
        </Card>
      </div>

      {/* FAB — ganti quick actions */}
      <Link href="/mutabaah" className="lg:hidden fixed bottom-[88px] right-4 z-20 rounded-full bg-primary text-white shadow-lg px-5 py-3 flex items-center gap-2 font-medium active:scale-95 transition-transform">
        <Sparkles className="h-4 w-4" /> Isi Hari Ini
      </Link>
    </div>
  );
}
