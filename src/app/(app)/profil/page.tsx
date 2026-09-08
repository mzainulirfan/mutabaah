"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, User, Mail, Check, Crown, Sun, Moon, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/lib/actions/auth";
import { getFamilyContext, getSessionUser } from "@/lib/family-context";

export default function ProfilPage() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [family, setFamily] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [notif, setNotif] = useState({ enabled: true, morning: "07:00", evening: "20:30" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const user = await getSessionUser(supabase);
      if (!user) return;
      setUser({ id: user.id, email: user.email ?? "", name: (user.user_metadata?.name as string) ?? user.email?.split("@")[0] ?? "User" });
      const [familyContext, { data: pref }] = await Promise.all([
        getFamilyContext(supabase, user.id),
        supabase.from("mutabaah_notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      if (familyContext) {
        setRole(familyContext.role);
        setFamily(familyContext.familyName);
      }
      if (pref) setNotif({ enabled: pref.enabled, morning: pref.morning_time?.slice(0, 5) ?? "07:00", evening: pref.evening_time?.slice(0, 5) ?? "20:30" });
    })();
  }, [supabase]);

  const saveNotif = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const supa = createClient();
      if (!supa) return;
      await supa.from("mutabaah_notification_preferences").upsert({ user_id: user.id, enabled: notif.enabled, morning_time: notif.morning, evening_time: notif.evening });
      setMsg("Pengingat disimpan.");
      setTimeout(() => setMsg(null), 2500);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-[640px] mx-auto">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight leading-none">Profil</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Akun, keluarga, dan pengingat.</p>
      </div>

      {/* Hero — panel hijau tua seperti halaman lain */}
      <div className="rounded-[24px] p-6 text-white relative overflow-hidden bg-gradient-to-br from-[#1C5B40] via-[#17452F] to-[#102E21]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative flex items-start gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {user ? user.name.slice(0, 2).toUpperCase() : <User className="h-6 w-6" />}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="font-bold text-lg leading-tight truncate text-white">{user ? user.name : "Belum login"}</div>
            <div className="text-sm text-white/70 flex items-center gap-1.5 truncate mt-1">
              <Mail className="h-3.5 w-3.5 shrink-0" /> {user?.email ?? "—"}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {role && (
                <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full font-medium text-white">
                  {role === "OWNER" ? "Pemilik" : role === "PARENT" ? "Orang tua" : "Anggota"}
                </span>
              )}
              {family && (
                <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full flex items-center gap-1 text-white">
                  <Crown className="h-3 w-3" /> {family}
                </span>
              )}
            </div>
          </div>
          {user ? (
            <form action={logout} className="shrink-0">
              <Button variant="secondary" size="sm" className="rounded-full" type="submit">
                Keluar
              </Button>
            </form>
          ) : (
            <Link href="/login" className="shrink-0">
              <Button variant="secondary" size="sm" className="rounded-full">
                Masuk
              </Button>
            </Link>
          )}
        </div>
        {user && (
          <p className="relative text-xs text-white/60 mt-5 leading-5">
            Catatan dan progresmu hanya terlihat oleh keluargamu sendiri.
          </p>
        )}
      </div>

      {msg && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><Check className="h-4 w-4" /> {msg}</div>}

      <Card className="rounded-[20px] p-5">
        <h3 className="font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Pengingat harian
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Disapa lembut hanya bila belum mengisi.</p>
        <div className="mt-5 space-y-4">
          <label className="flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer hover:border-primary/15 transition-colors">
            <span className="text-sm font-medium">Aktifkan pengingat</span>
            <input type="checkbox" checked={notif.enabled} onChange={(e) => setNotif({ ...notif, enabled: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-2xl border p-3.5 hover:border-primary/15 transition-colors">
              <div className="text-xs font-semibold flex items-center gap-1.5"><Sun className="h-3.5 w-3.5 text-amber-500" /> Pagi</div>
              <input type="time" value={notif.morning} onChange={(e) => setNotif({ ...notif, morning: e.target.value })} className="mt-2 w-full rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <div className="text-[11px] text-muted-foreground mt-1.5">Jangan lupa mutabaah pagi</div>
            </label>
            <label className="rounded-2xl border p-3.5 hover:border-primary/15 transition-colors">
              <div className="text-xs font-semibold flex items-center gap-1.5"><Moon className="h-3.5 w-3.5 text-indigo-500" /> Malam</div>
              <input type="time" value={notif.evening} onChange={(e) => setNotif({ ...notif, evening: e.target.value })} className="mt-2 w-full rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <div className="text-[11px] text-muted-foreground mt-1.5">Sudah mengisi hari ini?</div>
            </label>
          </div>
          <Button onClick={saveNotif} disabled={saving || !user} className="rounded-full w-full">
            {saving ? "Menyimpan…" : "Simpan pengingat"}
          </Button>
        </div>
      </Card>

      <Card className="rounded-[20px] p-2">
        <Link href="/keluarga" className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="h-10 w-10 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-primary shrink-0"><Crown className="h-5 w-5" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold leading-none">Keluargaku</div>
            <div className="text-xs text-muted-foreground mt-1.5 truncate">{family ?? "Lihat anggota dan amalan"}</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>
      </Card>
    </div>
  );
}
