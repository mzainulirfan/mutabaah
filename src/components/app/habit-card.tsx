"use client";
import { cn } from "@/lib/utils";
import { Check, Minus, Plus, User, Users } from "lucide-react";
import type { Habit, Entry } from "@/lib/habits";
import { getHabitProgress } from "@/lib/habits";

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
  const step = habit.type === "DURATION" ? 5 : 1;
  const shownValue = Math.min(entry?.value ?? 0, habit.target);

  // Sholat yang belum dipilih konteksnya: kartu adalah kontrol tersegmentasi,
  // bukan kartu mati berisi tombol — tanpa lingkaran, tanpa hover palsu.
  if (needsPlaceChoice) {
    return (
      <div className="rounded-[20px] border bg-card p-3.5 sm:p-4">
        <h4 className="font-semibold text-[15px] leading-5">{habit.name}</h4>
        <div className="mt-2.5 flex gap-1 rounded-full bg-muted p-1" role="group" aria-label={`Tandai ${habit.name} selesai`}>
          <button
            type="button"
            onClick={() => onPickContext?.("SENDIRI")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <User className="h-3.5 w-3.5" aria-hidden="true" /> Sendiri
          </button>
          <button
            type="button"
            onClick={() => onPickContext?.("BERJAMAAH")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-full bg-card border border-primary/25 px-3 py-2 text-xs font-semibold text-primary shadow-sm active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" /> Berjamaah
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      aria-pressed={isCompleted}
      aria-label={isCompleted ? `${habit.name}, sudah selesai — ketuk untuk membatalkan` : `Tandai ${habit.name} selesai`}
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
          isCompleted
            ? "bg-primary border-primary text-white shadow-sm"
            : isPartial
              ? "bg-white border-amber-400 text-amber-600"
              : "bg-white border-border text-transparent group-hover:border-primary/30"
        )}
      >
        {isCompleted ? <Check className="h-5 w-5" strokeWidth={3} /> : isPartial ? <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> : <Check className="h-5 w-5" />}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn("font-semibold text-[15px] leading-5 truncate", isCompleted ? "text-primary" : "text-foreground")}>{habit.name}</h4>
          {isCompleted && entry?.context === "BERJAMAAH" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
              <Users className="h-3 w-3" aria-hidden="true" /> Berjamaah
            </span>
          )}
          {isPartial && <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full tabular-nums shrink-0">{progress}%</span>}
        </div>

        {showCounter ? (
          <div className="mt-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateValue(-step);
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
                  onUpdateValue(step);
                }}
                disabled={isCompleted}
                className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-[#134d39] active:scale-95 transition-transform shadow-sm disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Tambah ${habit.name}`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="h-1.5 rounded-full bg-black/5 overflow-hidden mt-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Kemajuan ${habit.name}`}>
              <div className={cn("h-full rounded-full transition-all duration-500", isPartial ? "bg-amber-500" : "bg-primary")} style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : isCompleted && isSholatWajib && onPickContext ? (
          <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <span className="text-xs text-muted-foreground">{entry?.context === "BERJAMAAH" ? "Berjamaah di masjid" : "Sholat sendiri"}</span>
            <span className="text-muted-foreground" aria-hidden="true">·</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPickContext?.(entry?.context === "BERJAMAAH" ? "SENDIRI" : "BERJAMAAH");
              }}
              className="text-xs font-medium text-primary underline underline-offset-2 rounded px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Ubah ${habit.name} menjadi ${entry?.context === "BERJAMAAH" ? "sholat sendiri" : "berjamaah di masjid"}`}
            >
              Ubah
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
