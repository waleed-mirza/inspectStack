"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";

export function SubmitButton({
  busyLabel,
  disabled,
  onClick,
  ...props
}: Omit<ComponentProps<typeof Button>, "type" | "busy">) {
  const { pending } = useFormStatus();
  const [local, setLocal] = useState(false);
  const busy = pending || local;

  useEffect(() => {
    if (pending) setLocal(false);
  }, [pending]);

  useEffect(() => {
    if (!local) return;
    const timer = window.setTimeout(() => setLocal(false), 8000);
    return () => window.clearTimeout(timer);
  }, [local]);

  return (
    <Button
      {...props}
      type="submit"
      busy={busy}
      busyLabel={busyLabel}
      disabled={disabled || busy}
      onClick={(event) => {
        const form = event.currentTarget.form;
        if (form) {
          form.addEventListener("submit", () => setLocal(true), { once: true });
        }
        onClick?.(event);
      }}
    />
  );
}
