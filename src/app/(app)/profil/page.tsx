"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Shield, LogOut, Moon, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/lib/actions/auth";

export default function ProfilPage() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [notif, setNotif] = useState({ enabled: true, morning: "07:00", evening: "20:30" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setUser({ id: auth.user.id, email: auth.user.email ?? "", name: (auth.user.user_metadata?.name as string) ?? auth.user.email?.split("@")[0] ?? "User" });
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
      setMsg("Preferensi disimpan.");
      setTimeout(() => setMsg(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[720px]">
      <div>
        <h1 className="text-[20px] font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground">Kelola akun, notifikasi, dan preferensi.</p>
      </div>

      <Card className="p-5 flex items-center gap-4">
        <img src="https://i.pravatar.cc/100?img=15" alt="avatar" className="h-14 w-14 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{user ? `${user.name}` : "Belum login"}</div>
          <div className="text-sm text-muted-foreground truncate">{user?.email ?? "—"}</div>
          {user && <div className="text-xs text-muted-foreground">ID {user.id.slice(0, 8)}…</div>}
        </div>
        {user ? (
          <form action={logout}>
            <Button variant="secondary" size="sm" type="submit">
              <LogOut className="h-4 w-4 mr-1.5" /> Keluar
            </Button>
          </form>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => (window.location.href = "/login")}>
            Masuk
          </Button>
        )}
      </Card>

      {msg && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">{msg}</div>}

      <Card className="p-5">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Bell className="h-4 w-4" /> Notifikasi
        </h3>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted/50">
            <input type="checkbox" checked={notif.enabled} onChange={(e) => setNotif({ ...notif, enabled: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
            <div className="flex-1">
              <div className="text-sm font-medium">Aktifkan pengingat</div>
              <div className="text-xs text-muted-foreground">Hanya kirim jika belum diisi — tidak spam.</div>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-xl border p-3">
              <div className="text-xs font-medium">Pagi</div>
              <input type="time" value={notif.morning} onChange={(e) => setNotif({ ...notif, morning: e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-1 text-sm" />
              <div className="text-xs text-muted-foreground mt-1">Jangan lupa mutabaah pagi.</div>
            </label>
            <label className="rounded-xl border p-3">
              <div className="text-xs font-medium">Malam</div>
              <input type="time" value={notif.evening} onChange={(e) => setNotif({ ...notif, evening: e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-1 text-sm" />
              <div className="text-xs text-muted-foreground mt-1">Sudah mengisi mutabaah hari ini?</div>
            </label>
          </div>
          <Button size="sm" onClick={saveNotif} disabled={saving || !user}>
            {saving ? "Menyimpan…" : "Simpan Notifikasi"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Web push butuh permission browser & service worker.</p>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> Preferensi
        </h3>
        <label className="flex items-center justify-between rounded-xl border p-3">
          <span className="text-sm flex items-center gap-2">
            <Moon className="h-4 w-4" /> Mode tenang (kurangi animasi)
          </span>
          <input type="checkbox" className="h-4 w-4" />
        </label>
        <div className="rounded-xl bg-muted p-3 text-xs leading-5">
          <Shield className="h-4 w-4 inline mr-1" /> Data keluarga privat. RLS aktif — member hanya lihat data sendiri, parent lihat semua anggota (sesuai `prd.md:1015`).
        </div>
      </Card>

      {user && (
        <form action={logout}>
          <Button variant="outline" className="w-full" type="submit">
            <LogOut className="h-4 w-4 mr-2" /> Keluar (hapus session)
          </Button>
        </form>
      )}
    </div>
  );
}
