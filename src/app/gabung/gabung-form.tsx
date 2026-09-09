"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Check, Loader2, TicketCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils";

type Preview = { familyId: string; familyName: string };

export function GabungForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [joining, setJoining] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      setLoggedIn(!!data.user);
      setChecking(false);
    })();
  }, [supabase]);

  const handleSearch = async () => {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z0-9]{6}$/.test(clean)) {
      setCodeError("Kode terdiri dari 6 huruf/angka — contoh: K7M2PQ.");
      return;
    }
    setCodeError(null);
    setNotice(null);
    setPreview(null);
    setSearching(true);
    try {
      const { data, error } = await supabase.rpc("get_invitation_by_code", { p_code: clean });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as { family_id: string; family_name: string }[];
      if (rows.length === 0) {
        setNotice("Kode tidak ditemukan atau sudah tidak berlaku. Periksa lagi penulisannya.");
        return;
      }
      setPreview({ familyId: rows[0].family_id, familyName: rows[0].family_name });
    } catch (e: unknown) {
      setNotice(getErrorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  const handleJoin = async () => {
    if (!preview) return;
    setNotice(null);
    setJoining(true);
    try {
      const { acceptInvitationByCode } = await import("@/lib/actions/family");
      await acceptInvitationByCode(code.trim().toUpperCase());
      router.push("/beranda");
    } catch (e: unknown) {
      setNotice(getErrorMessage(e));
      setJoining(false);
    }
  };

  if (checking) {
    return (
      <Card className="mt-6 p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground" aria-busy="true" aria-label="Memuat">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Menyiapkan…
      </Card>
    );
  }

  if (!loggedIn) {
    return (
      <Card className="mt-6 p-6 sm:p-8 text-center">
        <h2 className="font-semibold text-lg">Masuk dulu, yuk</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-6">
          Kamu perlu akun untuk bergabung ke keluarga. Daftar gratis — cukup email dan kata sandi.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/daftar?next=/gabung" className="inline-flex items-center justify-center h-12 px-7 text-[15px] rounded-full font-medium bg-primary text-primary-foreground hover:bg-[#134d39] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Daftar gratis
          </Link>
          <Link href="/login?next=/gabung" className="inline-flex items-center justify-center h-12 px-7 text-[15px] rounded-full font-medium bg-white text-foreground border hover:bg-muted transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Saya sudah punya akun
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="mt-6">
      {notice && (
        <div className="mb-4 rounded-2xl bg-[var(--destructive-soft)] border border-red-200 px-4 py-2.5 text-sm text-red-700" role="alert">
          {notice}
        </div>
      )}

      {!preview ? (
        <Card className="p-6 sm:p-8">
          <h2 className="font-semibold text-lg">Masukkan kode undangan</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-6">Minta 6 huruf/angka dari orang tuamu — misalnya lewat chat keluarga.</p>
          <div className="mt-4">
            <label htmlFor="invite-code" className="text-sm font-medium">
              Kode undangan
            </label>
            <input
              id="invite-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
                if (codeError) setCodeError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSearch();
              }}
              placeholder="••••••"
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!codeError}
              aria-describedby={codeError ? "invite-code-error" : undefined}
              className="mt-1.5 w-full rounded-xl border bg-card px-4 py-3 text-center font-mono font-bold text-2xl tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40"
            />
            {codeError && (
              <p id="invite-code-error" className="mt-2 text-[13px] text-red-700" role="alert">
                {codeError}
              </p>
            )}
          </div>
          <Button size="lg" className="w-full mt-5" onClick={() => void handleSearch()} disabled={searching || code.trim().length !== 6}>
            {searching && <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />}
            {searching ? "Mencari undangan…" : "Cari undangan"}
          </Button>
        </Card>
      ) : (
        <Card className="p-6 sm:p-8 text-center">
          <span className="mx-auto h-14 w-14 rounded-full bg-[var(--primary-soft)] flex items-center justify-center" aria-hidden="true">
            <TicketCheck className="h-7 w-7 text-primary" />
          </span>
          <h2 className="font-semibold text-xl mt-4">Bergabung ke {preview.familyName}?</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-6">
            Sebagai anggota — kamu bisa melihat target dan mengisi mutabaah sendiri. Data keluarga privat.
          </p>
          <div className="mt-6 grid gap-2">
            <Button size="lg" className="w-full" onClick={() => void handleJoin()} disabled={joining}>
              {joining ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" /> : <Check className="h-4 w-4 mr-2" aria-hidden="true" />}
              {joining ? "Bergabung…" : "Konfirmasi & Join Keluarga"}
            </Button>
            <Button variant="secondary" size="md" className="w-full" onClick={() => { setPreview(null); setCode(""); }}>
              Gunakan kode lain
            </Button>
          </div>
          <Link href="/beranda" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            Nanti saja <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </Card>
      )}
    </div>
  );
}
