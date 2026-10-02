import type { ReactNode } from "react";
export function Alert({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" | "danger" | "success" }) {
  return <div className={`ds-alert ${tone}`} role={tone === "danger" ? "alert" : "status"}>{children}</div>;
}
