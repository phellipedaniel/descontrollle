import type { Metadata } from "next";
import { connection } from "next/server";
import { Roboto, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const roboto = Roboto({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-roboto",
  display: "swap",
  fallback: ["Arial", "system-ui", "sans-serif"],
});

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: "500",
  variable: "--font-poppins",
  display: "swap",
  fallback: ["Arial", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "descontrollle",
  description: "Planejamento financeiro pessoal orientado a objetivos.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${roboto.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
