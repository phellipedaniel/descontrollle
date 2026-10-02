"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid Hydration Mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="ds-nav-link" aria-label="Alterar tema" disabled>
        <Icon name="loading" />
        <span className="ds-nav-text">Tema</span>
      </button>
    );
  }

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <button
      className="ds-nav-link"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema"
    >
      <Icon name={isDark ? "sun" : "moon"} />
      <span className="ds-nav-text">{isDark ? "Modo Claro" : "Modo Escuro"}</span>
    </button>
  );
}
