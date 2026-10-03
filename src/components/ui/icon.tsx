const paths: Record<string, string> = {
  recurrences: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 11h16 M9 15h6 M12 12v6",
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  finance: "M3 6h18v14H3z M3 10h18 M15 15h3",
  planning: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 11h16",
  goals: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M12 11v2",
  resilience: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6",
  debts: "M4 4h16v16H4z M8 9h8 M8 13h8 M8 17h4",
  "net-worth": "M3 21h18 M5 17v-6h4v6 M10 17V7h4v10 M15 17V3h4v14",
  forecast: "M3 20V4 M3 20h18 M6 16l5-5 4 2 6-8",
  behavior: "M3 7h18 M3 12h18 M3 17h18 M7 5v4 M15 10v4 M10 15v4",
  automation: "M20 8a8 8 0 0 0-14-3L3 8 M3 3v5h5 M4 16a8 8 0 0 0 14 3l3-3 M16 16h5v5",
  privacy: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M12 8v5 M12 16h.01",
  menu: "M3 6h18 M3 12h18 M3 18h18", close: "M6 6l12 12 M6 18L18 6", collapse: "M14 6l-6 6 6 6", logout: "M9 4H4v16h5 M10 12h11 M17 8l4 4-4 4",
  sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  moon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
};
export function Icon({ name }: { name: string }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.dashboard} /></svg>; }
