"use client";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toast({ kind, message }: { kind: "success" | "error"; message: string | null }) {
  if (!message) return null;
  const error = kind === "error";
  return (
    <div className="fixed top-4 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none" aria-live="polite">
      <div
        role={error ? "alert" : "status"}
        className={cn(
          "pointer-events-auto flex max-w-[480px] items-center gap-2 rounded-full pl-4 pr-5 py-2.5 text-sm font-medium shadow-lg animate-toast-in",
          error ? "bg-red-700 text-white" : "bg-[#17452F] text-white"
        )}
      >
        {error ? (
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="truncate">{message}</span>
      </div>
    </div>
  );
}
