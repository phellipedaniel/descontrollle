import type { Metadata } from "next";
import { connection } from "next/server";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: "descontrollle",
  description: "Planejamento financeiro pessoal orientado a objetivos.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
