"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LainnyaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!supabase) { setLoading(false); return; }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      const { data: mem } = await supabase.from("mutabaah_family_members").select("family_id").eq("user_id", auth.user.id).maybeSingle();
      if (!mem) { setLoading(false); return; }
      const { data: fam } = await supabase.from("mutabaah_families").select("id,name").eq("id", mem.family_id).single();
      if (fam) { setFamily(fam); setEditName(fam.name); }
      setLoading(false);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  const handleSaveName = async () => {
    if (!family || !editName.trim() || editName.trim() === family.name) return;
    setSavingName(true);
    try {
      const { updateFamily } = await import("@/lib/actions/family");
      const fd = new FormData();
      fd.set("name", editName.trim());
      await updateFamily(family.id, fd);
      setFamily({ ...family, name: editName.trim() });
      setMsg("Nama keluarga diperbarui.");
    } catch (e: any) { setMsg(e.message); } finally { setSavingName(false); }
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Memuat pengaturan">
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
        <h1 className="text-[26px] font-bold tracking-tight leading-tight mt-2">Lainnya</h1>
        <p className="text-sm text-muted-foreground mt-1">Nama keluarga dan tampilan.</p>
      </div>

      {msg && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2" role="status"><Check className="h-4 w-4 shrink-0" /> {msg}</div>}

      <Card className="rounded-[20px] p-5">
        <h2 className="font-semibold text-sm">Nama keluarga</h2>
        <p className="text-xs text-muted-foreground mt-1">Nama ini tampil di beranda semua anggota.</p>
        <div className="mt-3 flex gap-2">
          <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nama keluarga" aria-label="Nama keluarga" className="flex-1 min-w-0 rounded-xl border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <Button size="sm" className="rounded-full shrink-0 min-h-[44px]" onClick={handleSaveName} disabled={savingName || !editName.trim() || !family || editName.trim() === family.name}>
            {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
          </Button>
        </div>
      </Card>

      <Card className="rounded-[20px] p-5">
        <h2 className="font-semibold text-sm">Rangkaian hari</h2>
        <p className="text-xs text-muted-foreground mt-1 leading-5">Pengingat visual berapa hari berturut-turut terisi. Sembunyikan kalau ingin suasana lebih tenang.</p>
        <label className="mt-3 flex items-center justify-between rounded-2xl border p-3 cursor-pointer hover:bg-muted/30 min-h-[44px]">
          <span className="text-sm font-medium">Tampilkan rangkaian</span>
          <input
            type="checkbox"
            defaultChecked
            onChange={(e) => {
              localStorage.setItem("mutabaah:streak", e.target.checked ? "1" : "0");
              setMsg(e.target.checked ? "Rangkaian ditampilkan." : "Rangkaian disembunyikan. Lebih tenang, ya.");
            }}
            className="h-5 w-5 accent-[var(--primary)]"
          />
        </label>
        <p className="text-xs text-muted-foreground mt-2 leading-5">Ini bukan papan peringkat — hanya pengingat pribadi tiap anggota.</p>
      </Card>
    </div>
  );
}
