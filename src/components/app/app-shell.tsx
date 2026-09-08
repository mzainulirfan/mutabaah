"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ClipboardCheck, BarChart3, Users2, User, Bell, Flame, LogOut, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const parentNav = [
  { href: "/beranda", label: "Beranda", icon: LayoutDashboard },
  { href: "/mutabaah", label: "Mutabaah", icon: ClipboardCheck },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/keluarga", label: "Keluarga", icon: Users2 },
  { href: "/profil", label: "Profil", icon: User },
];

const pageTitles: Record<string, string> = {
  "/beranda": "Beranda",
  "/mutabaah": "Mutabaah",
  "/progress": "Progress",
  "/keluarga": "Keluarga",
  "/profil": "Profil",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = parentNav;
  const title = pageTitles[pathname] ?? "Mutabaah";
  const [familyName, setFamilyName] = useState("Keluarga");
  const [userName, setUserName] = useState("Ayah");
  const [streak, setStreak] = useState(7);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setUserName((auth.user.user_metadata?.name as string) ?? auth.user.email?.split("@")[0] ?? "Ayah");
      const { data: mem } = await supabase.from("mutabaah_family_members").select("family_id").eq("user_id", auth.user.id).maybeSingle();
      if (!mem) return;
      const { data: fam } = await supabase.from("mutabaah_families").select("name").eq("id", mem.family_id).single();
      if (fam) setFamilyName(fam.name);
      // streak quick calc: last 7d
      const { data: habits } = await supabase.from("mutabaah_habits").select("id,target_value,type").eq("family_id", mem.family_id).eq("is_active", true);
      const thirtyAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
      const { data: entries } = await supabase.from("mutabaah_entries").select("value,status,habit_id,date").eq("user_id", auth.user.id).gte("date", thirtyAgo);
      if (!habits?.length) return;
      let s = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        const items = habits.map((h: any) => {
          const e = (entries ?? []).find((x: any) => x.date === d && x.habit_id === h.id);
          const v = e ? Number(e.value) : 0;
          if (h.type === "BOOLEAN") return v ? 100 : 0;
          return Math.round(Math.min(100, (v / Number(h.target_value)) * 100));
        });
        const avg = Math.round(items.reduce((a: number, b: number) => a + b, 0) / items.length);
        if (avg >= 70) s++;
        else break;
      }
      setStreak(s);
    })();
  }, []);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar Desktop — calm, 280 */}
      <aside className="hidden lg:flex w-[280px] shrink-0 flex-col border-r bg-card sticky top-0 h-screen">
        <div className="h-[64px] flex items-center gap-3 px-6 border-b">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold">م</div>
          <div className="min-w-0">
            <div className="font-bold leading-none">Mutabaah</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {familyName}
            </div>
          </div>
          <span className="ml-auto h-7 w-7 rounded-full bg-muted flex items-center justify-center">
            <Crown className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-3">
          <div className="rounded-2xl bg-[var(--primary-soft)] border border-primary/10 p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white border flex items-center justify-center text-primary">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-primary leading-none">{streak} hari streak</div>
              <div className="text-xs text-muted-foreground">{streak ? "Konsisten" : "Mulai hari ini"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border p-3">
            <div className="h-9 w-9 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-primary font-bold text-sm">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-none truncate">{userName}</div>
              <div className="text-xs text-muted-foreground">Keluarga • Aktif</div>
            </div>
            <form action={async () => { const { logout } = await import("@/lib/actions/auth"); await logout(); }}>
              <button className="h-8 w-8 rounded-full border bg-card flex items-center justify-center hover:bg-muted" aria-label="Keluar">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar mobile + desktop — single, context aware */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b">
          <div className="flex items-center justify-between px-4 lg:px-8 h-14">
            <div className="flex items-center gap-3 min-w-0">
              <div className="lg:hidden h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm">م</div>
              <div className="min-w-0">
                <div className="font-semibold leading-none text-sm lg:text-[15px]">{title}</div>
                <div className="text-[11px] text-muted-foreground hidden sm:block truncate">{familyName} • {streak} hari streak</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-primary border border-primary/10">
                <Flame className="h-3.5 w-3.5" /> {streak}
              </span>
              <button className="h-9 w-9 rounded-full border bg-card flex items-center justify-center hover:bg-muted" aria-label="Notifikasi">
                <Bell className="h-4 w-4" />
              </button>
              <div className="h-8 w-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-primary font-bold text-xs border">
                {userName.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 lg:px-8 py-6 pb-24 lg:pb-8">{children}</main>

        {/* Bottom Nav Mobile — only */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t">
          <div className="flex items-center justify-around h-[64px] px-2">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("flex flex-col items-center justify-center gap-1 min-w-[56px] py-1.5 rounded-xl transition-colors", active ? "text-primary" : "text-muted-foreground")}
                >
                  <span className={cn("h-7 w-7 rounded-full flex items-center justify-center", active && "bg-primary text-white")}>
                    <item.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
