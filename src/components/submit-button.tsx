"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "button primary",
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending || disabled}>
      {pending ? "Salvando…" : children}
    </button>
  );
}
