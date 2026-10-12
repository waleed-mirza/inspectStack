import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 rounded-control border border-ink text-ui font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-ink text-ticket hover:bg-brand hover:text-ticket",
        secondary: "bg-ticket text-ink hover:bg-fill",
        danger: "border-fail bg-ticket text-fail hover:bg-fail hover:text-ticket",
        ghost: "border-transparent bg-transparent hover:border-ink",
      },
      size: {
        sm: "h-8 px-2.5",
        md: "h-10 px-3.5",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  type = "button",
  busy = false,
  busyLabel,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    busy?: boolean;
    busyLabel?: string;
  }) {
  return (
    <button
      {...props}
      type={type}
      className={cn(buttonVariants({ variant, size }), busy && "cursor-wait", className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy ? (
        <>
          <span className="stamp-pulse" aria-hidden />
          <span>{busyLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
