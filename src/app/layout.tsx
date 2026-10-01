import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const styrene = localFont({
  src: [
    { path: "./fonts/styrene-b-regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/styrene-b-medium.otf", weight: "500", style: "normal" },
  ],
  variable: "--font-styrene-b",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});
const copernicus = localFont({
  src: "./fonts/copernicus-book.ttf",
  weight: "400",
  style: "normal",
  variable: "--font-copernicus",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  title: "descontrollle",
  description: "Planejamento financeiro pessoal orientado a objetivos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${styrene.variable} ${copernicus.variable}`}>
      <body>{children}</body>
    </html>
  );
}
