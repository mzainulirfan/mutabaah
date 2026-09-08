"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  Users2,
  User,
  Bell,
  Flame,
  LogOut,
} from "lucide-react";

const parentNav = [
  { href: "/beranda", label: "Beranda", icon: LayoutDashboard },
  { href: "/mutabaah", label: "Mutabaah", icon: ClipboardCheck },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/keluarga", label: "Keluarga", icon: Users2 },
  { href: "/profil", label: "Profil", icon: User },
];

export function AppShell({ children, role = "parent" }: { children: React.ReactNode; role?: "parent" | "member" }) {
  const pathname = usePathname();
  const nav = parentNav;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-[256px] shrink-0 flex-col border-r bg-card sticky top-0 h-screen">
        <div className="h-[64px] flex items-center gap-3 px-6 border-b">
          <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm">
            م
          </div>
          <div>
            <div className="font-semibold text-[15px] leading-none">Mutabaah</div>
            <div className="text-[11px] text-muted-foreground tracking-wide uppercase font-medium">
              Keluarga Ahmad
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="rounded-2xl bg-[var(--primary-soft)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Flame className="h-4 w-4" /> 7 hari streak
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Alhamdulillah, konsisten 7 hari berturut-turut!
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <img
              src="https://i.pravatar.cc/100?img=15"
              alt="Ayah"
              className="h-8 w-8 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium leading-none">Ayah</div>
              <div className="text-xs text-muted-foreground">OWNER</div>
            </div>
            <form action={async () => { const { logout } = await import("@/lib/actions/auth"); await logout(); }}>
              <button className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted" aria-label="Keluar">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar mobile — minimal, nav via bottom */}
        <header className="lg:hidden sticky top-0 z-30 bg-card/80 backdrop-blur border-b">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">م</div>
              <span className="font-semibold text-sm">Mutabaah</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-medium text-primary border border-primary/10">
                <Flame className="h-3.5 w-3.5" /> 7
              </span>
              <button className="h-9 w-9 rounded-full bg-muted flex items-center justify-center" aria-label="Notifikasi">
                <Bell className="h-4 w-4" />
              </button>
              <img src="https://i.pravatar.cc/100?img=15" alt="avatar" className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 lg:px-8 py-6 pb-24 lg:pb-8">
          {children}
        </main>

        {/* Bottom Nav Mobile */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t">
          <div className="flex items-center justify-around h-[64px] px-2">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 min-w-[56px] py-1.5 rounded-xl transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center",
                      active && "bg-primary text-white"
                    )}
                  >
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
