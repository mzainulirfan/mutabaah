import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GabungForm } from "./gabung-form";

export const metadata: Metadata = {
  title: "Gabung Keluarga — Mutabaah",
  description: "Bergabung ke keluarga dengan kode undangan 6 huruf.",
};

export default async function GabungPage() {
  // "Lewati" mengikuti status login: yang belum masuk diarahkan ke login,
  // bukan ke beranda (yang akan memantulkan kembali).
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const skipHref = data.user ? "/beranda" : "/login";
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[480px] mx-auto px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold rounded-full" aria-label="Kembali ke beranda Mutabaah">
            <span className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold" aria-hidden="true">
              م
            </span>
            Mutabaah
          </Link>
          <Link href={skipHref} className="text-xs text-muted-foreground underline underline-offset-4 rounded-full px-2 py-1">
            Lewati
          </Link>
        </div>

        <h1 className="mt-8 text-[28px] font-bold tracking-tight leading-tight">Gabung keluarga</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-6">Satu kode, langsung tergabung. Tanpa link, tanpa ribet.</p>

        <GabungForm />
      </div>
    </div>
  );
}
