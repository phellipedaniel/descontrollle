import type { ReactNode } from "react";
export function PageHeader({ title, description, periodLabel, actions }: { title: string; description?: string; periodLabel?: string; actions?: ReactNode }) {
  return <header className="ds-page-header"><div><h1>{title}</h1>{description && <p>{description}</p>}{periodLabel && <p>{periodLabel}</p>}</div>{actions && <div className="ds-header-actions">{actions}</div>}</header>;
}
export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <header className="ds-section-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header>;
}
