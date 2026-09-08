"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ClipboardCheck, BarChart3, Users2, User, LogOut, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const parentNav = [
  { href: "/beranda", label: "Beranda", icon: LayoutDashboard },
  { href: "/mutabaah", label: "Mutabaah", icon: ClipboardCheck },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/keluarga", label: "Keluarga", icon: Users2 },
  { href: "/profil", label: "Profil", icon: User },
];

const memberNav = [
  { href: "/beranda", label: "Hari Ini", icon: LayoutDashboard },
  { href: "/mutabaah", label: "Mutabaah", icon: ClipboardCheck },
  { href: "/progress", label: "Progress", icon: BarChart3 },
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
  const [familyName, setFamilyName] = useState("Keluarga");
  const [userName, setUserName] = useState("Ayah");
  const [role, setRole] = useState<string>("PARENT");

  const nav = role === "MEMBER" ? memberNav : parentNav;
  const title = pathname === "/beranda" && role === "MEMBER" ? "Hari Ini" : (pageTitles[pathname] ?? "Mutabaah");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setUserName((auth.user.user_metadata?.name as string) ?? auth.user.email?.split("@")[0] ?? "Ayah");
      const { data: mem } = await supabase.from("mutabaah_family_members").select("family_id,role").eq("user_id", auth.user.id).maybeSingle();
      if (!mem) return;
      setRole((mem as any).role ?? "PARENT");
      const { data: fam } = await supabase.from("mutabaah_families").select("name").eq("id", (mem as any).family_id).single();
      if (fam) setFamilyName((fam as any).name);
    })();
  }, []);

  return (
    <div className="min-h-screen flex bg-[#FDFCF9] lg:bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r bg-card sticky top-0 h-screen">
        <div className="h-[68px] flex items-center gap-3 px-5 border-b">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-[13px]" aria-hidden="true">م</div>
          <div className="min-w-0">
            <div className="font-bold text-[15px] leading-none">Mutabaah</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> {familyName}
            </div>
          </div>
        </div>

        <nav aria-label="Navigasi utama" className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-[var(--primary-soft)] text-primary border border-primary/10" : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t space-y-3">
          <Link href="/mutabaah" className="flex items-center justify-center gap-2 rounded-2xl bg-primary text-white p-3 hover:bg-[#134d39] transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Isi Mutabaah Hari Ini</span>
          </Link>
          <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <div className="h-9 w-9 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-primary font-bold text-sm" aria-hidden="true">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-none truncate">{userName}</div>
              <div className="text-xs text-muted-foreground truncate">{familyName}</div>
            </div>
            <form action={async () => { const { logout } = await import("@/lib/actions/auth"); await logout(); }}>
              <button className="h-11 w-11 rounded-full border bg-card flex items-center justify-center hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Keluar dari akun">
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar — satu konteks: judul + keluarga saja */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b">
          <div className="mx-auto max-w-[1100px] flex items-center justify-between h-14 px-4 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <div className="lg:hidden h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">م</div>
              <div className="min-w-0">
                <div className="font-semibold leading-none text-sm lg:text-[15px]">{title}</div>
                <div className="text-[11px] text-muted-foreground truncate mt-1">{familyName}</div>
              </div>
            </div>
            <Link href="/profil" aria-label="Buka profil saya" className="h-11 w-11 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="h-8 w-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-primary font-bold text-xs border" aria-hidden="true">
                {userName.slice(0, 2).toUpperCase()}
              </span>
            </Link>
          </div>
        </header>

        <main id="main" className="flex-1 max-w-[1100px] w-full mx-auto px-4 lg:px-8 py-6 pb-28 lg:pb-8">{children}</main>

        {/* Bottom Nav — full, calm segmented pill */}
        <nav aria-label="Navigasi mobile" className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <div className="mx-auto flex items-stretch justify-around px-3 pt-2 pb-1.5">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  className="flex flex-col items-center gap-[3px] min-w-[60px] min-h-[44px] py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "flex items-center justify-center h-[28px] w-[52px] rounded-full transition-colors",
                      active ? "bg-[var(--primary-soft)] text-primary" : "text-muted-foreground"
                    )}
                    aria-hidden="true"
                  >
                    <item.icon className="h-[20px] w-[20px]" strokeWidth={active ? 2.2 : 1.8} />
                  </span>
                  <span className={cn("text-[11px] leading-none", active ? "font-semibold text-primary" : "font-medium text-muted-foreground")}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
