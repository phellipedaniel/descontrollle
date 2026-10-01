"use client";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { logout } from "@/app/login/actions";
import { Icon } from "@/components/ui/icon";
import { NavigationLink } from "@/components/layout/navigation-link";
export type SidebarSection = "dashboard" | "finance" | "planning" | "goals" | "resilience" | "debts" | "net-worth" | "forecast" | "behavior" | "automation";
const groups = [
  { name: "Principal", items: [["dashboard", "Visão geral", "/"], ["finance", "Finanças", "/finance"], ["planning", "Planejamento", "/planning"], ["goals", "Objetivos", "/goals"]] },
  { name: "Análise", items: [["resilience", "Segurança financeira", "/resilience"], ["debts", "Dívidas", "/debts"], ["net-worth", "Patrimônio", "/net-worth"], ["forecast", "Projeções", "/forecast"], ["behavior", "Comportamento", "/behavior"]] },
  { name: "Rotinas", items: [["automation", "Automação", "/automation"]] },
];
export function Sidebar({ active }: { active: SidebarSection }) {
  const [collapsed, setCollapsed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { setCollapsed(localStorage.getItem("ds-sidebar-collapsed") === "true"); }, []);
  useEffect(() => {
    const query = matchMedia("(min-width: 1024px)");
    const close = () => { if (query.matches) dialog.current?.close(); };
    query.addEventListener("change", close);
    return () => query.removeEventListener("change", close);
  }, []);
  const navigation = (mobile = false) => <>
    <Link href="/" className="ds-brand" aria-label="descontrollle — Visão geral"><span className="ds-brand-symbol" aria-hidden="true">d</span><span className="ds-nav-text">descontrollle</span></Link>
    <nav aria-label={mobile ? "Navegação móvel" : "Navegação principal"}>{groups.map(group => <div className="ds-nav-group" key={group.name}><span className="ds-nav-group-name">{group.name}</span>{group.items.map(([key, label, href]) => <NavigationLink key={key} href={href} label={label} icon={key} active={active === key} collapsed={collapsed} mobile={mobile} onNavigate={() => dialog.current?.close()}/>)}</div>)}</nav>
    <form action={logout}><button className="ds-nav-link" title="Sair" aria-label="Sair"><Icon name="logout"/><span className="ds-nav-text">Sair</span></button></form>
  </>;
  return <>
    <aside className={`ds-sidebar ${collapsed ? "is-collapsed" : ""}`}>{navigation()}<button className="ds-sidebar-toggle ds-nav-link" aria-expanded={!collapsed} aria-label={collapsed ? "Expandir navegação" : "Recolher navegação"} title={collapsed ? "Expandir navegação" : "Recolher navegação"} onClick={() => { setCollapsed(!collapsed); localStorage.setItem("ds-sidebar-collapsed", String(!collapsed)); }}><Icon name="collapse"/><span className="ds-nav-text">Recolher</span></button></aside>
    <div className="ds-mobile-topbar"><button className="ds-button ghost" onClick={() => dialog.current?.showModal()} aria-label="Abrir navegação" aria-haspopup="dialog"><Icon name="menu"/>Navegação</button><span>descontrollle</span></div>
    <dialog ref={dialog} className="ds-drawer" aria-label="Navegação" onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}><div className="ds-drawer-content"><button className="ds-button ghost" onClick={() => dialog.current?.close()} aria-label="Fechar navegação" autoFocus><Icon name="close"/>Fechar</button>{navigation(true)}</div></dialog>
  </>;
}
