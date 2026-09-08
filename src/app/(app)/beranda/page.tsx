"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/app/progress-ring";
import { Flame, ChevronRight, CheckCircle2, Clock3, Users, Sparkles, ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { dailyProgress, isStreakDay } from "@/lib/progress";

export default function BerandaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [familyName, setFamilyName] = useState("Keluarga");
  const [members, setMembers] = useState<{ id: string; name: string; progress: number; streak: number }[]>([]);
  const [familyProgress, setFamilyProgress] = useState(0);
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
        setMembers(mockMembers.map((m) => ({ id: m.id, name: m.name, progress: m.progress, streak: m.streak })));
        setFamilyProgress(78);
        setWeekly(weeklyData);
        setRecent([
          { name: "Ahmad", act: "Tilawah selesai", time: "05:42", type: "completed" },
          { name: "Aisyah", act: "Dzikir pagi selesai", time: "06:10", type: "completed" },
          { name: "Yusuf", act: "Belum isi hari ini", time: "—", type: "pending" },
        ]);
        setFamilyName("Keluarga Ahmad");
        setLoading(false);
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      const { data: membership } = await supabase.from("mutabaah_family_members").select("family_id").eq("user_id", auth.user.id).maybeSingle();
      if (!membership) {
        setLoading(false);
        return;
      }
      const { data: family } = await supabase.from("mutabaah_families").select("name").eq("id", membership.family_id).single();
      if (family) setFamilyName(family.name);
      const { data: familyMembers } = await supabase.from("mutabaah_family_members").select("user_id,role").eq("family_id", membership.family_id);
      const userIds = (familyMembers ?? []).map((m: any) => m.user_id);
      const { data: profiles } = await supabase.from("mutabaah_profiles").select("id,name").in("id", userIds);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.name]));
      const { data: habits } = await supabase.from("mutabaah_habits").select("id,target_value,type").eq("family_id", membership.family_id).eq("is_active", true);
      const today = new Date().toISOString().slice(0, 10);
      const { data: todayEntries } = await supabase.from("mutabaah_entries").select("user_id,habit_id,value,status").in("user_id", userIds).eq("date", today);
      const thirtyAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
      const { data: last30 } = await supabase.from("mutabaah_entries").select("user_id,date,value,habit_id,status").in("user_id", userIds).gte("date", thirtyAgo);
      const memberStats: typeof members = [];
      let familySum = 0;
      for (const m of familyMembers ?? []) {
        const name = (profileMap.get(m.user_id) as string) ?? m.user_id.slice(0, 6);
        const items = (habits ?? []).map((h: any) => {
          const e = (todayEntries ?? []).find((x: any) => x.user_id === m.user_id && x.habit_id === h.id);
          return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 };
        });
        const prog = dailyProgress(items);
        familySum += prog;
        const days: string[] = [];
        for (let i = 29; i >= 0; i--) days.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
        const dailyVals = days.map((d) => {
          const itemsD = (habits ?? []).map((h: any) => {
            const e = (last30 ?? []).find((x: any) => x.user_id === m.user_id && x.date === d && x.habit_id === h.id);
            return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 };
          });
          return dailyProgress(itemsD);
        });
        let streak = 0;
        for (let i = dailyVals.length - 1; i >= 0; i--) {
          if (isStreakDay(dailyVals[i])) streak++;
          else break;
        }
        memberStats.push({ id: m.user_id, name, progress: prog, streak });
      }
      setMembers(memberStats);
      setFamilyProgress(memberStats.length ? Math.round(familySum / memberStats.length) : 0);
      const weekDays: { day: string; value: number }[] = [];
      const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const iso = d.toISOString().slice(0, 10);
        const perMember = memberStats.map((_, idx) => {
          const uid = userIds[idx];
          const itemsD = (habits ?? []).map((h: any) => {
            const e = (last30 ?? []).find((x: any) => x.user_id === uid && x.date === iso && x.habit_id === h.id);
            return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 };
          });
          return dailyProgress(itemsD);
        });
        const avg = perMember.length ? Math.round(perMember.reduce((a, b) => a + b, 0) / perMember.length) : 0;
        weekDays.push({ day: dayNames[d.getDay()], value: avg });
      }
      setWeekly(weekDays);
      const { data: recentEntries } = await supabase.from("mutabaah_entries").select("user_id,habit_id,status,completed_at").in("user_id", userIds).order("completed_at", { ascending: false }).limit(5);
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
        <div className="h-28 rounded-[24px] bg-muted" />
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="h-36 rounded-2xl bg-muted" />
          <div className="h-36 rounded-2xl bg-muted" />
          <div className="h-36 rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!members.length) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center rounded-[24px]">
          <Sparkles className="h-8 w-8 mx-auto text-primary" />
          <h2 className="font-bold text-lg mt-3">Belum ada keluarga</h2>
          <p className="text-sm text-muted-foreground mt-1">Buat keluarga dulu untuk melihat progress.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/onboarding">
              <Button>Buat Keluarga</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary">Masuk</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const avgWeekly = weekly.length ? Math.round(weekly.reduce((a, b) => a + b.value, 0) / weekly.length) : 0;
  const activeDays = weekly.filter((d) => d.value > 0).length;
  const bestDay = weekly.reduce((best, cur) => (cur.value > best.value ? cur : best), weekly[0] ?? { day: "-", value: 0 });
  const pendingCount = members.filter((m) => m.progress < 70).length;

  return (
    <div className="space-y-6">
      {/* Header hero */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-primary border border-primary/10">
            <CalendarDays className="h-3.5 w-3.5" /> {todayLabel}
          </div>
          <h1 className="text-[26px] font-bold tracking-tight mt-3 leading-none">
            {greeting}, {familyName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {pendingCount === 0 ? "Alhamdulillah, semua anggota konsisten hari ini 🌿" : `Masih ada ${pendingCount} anggota yang perlu perhatian hari ini.`}
          </p>
        </div>
        <Link href="/mutabaah">
          <Button size="lg" className="rounded-full shadow-sm">
            Isi Mutabaah Hari Ini <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Family progress hero */}
      <Card className="rounded-[24px] p-6 lg:p-7">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <ProgressRing value={familyProgress} size={112} stroke={10} />
          <div className="flex-1 text-center lg:text-left">
            <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Progress keluarga</div>
            <div className="text-[28px] font-bold leading-none mt-1">{familyProgress}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              Rata-rata dari {members.length} anggota • {members.filter((m) => m.progress >= 70).length} konsisten
            </p>
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all duration-700" style={{ width: `${familyProgress}%` }} />
            </div>
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
          </div>
          <div className="grid grid-cols-3 gap-3 w-full lg:w-[320px]">
            <div className="rounded-2xl bg-muted p-4 text-center">
              <div className="text-xs text-muted-foreground">Rata-rata</div>
              <div className="font-bold text-lg">{avgWeekly}%</div>
              <div className="text-[11px] text-muted-foreground">mingguan</div>
            </div>
            <div className="rounded-2xl bg-muted p-4 text-center">
              <div className="text-xs text-muted-foreground">Hari aktif</div>
              <div className="font-bold text-lg">{activeDays}/7</div>
            </div>
            <div className="rounded-2xl bg-[var(--primary-soft)] p-4 text-center border border-primary/10">
              <div className="text-xs text-primary">Best</div>
              <div className="font-bold text-primary">
                {bestDay.day} {bestDay.value}%
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Members */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" /> Anggota keluarga
          </h2>
          <Link href="/keluarga" className="text-xs font-medium text-primary">
            Kelola →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => {
            const isGood = m.progress >= 70;
            return (
              <Link key={m.id} href="/mutabaah" className="group rounded-[20px] border bg-card p-4 hover:shadow-soft hover:border-primary/15 transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center font-bold text-primary">{m.name.slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm leading-none">{m.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                      <span className={`h-2 w-2 rounded-full ${isGood ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {isGood ? "Konsisten" : "Perlu perhatian"}
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isGood ? "bg-[var(--primary-soft)] text-primary" : "bg-amber-50 text-amber-700"}`}>{m.progress}%</span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1.5">
                    <span>Progress hari ini</span>
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
              const isBest = d.value === bestDay.value && d.value > 0;
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
          <p className="text-xs text-muted-foreground mt-3 text-center">Tap bar untuk lihat detail harian di Progress.</p>
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
                  <div className="text-sm font-medium leading-tight">{a.name}</div>
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
                <span className="font-semibold">Pengingat lembut:</span> Masih ada {pendingCount} anggota yang belum mengisi hari ini.
              </>
            ) : (
              <>🌿 Alhamdulillah, semua anggota sudah mengisi hari ini.</>
            )}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { title: "Tambah Amalan", desc: "Buat target baru", href: "/keluarga", icon: Sparkles },
          { title: "Undang Anggota", desc: "Bagikan link", href: "/keluarga", icon: Users },
          { title: "Lihat Progress", desc: "Insight bulanan", href: "/progress", icon: CalendarDays },
        ].map((a) => (
          <Link key={a.title} href={a.href} className="rounded-2xl border bg-card p-4 hover:border-primary/15 hover:shadow-soft transition-all group">
            <a.icon className="h-5 w-5 text-primary" />
            <div className="font-semibold text-sm mt-2 flex items-center gap-1">
              {a.title} <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
