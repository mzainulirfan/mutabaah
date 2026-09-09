import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(e: unknown, fallback = "Terjadi kesalahan. Coba lagi."): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/** Validasi tujuan redirect internal — cegah open-redirect. Kembalikan fallback bila tidak aman. */
export function safeNextPath(v: unknown, fallback = "/beranda"): string {
  if (typeof v !== "string") return fallback;
  if (!v.startsWith("/") || v.startsWith("//") || v.includes(":") || v.includes("\\")) return fallback;
  return v;
}
