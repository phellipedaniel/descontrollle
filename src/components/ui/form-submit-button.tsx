"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "@/components/ui/button";
import type { ReactNode } from "react";

export function FormSubmitButton({ children, variant = "primary", disabled = false, pendingLabel = "Salvando…" }: {
  children: ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant={variant} disabled={disabled || pending} aria-busy={pending}>
    {pending ? pendingLabel : children}
  </Button>;
}
