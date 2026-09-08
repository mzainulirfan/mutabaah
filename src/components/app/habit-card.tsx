"use client";
import { cn } from "@/lib/utils";
import { Check, Minus, Plus } from "lucide-react";
import type { Habit, Entry } from "@/lib/mock-data";
import { getHabitProgress } from "@/lib/mock-data";

export function HabitCard({
  habit,
  entry,
  onToggle,
  onUpdateValue,
  onPickContext,
}: {
  habit: Habit;
  entry: Entry | undefined;
  onToggle: () => void;
  onUpdateValue: (delta: number) => void;
  onPickContext?: (ctx: "SENDIRI" | "BERJAMAAH") => void;
}) {
  const progress = getHabitProgress(habit, entry);
  const isCompleted = progress === 100;
  const isPartial = progress > 0 && progress < 100;
  const showCounter = habit.type !== "BOOLEAN";
  const isSholatWajib = habit.category === "Ibadah Wajib";
  const needsPlaceChoice = isSholatWajib && !isCompleted && !!onPickContext;
  const unitLabel = habit.unit ?? (habit.type === "DURATION" ? "menit" : "");
  const shownValue = Math.min(entry?.value ?? 0, habit.target);

  const handleCardActivate = () => {
    // Sholat wajib yang belum selesai: pilih dulu Sendiri/Berjamaah (tidak langsung selesai)
    if (needsPlaceChoice) return;
    onToggle();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardActivate}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardActivate();
        }
      }}
      aria-pressed={isCompleted}
      aria-label={
        needsPlaceChoice
          ? `${habit.name} — pilih Sendiri atau Berjamaah di masjid untuk menandai selesai`
          : isCompleted
            ? `${habit.name}, sudah selesai — ketuk untuk membatalkan`
            : `Tandai ${habit.name} selesai`
      }
      className={cn(
        "group flex items-center gap-3.5 rounded-[20px] border bg-card p-3.5 sm:p-4 transition-all cursor-pointer select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isCompleted ? "border-primary/20 bg-[var(--primary-soft)]/60" : "hover:border-primary/15 hover:shadow-soft",
        isPartial && "border-amber-200 bg-amber-50/40"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-12 w-12 shrink-0 rounded-full border-2 flex items-center justify-center transition-all group-active:scale-95",
          isCompleted ? "bg-primary border-primary text-white shadow-sm" : isPartial ? "bg-white border-amber-400 text-amber-600" : "bg-white border-border text-transparent group-hover:border-primary/30"
        )}
      >
        {isCompleted ? <Check className="h-5 w-5" strokeWidth={3} /> : isPartial ? <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> : <Check className="h-5 w-5" />}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn("font-semibold text-[15px] leading-5 truncate", isCompleted ? "text-primary" : "text-foreground")}>{habit.name}</h4>
          {isCompleted && <span className="text-[11px] font-semibold text-primary bg-white px-2 py-0.5 rounded-full border border-primary/10">Selesai</span>}
          {isCompleted && entry?.context === "BERJAMAAH" && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Berjamaah 🕌</span>
          )}
          {isPartial && <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full tabular-nums">{progress}%</span>}
        </div>
        {showCounter ? (
          <div className="flex items-center gap-2.5 mt-1.5">
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateValue(habit.type === "DURATION" ? -5 : -1);
                }}
                className="h-10 w-10 rounded-full border bg-white flex items-center justify-center hover:bg-muted active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Kurangi ${habit.name}`}
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="min-w-[86px] text-center tabular-nums" aria-live="polite" aria-label={`${shownValue} dari ${habit.target} ${unitLabel}`}>
                <span className="font-bold text-sm">
                  {shownValue} / {habit.target}
                </span>
                {unitLabel ? <span className="text-xs text-muted-foreground ml-1">{unitLabel}</span> : null}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateValue(habit.type === "DURATION" ? 5 : 1);
                }}
                disabled={isCompleted}
                className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-[#134d39] active:scale-95 transition-transform shadow-sm disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Tambah ${habit.name}`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="hidden sm:block h-2 flex-1 max-w-[100px] rounded-full bg-muted overflow-hidden ml-1" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Kemajuan ${habit.name}`}>
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : needsPlaceChoice ? (
          <div className="mt-2">
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPickContext?.("SENDIRI");
                }}
                className="flex-1 min-h-[44px] rounded-full border bg-white px-3 py-2 text-xs font-medium hover:bg-muted active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Tandai ${habit.name} selesai — sholat sendiri`}
              >
                Sendiri
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPickContext?.("BERJAMAAH");
                }}
                className="flex-1 min-h-[44px] rounded-full border border-primary/25 bg-[var(--primary-soft)]/50 px-3 py-2 text-xs font-medium text-primary hover:bg-[var(--primary-soft)] active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Tandai ${habit.name} selesai — berjamaah di masjid`}
              >
                Berjamaah di masjid
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Pilih salah satu untuk menandai selesai.</p>
          </div>
        ) : isCompleted && isSholatWajib && onPickContext ? (
          <div className="mt-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <span className="text-xs text-muted-foreground">{entry?.context === "BERJAMAAH" ? "Berjamaah di masjid" : "Sholat sendiri"}</span>
            <span className="text-muted-foreground" aria-hidden="true">·</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPickContext?.(entry?.context === "BERJAMAAH" ? "SENDIRI" : "BERJAMAAH");
              }}
              className="text-xs font-medium text-primary underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Ubah ${habit.name} menjadi ${entry?.context === "BERJAMAAH" ? "sholat sendiri" : "berjamaah di masjid"}`}
            >
              Ubah
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">{isCompleted ? "Alhamdulillah, sudah terisi hari ini." : "Ketuk lingkaran untuk menandai selesai."}</p>
        )}
      </div>
    </div>
  );
}
