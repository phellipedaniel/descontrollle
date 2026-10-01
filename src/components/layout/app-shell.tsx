import type { ReactNode } from "react";
import { Sidebar, type SidebarSection } from "@/components/sidebar";
export function AppShell({ active, children }: { active: SidebarSection; children: ReactNode }) {
  return <div className="ds-app-shell"><a className="ds-skip-link" href="#main-content">Pular para o conteúdo</a><Sidebar active={active}/><main id="main-content" tabIndex={-1} className="ds-workspace">{children}</main></div>;
}
