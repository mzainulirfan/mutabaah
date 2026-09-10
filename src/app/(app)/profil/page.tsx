"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, User, Mail, Check, AlertCircle, Users, Sun, Moon, ChevronRight, Target, Settings2, LogOut, Pencil, Loader2 } from "lucide-react";
import Link from "next/link";
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

  const saveNotif = async () => {
    if (!user || !supabase) return;
    setSaving(true);
    setErr(null);
    try {
      await supabase.from("mutabaah_notification_preferences").upsert({ user_id: user.id, enabled: notif.enabled, morning_time: notif.morning, evening_time: notif.evening });
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
    { href: "/keluarga/lainnya", title: "Lainnya", desc: "Nama keluarga dan tampilan rangkaian", icon: Settings2 },
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
        <div className="relative flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center text-white font-bold text-lg shrink-0" aria-hidden="true">
            {user ? user.name.slice(0, 2).toUpperCase() : <User className="h-6 w-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg leading-tight truncate text-white">{user ? user.name : "Belum masuk"}</div>
            <div className="text-sm text-white/70 flex items-center gap-1.5 truncate mt-1">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {user?.email ?? "Masuk untuk menyimpan progresmu"}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {role && (
                <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full font-medium text-white">
                  {roleLabel[role] ?? "Anggota"}
                </span>
              )}
              {family && (
                <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full flex items-center gap-1 text-white">
                  <Users className="h-3 w-3" aria-hidden="true" /> {family}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="relative text-xs text-white/60 mt-5 leading-5">
          {user
            ? "Catatan dan progresmu hanya terlihat oleh keluargamu sendiri."
            : "Progresmu saat ini hanya tersimpan di perangkat ini. Masuk agar tersimpan aman."}
        </p>
      </div>

      {msg && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2" role="status"><Check className="h-4 w-4 shrink-0" /> {msg}</div>}
      {err && <div className="rounded-2xl bg-[var(--destructive-soft)] border border-red-200 px-4 py-2.5 text-sm text-red-700 flex items-center gap-2" role="alert"><AlertCircle className="h-4 w-4 shrink-0" /> {err}</div>}

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
                <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                  {members.length} anggota · {activeHabits} amalan aktif
                </div>
              </div>
              <div className="flex -space-x-2 shrink-0" aria-hidden="true">
                {members.slice(0, 5).map((m) => (
                  <div key={m.id} className="h-8 w-8 rounded-full bg-[var(--primary-soft)] border-2 border-white flex items-center justify-center text-[11px] font-semibold text-primary">
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                ))}
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
            </ul>
          </Card>
        )}
        <p className="text-center text-xs text-muted-foreground leading-5 mt-3">
          Perubahan di keluarga langsung berlaku untuk semua anggota,<br />jadi ubahlah dengan tenang dan secukupnya.
        </p>
      </section>

      {/* Pengingat */}
      <section aria-label="Pengingat harian">
        <h2 className="font-semibold flex items-center gap-2 text-sm mb-3">
          <Bell className="h-4 w-4 text-primary" aria-hidden="true" /> Pengingat harian
        </h2>
        <Card className="rounded-[20px] p-5">
          <p className="text-xs text-muted-foreground leading-5">Disapa lembut hanya bila belum mengisi.</p>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-2xl border p-3.5 cursor-pointer hover:border-primary/15 transition-colors min-h-[44px]">
              <span className="text-sm font-medium">Aktifkan pengingat</span>
              <input type="checkbox" checked={notif.enabled} onChange={(e) => setNotif({ ...notif, enabled: e.target.checked })} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="rounded-2xl border p-3.5 hover:border-primary/15 transition-colors">
                <span className="text-xs font-semibold flex items-center gap-1.5"><Sun className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" /> Pagi</span>
                <input type="time" value={notif.morning} onChange={(e) => setNotif({ ...notif, morning: e.target.value })} aria-label="Jam pengingat pagi" className="mt-2 w-full rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <span className="block text-[11px] text-muted-foreground mt-1.5">Jangan lupa mutabaah pagi</span>
              </label>
              <label className="rounded-2xl border p-3.5 hover:border-primary/15 transition-colors">
                <span className="text-xs font-semibold flex items-center gap-1.5"><Moon className="h-3.5 w-3.5 text-indigo-500" aria-hidden="true" /> Malam</span>
                <input type="time" value={notif.evening} onChange={(e) => setNotif({ ...notif, evening: e.target.value })} aria-label="Jam pengingat malam" className="mt-2 w-full rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <span className="block text-[11px] text-muted-foreground mt-1.5">Sudah mengisi hari ini?</span>
              </label>
            </div>
            <Button onClick={saveNotif} disabled={saving || !user} className="rounded-full w-full min-h-[44px]">
              {saving ? "Menyimpan…" : "Simpan pengingat"}
            </Button>
            {!user && <p className="text-xs text-muted-foreground text-center">Masuk dulu untuk menyimpan pengingat.</p>}
          </div>
        </Card>
      </section>

      {/* Akun */}
      <section aria-label="Akun">
        <h2 className="font-semibold flex items-center gap-2 text-sm mb-3">
          <User className="h-4 w-4 text-primary" aria-hidden="true" /> Akun
        </h2>
        <Card className="rounded-[20px] p-5">
          {user ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="display-name" className="text-xs font-semibold text-muted-foreground">
                    Nama tampilan
                  </label>
                  {!editingName && (
                    <button
                      type="button"
                      onClick={() => { setDraftName(user.name); setEditingName(true); }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary rounded-full px-2 py-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Ubah
                    </button>
                  )}
                </div>
                {editingName ? (
                  <div className="mt-1.5 flex gap-2">
                    <input
                      id="display-name"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                      maxLength={60}
                      autoComplete="off"
                      autoFocus
                      className="flex-1 min-w-0 rounded-xl border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button size="sm" className="rounded-full shrink-0 min-h-[44px]" onClick={() => void handleSaveName()} disabled={savingName || draftName.trim().length < 2}>
                      {savingName ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Simpan"}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-1 text-[15px] font-semibold">{user.name}</div>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">Nama ini terlihat oleh keluargamu.</p>
              </div>
              <div className="flex items-center gap-3 border-t border-border/60 pt-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">Keluar akan mengakhiri sesi di perangkat ini.</div>
                </div>
                <form action={logout} className="shrink-0">
                  <Button variant="outline" size="md" className="rounded-full text-red-700 border-red-200 hover:bg-red-50" type="submit">
                    <LogOut className="h-4 w-4 mr-1.5" aria-hidden="true" /> Keluar
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Belum masuk</div>
                <div className="text-xs text-muted-foreground mt-1">Masuk untuk menyimpan progres antar perangkat.</div>
              </div>
              <Link href="/login" className="inline-flex items-center justify-center shrink-0 h-10 px-5 text-[14px] rounded-full font-medium bg-primary text-primary-foreground hover:bg-[#134d39] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Masuk
              </Link>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
