"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Trash2, Copy, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils";
import { Toast } from "@/components/ui/toast";
import { clearFamilyCache, getFamilyContext, getSessionUser } from "@/lib/family-context";

const roleLabel: Record<string, string> = { OWNER: "Pemilik", PARENT: "Orang tua", MEMBER: "Anggota" };

export default function AnggotaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [activeInvites, setActiveInvites] = useState<{ id: string; code: string; created_at: string; expires_at: string | null }[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    const user = await getSessionUser(supabase);
    if (!user) { setLoading(false); return; }
    const family = await getFamilyContext(supabase, user.id);
    if (!family) { setLoading(false); return; }
    // Kelola anggota hanya untuk pengelola.
    if (family.role !== "OWNER" && family.role !== "PARENT") { setDenied(true); setLoading(false); return; }
    setMyId(user.id);
    setFamilyId(family.familyId);
    setMembers(family.members.map((member) => ({ id: member.user_id, name: member.name, role: member.role })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  const loadInvites = useCallback(async () => {
    if (!supabase || !familyId) return;
    setInvitesLoading(true);
    try {
      const { data } = await supabase
        .from("mutabaah_invitations")
        .select("id,code,created_at,expires_at")
        .eq("family_id", familyId)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .not("code", "is", null)
        .order("created_at", { ascending: false });
      setActiveInvites(((data ?? []) as { id: string; code: string; created_at: string; expires_at: string | null }[]).filter((r) => r.code));
    } finally {
      setInvitesLoading(false);
    }
  }, [supabase, familyId]);

  useEffect(() => {
    if (inviteOpen) {
      void (async () => {
        await loadInvites();
      })();
    }
  }, [inviteOpen, loadInvites]);

  const handleCreateInvite = async () => {
    if (!familyId) return;
    setInviteLoading(true);
    try {
      const { createInvitation } = await import("@/lib/actions/family");
      const res = await createInvitation(familyId);
      await loadInvites();
      setMsg(`Kode ${res.code} dibuat — ketuk untuk menyalin.`);
    } catch (e: unknown) { setMsg(getErrorMessage(e)); } finally { setInviteLoading(false); }
  };

  const copyInviteCode = async (code: string) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setMsg(`Kode ${code} tersalin. Anggota cukup ketik di halaman Gabung.`);
    } catch { setMsg("Gagal menyalin. Catat manual kode di atas."); }
  };

  const handleRemoveMember = async () => {
    if (!familyId || !removeTarget || removing) return;
    setRemoving(true);
    try {
      const { removeFamilyMember } = await import("@/lib/actions/family");
      await removeFamilyMember(familyId, removeTarget.id);
      clearFamilyCache();
      setMembers((prev) => prev.filter((x) => x.id !== removeTarget.id));
      setMsg(`${removeTarget.name} sudah dikeluarkan dari keluarga. Riwayatnya tetap tersimpan.`);
      setRemoveTarget(null);
    } catch (e: unknown) { setMsg(getErrorMessage(e)); } finally { setRemoving(false); }
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Memuat anggota">
        <div className="h-10 w-40 rounded-full bg-muted" />
        <div className="h-40 rounded-[20px] bg-muted" />
      </div>
    );
  }

  if (denied) {
    return (
      <Card className="p-8 text-center rounded-[24px] border-dashed">
        <h2 className="font-bold text-lg">Halaman pengelola</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-6">Daftar anggota hanya untuk pemilik dan orang tua.</p>
        <Link href="/beranda" className="inline-flex items-center justify-center mt-5 rounded-full bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 min-h-[44px]">
          Kembali ke Beranda
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/profil" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-full px-2 py-1 -ml-2">
          <ChevronLeft className="h-4 w-4" /> Profil
        </Link>
        <div className="flex items-center justify-between gap-2 mt-2">
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">Anggota</h1>
          <Button size="sm" className="rounded-full shrink-0" onClick={() => setInviteOpen(true)}>
            <Link2 className="h-4 w-4 mr-1.5" /> Undang anggota
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{members.length} orang dalam keluarga ini.</p>
      </div>

      {msg && <Toast kind="success" message={msg} />}

      <Card className="rounded-[20px] p-2">
        <ul className="divide-y divide-border/60">
          {members.map((p) => (
            <li key={p.id} className="flex items-center gap-1 p-1.5">
              <Link
                href={`/keluarga/anggota/${p.id}`}
                aria-label={`Lihat progres ${p.name}`}
                className="flex-1 min-w-0 flex items-center gap-3 rounded-2xl p-2 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="h-11 w-11 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center font-bold text-primary shrink-0" aria-hidden="true">{p.name[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {p.name}
                    {p.id === myId && (
                      <span className="ml-2 text-[10px] font-semibold text-primary bg-[var(--primary-soft)] px-2 py-0.5 rounded-full align-middle">Saya</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{roleLabel[p.role] ?? "Anggota"}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              </Link>
              {p.role !== "OWNER" && (
                <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => setRemoveTarget({ id: p.id, name: p.name })} aria-label={`Keluarkan ${p.name} dari keluarga`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-xs text-muted-foreground leading-5">Satu kode untuk satu orang, berlaku 7 hari. Kode yang sudah dipakai hilang sendiri dari daftar.</p>

      {inviteOpen && (
        <Sheet label="Undang anggota" onClose={() => setInviteOpen(false)}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Undang anggota</h3>
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setInviteOpen(false)} aria-label="Tutup">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-6">Bagikan kode — anggota cukup ketik di halaman Gabung. Satu kode untuk satu orang.</p>

          {/* Kode yang masih aktif — bisa dibuka lagi kapan pun tanpa buat baru */}
          <div className="mt-5">
            <div className="text-xs font-semibold mb-2">Kode aktif ({activeInvites.length})</div>
            {invitesLoading && activeInvites.length === 0 ? (
              <div className="rounded-2xl border p-4 text-center text-xs text-muted-foreground" aria-busy="true">Memuat kode…</div>
            ) : activeInvites.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground leading-5">
                Belum ada kode aktif. Buat satu di bawah — kode yang sudah dipakai tidak tampil di sini.
              </div>
            ) : (
              <ul className="space-y-2">
                {activeInvites.map((inv) => (
                  <li key={inv.id}>
                    <button
                      type="button"
                      onClick={() => void copyInviteCode(inv.code)}
                      className="w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left hover:border-primary/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
                      aria-label={`Salin kode undangan ${inv.code}`}
                    >
                      <span className="font-mono font-bold text-lg tracking-[0.25em] text-primary">{inv.code}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground tabular-nums shrink-0">
                        s/d {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "—"}
                      </span>
                      <Copy className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="secondary" className="w-full rounded-full min-h-[44px] mt-3" onClick={handleCreateInvite} disabled={inviteLoading}>
              {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" /> : <Link2 className="h-4 w-4 mr-1.5" aria-hidden="true" />} Buat kode baru
            </Button>
          </div>
        </Sheet>
      )}

      {/* Konfirmasi keluarkan anggota — lembut, tanpa confirm() browser */}
      {removeTarget && (
        <Sheet label={`Keluarkan ${removeTarget.name}`} onClose={() => !removing && setRemoveTarget(null)}>
          <h3 className="font-bold text-lg">Keluarkan {removeTarget.name}?</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-6">
            Ia tidak bisa lagi mengisi mutabaah keluarga ini, tapi riwayat yang sudah terisi tetap tersimpan.
          </p>
          <div className="mt-5 grid gap-2">
            <Button
              variant="outline"
              className="w-full rounded-full min-h-[48px] text-red-700 border-red-200 hover:bg-red-50"
              onClick={() => void handleRemoveMember()}
              disabled={removing}
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" /> : <Trash2 className="h-4 w-4 mr-1.5" aria-hidden="true" />}
              {removing ? "Mengeluarkan…" : `Ya, keluarkan ${removeTarget.name}`}
            </Button>
            <Button variant="secondary" className="w-full rounded-full min-h-[44px]" onClick={() => setRemoveTarget(null)} disabled={removing}>
              Batal
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
