import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({ variant = "primary", size = "md", className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg" }) {
  return <button type={type} className={`ds-button ${variant} ${size} ${className}`} {...props} />;
}
export function ButtonLink({ href, children, variant = "secondary" }: { href: string; children: ReactNode; variant?: ButtonVariant }) {
  return <Link href={href} className={`ds-button ${variant} md`}>{children}</Link>;
}
