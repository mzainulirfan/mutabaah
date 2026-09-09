import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(e: unknown, fallback = "Terjadi kesalahan. Coba lagi."): string {
  return e instanceof Error && e.message ? e.message : fallback;
}
