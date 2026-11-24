import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_Armenian, Orbitron } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_Armenian({
  subsets: ["armenian", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-noto",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "MSKH Cyber Arena — Կիբեռպաշտպաններ",
  description:
    "«Կիբեռպաշտպաններ» կրթական նախագծի մրցութային հարթակ. թիմային առաջադրանքներ, ժյուրիի գնահատում, արդյունքներ իրական ժամանակում։",
};

export const viewport: Viewport = {
  themeColor: "#04060f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="hy" className={`${noto.variable} ${orbitron.variable}`}>
      <body className="min-h-screen bg-void text-slate-200 antialiased">{children}</body>
    </html>
  );
}
