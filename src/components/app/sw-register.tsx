"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, WifiOff } from "lucide-react";

export function SWRegister() {
  const [offline, setOffline] = useState(false);
  const [deferred, setDeferred] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const on = () => setOffline(!navigator.onLine);
    on();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setShowInstall(false);
      setDeferred(null);
    });

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setShowInstall(false);
  };

  return (
    <>
      {offline && <div className="sticky top-0 z-50 bg-amber-100 border-b border-amber-200 text-amber-900 text-xs text-center py-2 flex items-center justify-center gap-1.5"><WifiOff className="h-3.5 w-3.5" /> Offline — perubahan akan disinkronkan.</div>}
      {showInstall && !offline && (
        <div className="fixed bottom-[88px] lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 z-40 max-w-[360px] ml-auto">
          <div className="rounded-2xl bg-card border shadow-card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold shrink-0">م</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Install Mutabaah</div>
              <div className="text-xs text-muted-foreground">Akses cepat dari HP — tanpa App Store.</div>
            </div>
            <Button size="sm" onClick={install} className="rounded-full shrink-0">
              <Download className="h-4 w-4 mr-1" /> Install
            </Button>
            <button onClick={() => setShowInstall(false)} aria-label="Tutup" className="h-11 w-11 rounded-full flex items-center justify-center hover:bg-muted shrink-0">
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
