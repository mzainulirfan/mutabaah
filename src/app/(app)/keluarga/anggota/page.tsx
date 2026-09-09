"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Trash2, Copy, Check, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils";
import { clearFamilyCache, getFamilyContext, getSessionUser } from "@/lib/family-context";

const roleLabel: Record<string, string> = { OWNER: "Pemilik", PARENT: "Orang tua", MEMBER: "Anggota" };

export default function AnggotaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [activeInvites, setActiveInvites] = useState<{ id: string; code: string; created_at: string }[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const load = useCallback(async () => {
    const user = await getSessionUser(supabase);
    if (!user) { setLoading(false); return; }
    const family = await getFamilyContext(supabase, user.id);
    if (!family) { setLoading(false); return; }
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
        .select("id,code,created_at")
        .eq("family_id", familyId)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .not("code", "is", null)
        .order("created_at", { ascending: false });
      setActiveInvites(((data ?? []) as { id: string; code: string; created_at: string }[]).filter((r) => r.code));
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
      setInviteUrl(res.url);
      setCopied(false);
      await loadInvites();
      setMsg(`Kode ${res.code} dibuat — ketuk untuk menyalin.`);
    } catch (e: unknown) { setMsg(getErrorMessage(e)); } finally { setInviteLoading(false); }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setMsg("Link undangan tersalin. Bagikan ke anggota keluarga.");
    } catch { setMsg("Gagal menyalin. Salin manual link di atas."); }
  };

  const copyInviteCode = async (code: string) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setMsg(`Kode ${code} tersalin. Anggota cukup ketik di halaman Gabung.`);
    } catch { setMsg("Gagal menyalin. Catat manual kode di atas."); }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (!familyId) return;
    if (!confirm(`Keluarkan ${name} dari keluarga?`)) return;
    const { removeFamilyMember } = await import("@/lib/actions/family");
    try {
      await removeFamilyMember(familyId, id);
      clearFamilyCache();
      setMembers((prev) => prev.filter((x) => x.id !== id));
      setMsg(`${name} sudah dikeluarkan dari keluarga.`);
    } catch (e: unknown) { setMsg(getErrorMessage(e)); }
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Memuat anggota">
        <div className="h-10 w-40 rounded-full bg-muted" />
        <div className="h-40 rounded-[20px] bg-muted" />
      </div>
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
          <Button size="sm" className="rounded-full shrink-0" onClick={() => { setInviteUrl(""); setCopied(false); setInviteOpen(true); }}>
            <Link2 className="h-4 w-4 mr-1.5" /> Undang anggota
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{members.length} orang dalam keluarga ini.</p>
      </div>

      {msg && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2" role="status"><Check className="h-4 w-4 shrink-0" /> {msg}</div>}

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
                  <div className="text-sm font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{roleLabel[p.role] ?? "Anggota"}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              </Link>
              {p.role !== "OWNER" && (
                <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => handleRemoveMember(p.id, p.name)} aria-label={`Keluarkan ${p.name} dari keluarga`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-xs text-muted-foreground leading-5">Anggota baru cukup buka link undangan lalu masuk — langsung tergabung, tanpa kode.</p>

      {inviteOpen && (
        <Sheet label="Undang anggota" onClose={() => setInviteOpen(false)}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Undang anggota</h3>
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setInviteOpen(false)} aria-label="Tutup">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-6">Bagikan kode — anggota cukup ketik di halaman Gabung. Satu kode untuk satu orang, berlaku 7 hari.</p>

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
                        {new Date(inv.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
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

          {inviteUrl && (
            <div className="mt-5">
              <div className="text-xs font-semibold mb-1.5">Atau link undangan</div>
              <div className="rounded-xl border bg-muted px-3 py-2.5 text-xs truncate font-mono">{inviteUrl}</div>
              <Button variant="secondary" className="w-full rounded-full min-h-[44px] mt-2" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1.5" /> {copied ? "Tersalin ✓" : "Salin link"}
              </Button>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
