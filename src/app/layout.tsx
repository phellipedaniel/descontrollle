import type { Metadata } from "next";
import { connection } from "next/server";
import { Roboto, Poppins } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-roboto",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});
const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "descontrollle",
  description: "Planejamento financeiro pessoal orientado a objetivos.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${roboto.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}
