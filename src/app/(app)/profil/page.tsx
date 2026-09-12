"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, User, Mail, Users, Sun, Moon, ChevronRight, Target, LogOut, Pencil, Loader2, Flame, FileText } from "@/components/ui/hugeicons";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/lib/actions/auth";
import { clearFamilyCache, getFamilyContext, getSessionUser } from "@/lib/family-context";
import { getErrorMessage } from "@/lib/utils";

type FamilyMenuItem = {
  href: string;
  title: string;
  desc: string;
  icon: typeof Users;
  badge?: string;
};

const roleLabel: Record<string, string> = { OWNER: "Pemilik", PARENT: "Orang tua", MEMBER: "Anggota" };

export default function ProfilPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [family, setFamily] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [activeHabits, setActiveHabits] = useState(0);
  const [notif, setNotif] = useState({ enabled: true, morning: "07:00", evening: "20:30" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [editingFamily, setEditingFamily] = useState(false);
  const [draftFamily, setDraftFamily] = useState("");
  const [savingFamily, setSavingFamily] = useState(false);
  const [showStreakPref, setShowStreakPref] = useState(true);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    void (async () => {
      const sessionUser = await getSessionUser(supabase);
      if (!sessionUser) { setLoading(false); return; }
      setUser({
        id: sessionUser.id,
        email: sessionUser.email ?? "",
        name: (sessionUser.user_metadata?.name as string | undefined) ?? sessionUser.email?.split("@")[0] ?? "User",
      });
      const [familyContext, { data: prefData }] = await Promise.all([
        getFamilyContext(supabase, sessionUser.id),
        supabase.from("mutabaah_notification_preferences").select("enabled,morning_time,evening_time").eq("user_id", sessionUser.id).maybeSingle(),
      ]);
      if (familyContext) {
        setRole(familyContext.role);
        setFamily(familyContext.familyName);
        setFamilyId(familyContext.familyId);
        setMembers(familyContext.members.map((m) => ({ id: m.user_id, name: m.name })));
        setActiveHabits(familyContext.habits.length);
      }
      const pref = prefData as { enabled: boolean; morning_time: string | null; evening_time: string | null } | null;
      if (pref) setNotif({ enabled: pref.enabled, morning: pref.morning_time?.slice(0, 5) ?? "07:00", evening: pref.evening_time?.slice(0, 5) ?? "20:30" });
      setLoading(false);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  useEffect(() => {
    if (!err) return;
    const t = setTimeout(() => setErr(null), 4000);
    return () => clearTimeout(t);
  }, [err]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setShowStreakPref(localStorage.getItem("mutabaah:streak") !== "0");
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const saveNotif = async () => {
    if (!user || !supabase) return;
    setSaving(true);
    setErr(null);
    try {
      await supabase.from("mutabaah_notification_preferences").upsert({ user_id: user.id, enabled: notif.enabled, morning_time: notif.morning, evening_time: notif.evening });
      const { refreshReminders } = await import("@/lib/reminders");
      await refreshReminders(supabase);
      setMsg("Pengingat disimpan.");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Pengingat belum tersimpan — coba lagi."));
    } finally {
      setSaving(false);
    }
  };

  const familyMenu: FamilyMenuItem[] = [
    { href: "/keluarga/anggota", title: "Anggota", desc: "Siapa saja di keluarga ini, undang yang belum bergabung", icon: Users, badge: `${members.length} orang` },
    { href: "/keluarga/amalan", title: "Amalan", desc: "Daftar target harian yang diisi bersama", icon: Target, badge: `${activeHabits} aktif` },
    { href: "/keluarga/laporan", title: "Laporan", desc: "Rekap bulanan per anggota, siap dibagikan", icon: FileText },
  ];

  const handleSaveName = async () => {
    if (!user || savingName) return;
    setErr(null);
    setSavingName(true);
    try {
      const { updateProfileName } = await import("@/lib/actions/auth");
      const res = await updateProfileName(draftName);
      setUser({ ...user, name: res.name });
      clearFamilyCache();
      setEditingName(false);
      setMsg("Nama diperbarui.");
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveFamily = async () => {
    if (!familyId || savingFamily) return;
    setErr(null);
    setSavingFamily(true);
    try {
      const { updateFamily } = await import("@/lib/actions/family");
      const fd = new FormData();
      fd.set("name", draftFamily);
      await updateFamily(familyId, fd);
      setFamily(draftFamily.trim());
      clearFamilyCache();
      setEditingFamily(false);
      setMsg("Nama keluarga diperbarui.");
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      setSavingFamily(false);
    }
  };

  const handleEnableNotif = async () => {
    const { requestReminderPermission, refreshReminders } = await import("@/lib/reminders");
    const result = await requestReminderPermission();
    setPerm(result);
    if (result === "granted") {
      await refreshReminders(supabase);
      setMsg("Notifikasi diaktifkan di perangkat ini.");
    } else if (result === "denied") {
      setErr("Izin notifikasi ditolak. Aktifkan lewat pengaturan browser bila berubah pikiran.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-[640px] mx-auto animate-pulse" aria-busy="true" aria-label="Memuat profil">
        <div className="h-44 rounded-[24px] bg-muted" />
        <div className="h-56 rounded-[20px] bg-muted" />
        <div className="h-40 rounded-[20px] bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[640px] mx-auto">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight leading-none">Profil</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Akun, keluarga, dan pengingat.</p>
      </div>

      {/* Identitas — panel hijau tua seperti halaman lain */}
      <div className="rounded-[24px] p-6 text-white relative overflow-hidden bg-gradient-to-br from-[#1C5B40] via-[#17452F] to-[#102E21]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-12 -bottom-14 h-40 w-40 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center text-white font-bold text-lg shrink-0" aria-hidden="true">
            {user ? user.name.slice(0, 2).toUpperCase() : <User className="h-6 w-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg leading-tight truncate text-white">{user ? user.name : "Belum masuk"}</div>
            <div className="text-sm text-white/70 flex items-center gap-1.5 truncate mt-1">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {user?.email ?? "Masuk untuk menyimpan progresmu"}
            </div>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => { setDraftName(user.name); setEditingName(true); }}
              aria-label="Ubah nama tampilan"
              className="shrink-0 h-11 w-11 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="relative flex flex-wrap items-center gap-1.5 mt-4">
          {role && (
            <span className="text-[11px] bg-white/15 px-2.5 py-1 rounded-full font-medium text-white">
              {roleLabel[role] ?? "Anggota"}
            </span>
          )}
          {family && (
            <span className="text-[11px] bg-white/15 px-2.5 py-1 rounded-full flex items-center gap-1 text-white">
              <Users className="h-3 w-3" aria-hidden="true" /> {family}
            </span>
          )}
        </div>
      </div>

      {msg && <Toast kind="success" message={msg} />}
      {err && <Toast kind="error" message={err} />}

      {/* Keluarga — ringkasan + jalan ke anggota, amalan, dan pengaturan */}
      <section aria-label="Keluarga">
        <h2 className="font-semibold flex items-center gap-2 text-sm mb-3">
          <Users className="h-4 w-4 text-primary" aria-hidden="true" /> Keluarga
        </h2>
        {!family ? (
          <Card className="p-8 text-center rounded-[24px] border-dashed">
            <div className="h-14 w-14 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center mx-auto">
              <Users className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-lg mt-4">Belum ada keluarga</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-[32ch] mx-auto">Buat keluarga untuk mengatur amalan dan mengundang anggota.</p>
            <Link href="/onboarding" className="inline-flex items-center justify-center mt-5 rounded-full bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 min-h-[44px] hover:bg-[#134d39] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Buat Keluarga
            </Link>
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Punya kode undangan?</span>{" "}
              <Link href="/gabung" className="font-medium text-primary underline underline-offset-2">
                Gabung keluarga
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="rounded-[20px] p-5">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{family}</div>
              </div>
              <div className="flex items-center shrink-0" aria-hidden="false">
                <div className="flex -space-x-2" aria-hidden="true">
                  {members.slice(0, 5).map((m) => (
                    <div key={m.id} className="h-8 w-8 rounded-full bg-[var(--primary-soft)] border-2 border-white flex items-center justify-center text-[11px] font-semibold text-primary">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                </div>
                {family && (
                  <button
                    type="button"
                    onClick={() => { setDraftFamily(family); setEditingFamily(true); }}
                    aria-label="Ubah nama keluarga"
                    className="-ml-1 h-8 w-8 rounded-full bg-card border-2 border-white shadow-sm flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            <ul className="mt-4 divide-y divide-border/60 border-t border-border/60">
              {familyMenu.map((m) => (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    className="flex items-center gap-3 py-3.5 rounded-2xl hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="h-10 w-10 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-primary shrink-0">
                      <m.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-sm leading-none">{m.title}</span>
                      <span className="block text-xs text-muted-foreground mt-1.5 truncate">{m.desc}</span>
                    </span>
                    {m.badge ? (
                      <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium shrink-0 tabular-nums">{m.badge}</span>
                    ) : null}
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showStreakPref;
                    setShowStreakPref(next);
                    try {
                      localStorage.setItem("mutabaah:streak", next ? "1" : "0");
                    } catch {}
                    setMsg(next ? "Rangkaian ditampilkan." : "Rangkaian disembunyikan. Lebih tenang, ya.");
                  }}
                  aria-pressed={showStreakPref}
                  className="w-full flex items-center gap-3 py-3.5 rounded-2xl hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left"
                >
                  <span className="h-10 w-10 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-primary shrink-0">
                    <Flame className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-sm leading-none">Rangkaian hari</span>
                    <span className="block text-xs text-muted-foreground mt-1.5 truncate">
                      {showStreakPref ? "Ditampilkan di beranda dan progres" : "Disembunyikan — lebih tenang"}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors ${showStreakPref ? "bg-primary" : "bg-black/15"}`}
                  >
                    <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${showStreakPref ? "translate-x-5" : ""}`} />
                  </span>
                </button>
              </li>
            </ul>
          </Card>
        )}
      </section>

      {/* Pengingat */}
      <section aria-label="Pengingat harian">
        <h2 className="font-semibold flex items-center gap-2 text-sm mb-3">
          <Bell className="h-4 w-4 text-primary" aria-hidden="true" /> Pengingat harian
        </h2>
        <Card className="rounded-[20px] p-5">
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-2xl p-1">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${perm === "granted" ? "bg-emerald-500" : perm === "denied" ? "bg-red-500" : "bg-amber-500"}`} aria-hidden="true" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">Notifikasi perangkat</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  {perm === "granted"
                    ? "Aktif di perangkat ini."
                    : perm === "denied"
                      ? "Diblokir — aktifkan lewat pengaturan browser."
                      : perm === "unsupported"
                        ? "Browser ini tidak mendukung notifikasi."
                        : "Perlu izin browser untuk berbunyi."}
                </span>
              </span>
              {perm !== "granted" && perm !== "unsupported" && (
                <Button size="sm" className="rounded-full shrink-0" onClick={() => void handleEnableNotif()}>
                  Aktifkan
                </Button>
              )}
            </div>
            <label className="flex items-center gap-3 rounded-2xl p-1 cursor-pointer min-h-[44px]">
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">Ingatkan saya</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Hanya bila mutabaah belum terisi.</span>
              </span>
              <input type="checkbox" checked={notif.enabled} onChange={(e) => setNotif({ ...notif, enabled: e.target.checked })} aria-label="Ingatkan saya" className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
            </label>
            <div className="divide-y divide-border/60 border-t border-b border-border/60">
              <label className="flex items-center gap-3 py-3">
                <span className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0" aria-hidden="true">
                  <Sun className="h-4 w-4 text-amber-500" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium">Pagi</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">Jangan lupa mutabaah pagi</span>
                </span>
                <input type="time" value={notif.morning} onChange={(e) => setNotif({ ...notif, morning: e.target.value })} aria-label="Jam pengingat pagi" className="shrink-0 rounded-xl border bg-card px-2.5 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <label className="flex items-center gap-3 py-3">
                <span className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0" aria-hidden="true">
                  <Moon className="h-4 w-4 text-indigo-500" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium">Malam</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">Sudah mengisi hari ini?</span>
                </span>
                <input type="time" value={notif.evening} onChange={(e) => setNotif({ ...notif, evening: e.target.value })} aria-label="Jam pengingat malam" className="shrink-0 rounded-xl border bg-card px-2.5 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
              </label>
            </div>
            <Button onClick={saveNotif} disabled={saving || !user} className="rounded-full w-full min-h-[44px]">
              {saving ? "Menyimpan…" : "Simpan pengingat"}
            </Button>
            <p className="text-[11px] text-muted-foreground leading-5 text-center">
              Jadwal di atas sapaan umum. Jam khusus per amalan diatur di Keluarga › Amalan dan berbunyi terpisah.
            </p>
            {!user && <p className="text-xs text-muted-foreground text-center">Masuk dulu untuk menyimpan pengingat.</p>}
          </div>
        </Card>
      </section>

      {/* Keluar — tanpa kartu, satu tombol saja */}
      {user ? (
        <form action={logout}>
          <Button variant="outline" size="lg" className="w-full rounded-full text-red-700 border-red-200 hover:bg-red-50 min-h-[48px]" type="submit">
            <LogOut className="h-4 w-4 mr-1.5" aria-hidden="true" /> Keluar dari akun
          </Button>
        </form>
      ) : (
        <Link href="/login" className="flex items-center justify-center h-12 px-7 text-[15px] rounded-full font-medium bg-primary text-primary-foreground hover:bg-[#134d39] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[48px]">
          Masuk
        </Link>
      )}

      {/* Ubah nama — bottom sheet */}
      {user && editingName && (
        <Sheet label="Ubah nama tampilan" onClose={() => setEditingName(false)}>
          <h3 className="font-bold text-lg">Ubah nama tampilan</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-6">Nama ini terlihat oleh keluargamu.</p>
          <label htmlFor="display-name" className="block text-sm font-medium mt-4">
            Nama
          </label>
          <input
            id="display-name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleSaveName(); }}
            maxLength={60}
            autoComplete="off"
            autoFocus
            placeholder="Nama tampilan"
            className="mt-1.5 w-full rounded-xl border bg-card px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
          />
          <Button
            size="lg"
            className="w-full rounded-full mt-4 min-h-[48px]"
            onClick={() => void handleSaveName()}
            disabled={savingName || draftName.trim().length < 2}
          >
            {savingName ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" /> : null}
            {savingName ? "Menyimpan…" : "Simpan nama"}
          </Button>
        </Sheet>
      )}

      {/* Ubah nama keluarga — bottom sheet */}
      {editingFamily && (
        <Sheet label="Ubah nama keluarga" onClose={() => setEditingFamily(false)}>
          <h3 className="font-bold text-lg">Ubah nama keluarga</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-6">Nama ini terlihat oleh semua anggota keluarga.</p>
          <label htmlFor="family-name" className="block text-sm font-medium mt-4">
            Nama keluarga
          </label>
          <input
            id="family-name"
            value={draftFamily}
            onChange={(e) => setDraftFamily(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleSaveFamily(); }}
            maxLength={60}
            autoComplete="off"
            autoFocus
            placeholder="Keluarga Ahmad"
            className="mt-1.5 w-full rounded-xl border bg-card px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
          />
          <Button
            size="lg"
            className="w-full rounded-full mt-4 min-h-[48px]"
            onClick={() => void handleSaveFamily()}
            disabled={savingFamily || draftFamily.trim().length < 3}
          >
            {savingFamily ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" /> : null}
            {savingFamily ? "Menyimpan…" : "Simpan nama keluarga"}
          </Button>
        </Sheet>
      )}
    </div>
  );
}
