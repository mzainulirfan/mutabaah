"use client";
import { cn } from "@/lib/utils";
import { Check, Minus, Plus, Clock } from "lucide-react";
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
        "group flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all",
        isCompleted ? "border-primary/20 bg-[var(--primary-soft)]/50" : "hover:border-primary/20 hover:shadow-soft",
        isPartial && "border-amber-200 bg-amber-50/40"
      )}
    >
      {/* Checkbox / status */}
      <button
        onClick={onToggle}
        aria-label={isCompleted ? "Batalkan" : "Selesaikan"}
        className={cn(
          "h-11 w-11 shrink-0 rounded-full border-2 flex items-center justify-center transition-all active:scale-95",
          isCompleted
            ? "bg-primary border-primary text-white shadow-sm"
            : isPartial
              ? "bg-white border-amber-400 text-amber-600"
              : "bg-white border-border text-transparent hover:border-primary/40"
        )}
      >
        {isCompleted ? (
          <Check className="h-5 w-5" strokeWidth={3} />
        ) : isPartial ? (
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
        ) : (
          <Check className="h-5 w-5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn("font-medium text-[14px] leading-5 truncate", isCompleted && "text-primary")}>
            {habit.name}
          </h4>
          {isCompleted && <span className="text-[11px] font-semibold text-primary bg-white px-1.5 py-0.5 rounded-full">✓</span>}
          {isPartial && <span className="text-[11px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">{progress}%</span>}
        </div>

        {showCounter ? (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdateValue(-1)}
                className="h-7 w-7 rounded-full border bg-white flex items-center justify-center hover:bg-muted"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-[84px] text-center">
                <span className="font-semibold text-sm">
                  {entry?.value ?? 0} / {habit.target}
                </span>
                <span className="text-xs text-muted-foreground ml-1">{habit.unit}</span>
              </div>
              <button
                onClick={() => onUpdateValue(1)}
                className="h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-[#134d39]"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="hidden sm:flex h-1.5 flex-1 max-w-[96px] rounded-full bg-muted overflow-hidden ml-2">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5">{habit.category}</p>
        )}
      </div>

      {habit.type === "DURATION" && (
        <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {habit.target} menit
        </span>
      )}
    </div>
  );
}
