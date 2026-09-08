import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mutabaah — Tumbuh dalam kebiasaan baik",
  description:
    "PWA untuk mencatat, memantau, dan membangun konsistensi ibadah serta kebiasaan baik harian.",
  manifest: "/manifest.json",
};

import { SWRegister } from "@/components/app/sw-register";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
