import Link from "next/link";
import { logout } from "@/app/login/actions";

type SidebarSection = "dashboard" | "finance" | "planning" | "goals";

export function Sidebar({ active }: { active: SidebarSection }) {
  return (
    <aside className="sidebar">
      <div className="brand-mark small">d</div>
      <nav aria-label="Navegação principal">
        <Link
          className={"nav-item " + (active === "dashboard" ? "active" : "")}
          href="/"
          aria-label="Visão geral"
          aria-current={active === "dashboard" ? "page" : undefined}
        >
          ⌂
        </Link>
        <Link
          className={"nav-item " + (active === "finance" ? "active" : "")}
          href="/finance"
          aria-label="Diagnóstico financeiro"
          aria-current={active === "finance" ? "page" : undefined}
        >
          ◫
        </Link>
        <Link
          className={"nav-item " + (active === "planning" ? "active" : "")}
          href="/planning"
          aria-label="Planejamento mensal"
          aria-current={active === "planning" ? "page" : undefined}
        >
          ◇
        </Link>
        <Link className={"nav-item " + (active === "goals" ? "active" : "")} href="/goals" aria-label="Objetivos financeiros" aria-current={active === "goals" ? "page" : undefined}>◎</Link>
        <span className="nav-item disabled" aria-label="Configurações">⚙</span>
      </nav>
      <form action={logout}>
        <button className="nav-item logout" title="Sair" aria-label="Sair">↪</button>
      </form>
    </aside>
  );
}
