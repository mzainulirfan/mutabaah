"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Trash2, Copy, Check, Loader2, ChevronLeft, X } from "lucide-react";
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
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

  const handleCreateInvite = async () => {
    if (!familyId) return;
    setInviteLoading(true);
    try {
      const { createInvitation } = await import("@/lib/actions/family");
      const res = await createInvitation(familyId);
      setInviteUrl(res.url);
      setInviteCode(res.code);
      setCopied(false);
      setCodeCopied(false);
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

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCodeCopied(true);
      setMsg("Kode undangan tersalin. Anggota cukup ketik kode ini di halaman Gabung.");
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
          <Button size="sm" className="rounded-full shrink-0" onClick={() => { setInviteUrl(""); setInviteCode(""); setCopied(false); setCodeCopied(false); setInviteOpen(true); }}>
            <Link2 className="h-4 w-4 mr-1.5" /> Undang anggota
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{members.length} orang dalam keluarga ini.</p>
      </div>

      {msg && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2" role="status"><Check className="h-4 w-4 shrink-0" /> {msg}</div>}

      <Card className="rounded-[20px] p-2">
        <ul className="divide-y divide-border/60">
          {members.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center font-bold text-primary shrink-0">{p.name[0]?.toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{roleLabel[p.role] ?? "Anggota"}</div>
              </div>
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
          <p className="text-sm text-muted-foreground mt-1 leading-6">Buat undangan, bagikan ke keluarga. Mereka cukup buka link — atau ketik kode 6 huruf di halaman Gabung. Berlaku 7 hari, sekali pakai.</p>
          {!inviteUrl ? (
            <Button className="w-full rounded-full mt-5 min-h-[44px]" onClick={handleCreateInvite} disabled={inviteLoading}>
              {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-1.5" />} Buat undangan
            </Button>
          ) : (
            <div className="mt-5 space-y-3">
              <div>
                <div className="text-xs font-semibold mb-1.5">Kode undangan</div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="w-full rounded-2xl border-2 border-dashed border-primary/30 bg-[var(--primary-soft)]/50 px-3 py-3.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Salin kode undangan ${inviteCode}`}
                >
                  <span className="font-mono font-bold text-2xl tracking-[0.3em] text-primary">{inviteCode}</span>
                  <span className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Copy className="h-3.5 w-3.5" /> {codeCopied ? "Tersalin ✓" : "Ketuk untuk menyalin"}
                  </span>
                </button>
              </div>
              <div>
                <div className="text-xs font-semibold mb-1.5">Atau link undangan</div>
                <div className="rounded-xl border bg-muted px-3 py-2.5 text-xs truncate font-mono">{inviteUrl}</div>
                <Button variant="secondary" className="w-full rounded-full min-h-[44px] mt-2" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1.5" /> {copied ? "Tersalin ✓" : "Salin link"}
                </Button>
              </div>
              <button onClick={() => { setInviteUrl(""); setInviteCode(""); setCopied(false); setCodeCopied(false); }} className="w-full text-xs text-muted-foreground underline underline-offset-2">
                Tutup
              </button>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
