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
}: {
  habit: Habit;
  entry: Entry | undefined;
  onToggle: () => void;
  onUpdateValue: (delta: number) => void;
}) {
  const progress = getHabitProgress(habit, entry);
  const isCompleted = progress === 100;
  const isPartial = progress > 0 && progress < 100;
  const showCounter = habit.type !== "BOOLEAN";

  return (
    <div
      className={cn(
        "group flex items-center gap-3.5 rounded-[20px] border bg-card p-3.5 sm:p-4 transition-all",
        isCompleted ? "border-primary/20 bg-[var(--primary-soft)]/60" : "hover:border-primary/15 hover:shadow-soft",
        isPartial && "border-amber-200 bg-amber-50/40"
      )}
    >
      <button
        onClick={onToggle}
        aria-label={isCompleted ? "Batalkan" : "Selesaikan"}
        aria-pressed={isCompleted}
        className={cn(
          "h-12 w-12 shrink-0 rounded-full border-2 flex items-center justify-center transition-all active:scale-95",
          isCompleted ? "bg-primary border-primary text-white shadow-sm" : isPartial ? "bg-white border-amber-400 text-amber-600" : "bg-white border-border text-transparent hover:border-primary/30"
        )}
      >
        {isCompleted ? <Check className="h-5 w-5" strokeWidth={3} /> : isPartial ? <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> : <Check className="h-5 w-5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn("font-semibold text-[15px] leading-5 truncate", isCompleted ? "text-primary" : "text-foreground")}>{habit.name}</h4>
          {isCompleted && <span className="hidden sm:inline text-[11px] font-semibold text-primary bg-white px-2 py-0.5 rounded-full border border-primary/10">Selesai</span>}
          {isPartial && <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{progress}%</span>}
        </div>
        {showCounter ? (
          <div className="flex items-center gap-2.5 mt-1.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdateValue(habit.type === "DURATION" ? -5 : -1)}
                className="h-8 w-8 rounded-full border bg-white flex items-center justify-center hover:bg-muted active:scale-95 transition-transform"
                aria-label="Kurangi"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-[86px] text-center">
                <span className="font-bold text-sm">
                  {Math.min(entry?.value ?? 0, habit.target)} / {habit.target}
                </span>
                <span className="text-xs text-muted-foreground ml-1">{habit.unit ?? (habit.type === "DURATION" ? "menit" : "")}</span>
                {isCompleted && (entry?.value ?? 0) > habit.target && <span className="text-[10px] text-primary ml-1">cap</span>}
              </div>
              <button
                onClick={() => onUpdateValue(habit.type === "DURATION" ? 5 : 1)}
                disabled={isCompleted}
                className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-[#134d39] active:scale-95 transition-transform shadow-sm disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Tambah"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="hidden sm:block h-2 flex-1 max-w-[100px] rounded-full bg-muted overflow-hidden ml-1">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">{habit.category}</p>
        )}
      </div>
    </div>
  );
}
