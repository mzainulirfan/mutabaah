"use client";
import { useEffect, useRef, useState } from "react";
import { Amiri_Quran } from "next/font/google";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen, Check, X } from "lucide-react";

const amiriQuran = Amiri_Quran({ subsets: ["arabic"], weight: ["400"], display: "swap" });

type PageData = { page: number; juz: number; ayahs: { surah: number; surah_name: string; ayah: number; text: string }[] };

export function QuranReader({
  open,
  onClose,
  habitId,
  date,
  initialPage,
  onCounted,
}: {
  open: boolean;
  onClose: () => void;
  habitId: string;
  date: string;
  initialPage: number;
  onCounted?: (page: number, value: number) => void;
}) {
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<PageData | null>(null);
  const [counted, setCounted] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setPage(initialPage); }, [initialPage, open]);

  useEffect(() => {
    if (!open) return;
    import("@/lib/quran")
      .then(({ getMadinahPage }) => getMadinahPage(page))
      .then(setData)
      .catch(() => fetch(`/quran/madinah-604.json?v=2`).then((r) => r.json()).then((all: PageData[]) => setData(all.find((p) => p.page === page) ?? null)));
  }, [page, open]);

  useEffect(() => {
    if (!open || !data || !scrollRef.current || !endRef.current) return;
    const root = scrollRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (root.scrollTop + root.clientHeight < root.scrollHeight - 24) return;
        if (counted.has(page)) return;
        (async () => {
          try {
            const { readPage } = await import("@/lib/actions/reading");
            const res = await readPage({ habit_id: habitId, page, date });
            if (res.counted) {
              setCounted((s) => new Set([...s, page]));
              setToast(`Alhamdulillah +1 halaman`);
              onCounted?.(page, res.value);
              setTimeout(() => setToast(null), 2200);
            } else {
              setToast(`Halaman ${page} sudah dihitung hari ini`);
              setTimeout(() => setToast(null), 1600);
            }
          } catch (e: any) {
            setToast(e.message);
            setTimeout(() => setToast(null), 2000);
          }
        })();
      },
      { root, threshold: 0.9 }
    );
    observer.observe(endRef.current);
    return () => observer.disconnect();
  }, [data, page, open, counted, habitId, date, onCounted]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [page]);

  if (!open) return null;

  const surahName = data?.ayahs[0]?.surah_name ?? "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FDFCF9]">
      <div className="h-14 border-b border-[#E4DCC8] flex items-center justify-between px-4 bg-white">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup">
          <X className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <div className="text-sm font-medium flex items-center gap-1.5 justify-center">
            <BookOpen className="h-4 w-4 text-primary" /> Mushaf Madinah
          </div>
          <div className="text-xs text-muted-foreground">Juz {data?.juz ?? "-"} • Hal {page} / 604</div>
        </div>
        <div className={`text-xs px-2.5 py-1 rounded-full border ${counted.has(page) ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-muted"}`}>
          {counted.size} hari ini
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F6F1E7] border-b border-[#E4DCC8]">
        <Button variant="secondary" size="sm" className="rounded-full" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" /> Sebelumnya
        </Button>
        <span className="text-sm font-medium">Halaman {page}</span>
        <Button variant="secondary" size="sm" className="rounded-full" onClick={() => setPage((p) => Math.min(604, p + 1))} disabled={page >= 604}>
          Berikutnya <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#FDFCF9] flex justify-center">
        <div className="w-full max-w-[560px] p-4 sm:p-6">
          <div className="bg-white border border-[#E4DCC8] rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-[#F6F1E7] border-b border-[#E4DCC8] px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Juz {data?.juz ?? "-"}</span>
              <span className={`font-serif text-sm ${amiriQuran.className}`}>سورة {surahName}</span>
              <span className="text-xs text-muted-foreground">Hal {page}</span>
            </div>

            <div className={`px-6 sm:px-8 py-8 ${amiriQuran.className}`}>
              {data ? (
                <>
                  {data.page !== 1 && data.ayahs[0]?.ayah === 1 && (
                    <div className="text-center mb-7">
                      <span className="inline-block border border-[#E4DCC8] rounded-full px-5 py-1.5 text-[15px] bg-[#F6F1E7] tracking-wide" style={{ fontFamily: amiriQuran.style.fontFamily }}>
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                      </span>
                    </div>
                  )}
                  <div className="text-right text-[26px] sm:text-[28px] text-[#1a1a1a] text-justify leading-[2.6]" style={{ fontFamily: amiriQuran.style.fontFamily, wordSpacing: "6px", textAlignLast: "center" }}>
                    {data.ayahs.map((a) => (
                      <span key={`${a.surah}:${a.ayah}`} className="inline">
                        {a.text}
                        <span className="inline-flex items-center justify-center mx-1 align-middle translate-y-[-1px]">
                          <span className="inline-flex h-5 min-w-5 px-1 items-center justify-center text-[13px] text-[#7A4C15]" style={{ fontFamily: "Inter, sans-serif" }}>
                            ﴿{a.ayah}﴾
                          </span>
                        </span>{" "}
                      </span>
                    ))}
                  </div>
                  <div className="text-center mt-8">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#E4DCC8] bg-[#F6F1E7] text-xs font-medium">{page}</span>
                  </div>
                </>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-12">Memuat halaman...</div>
              )}
            </div>
          </div>

          <div ref={endRef} className="h-10 mt-6 flex flex-col items-center gap-2">
            {counted.has(page) ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Sudah dihitung • scroll ke atas untuk lanjut
              </span>
            ) : (
              <span className="text-xs text-muted-foreground border-t border-[#E4DCC8] pt-3">Gulir sampai akhir halaman ini untuk menambah 1 halaman Tilawah</span>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#20362C] text-white px-4 py-2 rounded-full text-sm shadow-lg z-50">{toast}</div>}
    </div>
  );
}
