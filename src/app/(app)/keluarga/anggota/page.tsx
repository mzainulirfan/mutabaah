"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Trash2, Copy, Check, Loader2, ChevronLeft, X } from "lucide-react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";

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

  const load = async () => {
    if (!supabase) { setLoading(false); return; }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setLoading(false); return; }
    const { data: mem } = await supabase.from("mutabaah_family_members").select("family_id").eq("user_id", auth.user.id).maybeSingle();
    if (!mem) { setLoading(false); return; }
    setFamilyId(mem.family_id);
    const { data: famMembers } = await supabase.from("mutabaah_family_members").select("user_id,role").eq("family_id", mem.family_id);
    const ids = (famMembers ?? []).map((m: any) => m.user_id);
    const { data: profiles } = ids.length ? await supabase.from("mutabaah_profiles").select("id,name").in("id", ids) : { data: [] as any[] };
    setMembers(
      (famMembers ?? []).map((m: any) => {
        const p = (profiles ?? []).find((x: any) => x.id === m.user_id);
        return { id: m.user_id, name: p?.name ?? "Anggota", role: m.role };
      })
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
      setCopied(false);
    } catch (e: any) { setMsg(e.message); } finally { setInviteLoading(false); }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setMsg("Link undangan tersalin. Bagikan ke anggota keluarga.");
    } catch { setMsg("Gagal menyalin. Salin manual link di atas."); }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (!familyId) return;
    if (!confirm(`Keluarkan ${name} dari keluarga?`)) return;
    const { removeFamilyMember } = await import("@/lib/actions/family");
    try {
      await removeFamilyMember(familyId, id);
      setMembers((prev) => prev.filter((x) => x.id !== id));
      setMsg(`${name} sudah dikeluarkan dari keluarga.`);
    } catch (e: any) { setMsg(e.message); }
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
        <Link href="/keluarga" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-full px-2 py-1 -ml-2">
          <ChevronLeft className="h-4 w-4" /> Keluarga
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
          <p className="text-sm text-muted-foreground mt-1 leading-6">Buat link, bagikan ke keluarga. Mereka cukup buka link lalu masuk — langsung tergabung. Link berlaku 7 hari.</p>
          {!inviteUrl ? (
            <Button className="w-full rounded-full mt-5 min-h-[44px]" onClick={handleCreateInvite} disabled={inviteLoading}>
              {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-1.5" />} Buat link undangan
            </Button>
          ) : (
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border bg-muted px-3 py-2.5 text-xs truncate font-mono">{inviteUrl}</div>
              <Button className="w-full rounded-full min-h-[44px]" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1.5" /> {copied ? "Tersalin ✓" : "Salin link"}
              </Button>
              <button onClick={handleCreateInvite} disabled={inviteLoading} className="w-full text-xs text-muted-foreground underline underline-offset-2">
                Buat link baru
              </button>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
