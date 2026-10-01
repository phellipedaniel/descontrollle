import Link from "next/link";
export type FinancialDisplayState = { status: "ready"; formattedValue: string; referenceLabel: string } | { status: "empty" | "error" | "unavailable"; message: string } | { status: "loading" };
export function MetricCard({ label, state, detailsHref }: { label: string; state: FinancialDisplayState; detailsHref?: string }) {
  return <article className="ds-metric"><h2>{label}</h2>{state.status === "ready" ? <><strong className="ds-number">{state.formattedValue}</strong><p>{state.referenceLabel}</p></> : <p role={state.status === "error" ? "alert" : undefined}>{state.status === "loading" ? "Carregando…" : state.message}</p>}{detailsHref && <Link href={detailsHref}>Ver detalhes<span className="sr-only"> de {label}</span></Link>}</article>;
}
