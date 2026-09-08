"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, LogOut, User, Mail, Check, ShieldCheck, Crown, Sun, Moon, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/lib/actions/auth";

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
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setUser({ id: auth.user.id, email: auth.user.email ?? "", name: (auth.user.user_metadata?.name as string) ?? auth.user.email?.split("@")[0] ?? "User" });
      const { data: mem } = await supabase.from("mutabaah_family_members").select("family_id,role").eq("user_id", auth.user.id).maybeSingle();
      if (mem) {
        setRole(mem.role);
        const { data: fam } = await supabase.from("mutabaah_families").select("name").eq("id", mem.family_id).single();
        if (fam) setFamily(fam.name);
      }
      const { data: pref } = await supabase.from("mutabaah_notification_preferences").select("*").eq("user_id", auth.user.id).maybeSingle();
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

      {/* Hero with cover */}
      <Card className="rounded-[24px] overflow-hidden">
        <div className="h-20 bg-[var(--primary-soft)] border-b border-primary/10" />
        <div className="p-5">
          <div className="flex items-start gap-4 -mt-10">
            <div className="h-16 w-16 rounded-2xl bg-card border shadow-sm flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {user ? user.name.slice(0, 2).toUpperCase() : <User className="h-6 w-6" />}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="font-bold leading-none truncate">{user ? user.name : "Belum login"}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1.5 truncate mt-1">
                <Mail className="h-3.5 w-3.5" /> {user?.email ?? "—"}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {role && <span className="text-[11px] bg-[var(--primary-soft)] text-primary border border-primary/10 px-2 py-0.5 rounded-full font-medium">{role}</span>}
                {family && <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full flex items-center gap-1"><Crown className="h-3 w-3" /> {family}</span>}
              </div>
            </div>
            {user ? (
              <form action={logout}>
                <Button variant="secondary" size="sm" className="rounded-full shrink-0" type="submit">
                  Keluar
                </Button>
              </form>
            ) : (
              <Link href="/login">
                <Button variant="secondary" size="sm" className="rounded-full">
                  Masuk
                </Button>
              </Link>
            )}
          </div>
          {user && (
            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-2xl p-3">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" /> Data keluarga privat & terisolasi — hanya anggota yang bisa lihat.
            </div>
          )}
        </div>
      </Card>

      {msg && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><Check className="h-4 w-4" /> {msg}</div>}

      <Card className="rounded-[20px] p-5">
        <h3 className="font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Pengingat harian
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Hanya kirim jika belum isi — tidak spam.</p>
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

      <Card className="rounded-[20px] p-1">
        <Link href="/keluarga" className="flex items-center justify-between p-4 rounded-2xl hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-primary"><Crown className="h-4 w-4" /></div>
            <div>
              <div className="text-sm font-semibold">Keluarga</div>
              <div className="text-xs text-muted-foreground">{family ?? "Lihat anggota & amalan"}</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </Card>
    </div>
  );
}
