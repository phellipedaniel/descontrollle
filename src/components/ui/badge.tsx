import type { ReactNode } from "react";
export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`ds-badge ${tone}`}>{children}</span>;
}
export function StatusBadge({ status }: { status: "open" | "closed" | "unavailable" }) {
  return <Badge tone={status === "closed" ? "info" : "neutral"}>{status === "closed" ? "Mês fechado" : status === "open" ? "Mês aberto" : "Estado do mês indisponível"}</Badge>;
}
