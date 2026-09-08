"use client";

import { useEffect, useState } from "react";
import { localDateKey } from "@/lib/local-date";

/** Nilai berubah tepat setelah tengah malam lokal dan ketika tab kembali aktif. */
export function useLocalDayKey() {
  const [dayKey, setDayKey] = useState(() => localDateKey());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => setDayKey((current) => {
      const next = localDateKey();
      return current === next ? current : next;
    });
    const schedule = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, nextMidnight.getTime() - now.getTime() + 50);
    };

    schedule();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return dayKey;
}
