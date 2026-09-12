"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Share, Flame } from "@/components/ui/hugeicons";
import { createClient } from "@/lib/supabase/client";
import { dailyProgress, calcStreak } from "@/lib/progress";
import type { EntryRow } from "@/lib/supabase/types";
import { getErrorMessage } from "@/lib/utils";
import { Toast } from "@/components/ui/toast";
import { getFamilyContext, getSessionUser } from "@/lib/family-context";

type MemberReport = {
  id: string;
  name: string;
  avg: number;
  activeDays: number;
  totalDays: number;
  streak: number;
  perfect: number;
  top: { name: string; pct: number } | null;
  low: { name: string; pct: number } | null;
};

function shareText(familyName: string, monthLabel: string, r: MemberReport): string {
  const lines = [
    `Laporan Mutabaah — ${r.name} (${monthLabel})`,
    `Keluarga ${familyName}`,
    `Rata-rata: ${r.avg}% · Terisi ${r.activeDays}/${r.totalDays} hari · Rangkaian: ${r.streak} hari`,
  ];
  if (r.top) lines.push(`Paling terjaga: ${r.top.name} (${r.top.pct}%)`);
  if (r.low && r.low.name !== r.top?.name) lines.push(`Perlu ditemani: ${r.low.name} (${r.low.pct}%)`);
  return lines.join("\n");
}

export default function LaporanPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [familyName, setFamilyName] = useState("Keluarga");
  const [monthOffset, setMonthOffset] = useState(0);
  const [monthLoading, setMonthLoading] = useState(false);
  const [reports, setReports] = useState<MemberReport[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const monthMeta = useMemo(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = first.getFullYear();
    const mon = first.getMonth();
    const daysInMonth = new Date(year, mon + 1, 0).getDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      label: first.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      start: `${year}-${pad(mon + 1)}-01`,
      elapsed: monthOffset === 0 ? now.getDate() : daysInMonth,
      daysInMonth,
    };
  }, [monthOffset]);

  const load = useCallback(async () => {
    const user = await getSessionUser(supabase);
    if (!user) { setLoading(false); return; }
    const family = await getFamilyContext(supabase, user.id);
    if (!family) { setLoading(false); return; }
    if (family.role !== "OWNER" && family.role !== "PARENT") { setDenied(true); setLoading(false); return; }
    setFamilyName(family.familyName);
    setMonthLoading(true);
    try {
      const [y, m] = monthMeta.start.split("-").map(Number);
      const endEx = new Date(y, m, 1);
      const endIso = `${endEx.getFullYear()}-${String(endEx.getMonth() + 1).padStart(2, "0")}-01`;
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("user_id,habit_id,value,date")
        .eq("family_id", family.familyId)
        .gte("date", monthMeta.start)
        .lt("date", endIso);
      const rows = ((data ?? []) as EntryRow[]);
      const habits = family.habits;
      const isos: string[] = [];
      const pad = (n: number) => String(n).padStart(2, "0");
      for (let d = 1; d <= monthMeta.elapsed; d++) {
        const dt = new Date(y, m - 1, d);
        isos.push(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(d)}`);
      }
      const pctOf = (userId: string, iso: string) =>
        dailyProgress(
          habits.map((h) => {
            const e = rows.find((x) => x.user_id === userId && x.date === iso && x.habit_id === h.id);
            return { type: h.type, target: Number(h.target_value), value: e ? Number(e.value) : 0 };
          })
        );
      setReports(
        family.members.map((mem) => {
          const daily = isos.map((iso) => pctOf(mem.user_id, iso));
          const avg = daily.length ? Math.round(daily.reduce((a, b) => a + b, 0) / daily.length) : 0;
          const perHabit = habits.map((h) => {
            const target = Number(h.target_value) || 1;
            const vals = isos.map((iso) => {
              const e = rows.find((x) => x.user_id === mem.user_id && x.date === iso && x.habit_id === h.id);
              const v = e ? Number(e.value) : 0;
              if (h.type === "BOOLEAN") return v ? 100 : 0;
              return Math.round(Math.min(100, (v / target) * 100));
            });
            return { name: h.name, pct: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 };
          });
          perHabit.sort((a, b) => b.pct - a.pct);
          return {
            id: mem.user_id,
            name: mem.name,
            avg,
            activeDays: daily.filter((v) => v > 0).length,
            totalDays: daily.length,
            streak: calcStreak(daily),
            perfect: daily.filter((v) => v === 100).length,
            top: perHabit.length > 0 ? perHabit[0] : null,
            low: perHabit.length > 1 ? perHabit[perHabit.length - 1] : null,
          };
        })
      );
    } finally {
      setMonthLoading(false);
      setLoading(false);
    }
  }, [supabase, monthMeta]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  const goMonth = (delta: number) => {
    setMonthOffset((v) => Math.max(-11, Math.min(0, v + delta)));
  };

  const handleShare = async (r: MemberReport) => {
    const text = shareText(familyName, monthMeta.label, r);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Laporan ${r.name}`, text });
        return;
      }
      throw new Error("no-share");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setMsg("Ringkasan tersalin — tempel ke WhatsApp.");
      } catch {
        setMsg(getErrorMessage(new Error("Gagal membagikan.")));
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Memuat laporan">
        <div className="h-10 w-40 rounded-full bg-muted" />
        <div className="h-48 rounded-[20px] bg-muted" />
      </div>
    );
  }

  if (denied) {
    return (
      <Card className="p-8 text-center rounded-[24px] border-dashed">
        <h2 className="font-bold text-lg">Halaman orang tua</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-6">Laporan hanya untuk pemilik dan orang tua.</p>
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
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">Laporan</h1>
          <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label="Pilih bulan">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              disabled={monthOffset <= -11 || monthLoading}
              aria-label="Bulan sebelumnya"
              className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-[11px] font-semibold capitalize tabular-nums min-w-[86px] text-center" aria-live="polite">
              {monthLoading ? "Memuat…" : monthMeta.label}
            </span>
            <button
              type="button"
              onClick={() => goMonth(1)}
              disabled={monthOffset >= 0 || monthLoading}
              aria-label="Bulan berikutnya"
              className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Rekap per anggota — bahan pendampingan, bukan penilaian.</p>
      </div>

      {msg && <Toast kind="success" message={msg} />}

      {reports.length === 0 ? (
        <Card className="p-8 text-center rounded-[24px] border-dashed">
          <p className="text-sm text-muted-foreground">Belum ada data pada bulan ini.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((r) => (
            <Card key={r.id} className="rounded-[20px] p-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center font-bold text-primary shrink-0" aria-hidden="true">
                  {r.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                    {r.avg}% rata-rata · {r.activeDays}/{r.totalDays} hari terisi
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full shrink-0"
                  onClick={() => void handleShare(r)}
                  aria-label={`Bagikan laporan ${r.name}`}
                >
                  <Share className="h-4 w-4 mr-1.5" aria-hidden="true" /> Bagikan
                </Button>
              </div>
              <dl className="mt-4 pt-4 border-t border-border/60 grid grid-cols-3 gap-2 text-center">
                <div>
                  <dt className="text-[11px] text-muted-foreground">Rangkaian</dt>
                  <dd className="font-bold mt-0.5 tabular-nums flex items-center justify-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> {r.streak}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Hari penuh</dt>
                  <dd className="font-bold mt-0.5 tabular-nums">{r.perfect}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Rata-rata</dt>
                  <dd className="font-bold mt-0.5 tabular-nums">{r.avg}%</dd>
                </div>
              </dl>
              {(r.top ?? r.low) && (
                <div className="mt-3 space-y-1.5 text-xs leading-5">
                  {r.top && (
                    <p>
                      <span className="font-semibold text-primary">Terjaga: </span>
                      <span className="text-muted-foreground">{r.top.name} ({r.top.pct}%)</span>
                    </p>
                  )}
                  {r.low && r.low.name !== r.top?.name && (
                    <p>
                      <span className="font-semibold text-amber-700">Temani: </span>
                      <span className="text-muted-foreground">{r.low.name} ({r.low.pct}%)</span>
                    </p>
                  )}
                </div>
              )}
              <Link
                href={`/keluarga/anggota/${r.id}`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary rounded-full px-2 py-1.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Lihat detail <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
