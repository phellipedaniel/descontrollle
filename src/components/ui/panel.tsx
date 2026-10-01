import type { HTMLAttributes } from "react";

export function Panel({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <article className={`ds-panel ${className}`} {...props} />;
}
