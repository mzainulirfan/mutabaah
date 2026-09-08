"use client";
import { useEffect, useState } from "react";

export function SWRegister() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const on = () => setOffline(!navigator.onLine);
    on();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  if (!offline) return null;
  return <div className="sticky top-0 z-50 bg-amber-100 border-b border-amber-200 text-amber-900 text-xs text-center py-2">Offline — perubahan akan disinkronkan.</div>;
}
