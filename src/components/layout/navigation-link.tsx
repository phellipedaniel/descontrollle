"use client";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";

export function NavigationLink({ href, label, icon, active, collapsed, mobile, onNavigate }: { href: string; label: string; icon: string; active: boolean; collapsed: boolean; mobile: boolean; onNavigate: () => void }) {
  const id = useId();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => { if (timer.current) clearTimeout(timer.current); };
  const hide = () => { cancelClose(); setPosition(null); };
  const show = (element: HTMLAnchorElement) => {
    cancelClose();
    if (mobile || !matchMedia("(min-width: 1024px)").matches || (!collapsed && matchMedia("(min-width: 1280px)").matches)) return;
    const rect = element.getBoundingClientRect();
    setPosition({ top: rect.top, left: rect.right + 12 });
  };
  const scheduleClose = () => { cancelClose(); timer.current = setTimeout(() => setPosition(null), 120); };
  return <>
    <Link href={href} className={`ds-nav-link ${active ? "active" : ""}`} aria-label={label} aria-current={active ? "page" : undefined} aria-describedby={position ? id : undefined} onFocus={event => show(event.currentTarget)} onBlur={hide} onMouseEnter={event => show(event.currentTarget)} onMouseLeave={scheduleClose} onKeyDown={event => { if (event.key === "Escape") hide(); }} onClick={() => { hide(); onNavigate(); }}><Icon name={icon}/><span className="ds-nav-text">{label}</span></Link>
    {position && createPortal(<span id={id} role="tooltip" className="ds-nav-tooltip" style={position} onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>{label}</span>, document.body)}
  </>;
}
