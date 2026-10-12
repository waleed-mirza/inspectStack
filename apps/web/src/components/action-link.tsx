"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import { JobTicket, buttonVariants, cn } from "@inspectstack/ui";

function PendingDot() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className="stamp-pulse" aria-hidden />;
}

function PendingOverlay() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 bg-fill/40 transition-opacity",
        pending ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

function ActionLabel({ idle, pendingLabel }: { idle: ReactNode; pendingLabel: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return <>{idle}</>;
  return (
    <>
      <span className="stamp-pulse" aria-hidden />
      {pendingLabel}
    </>
  );
}

export function ActionLink({
  href,
  children,
  pendingLabel = "Opening…",
  variant,
  size,
  className,
}: {
  href: string;
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  className?: string;
}) {
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} className={cn(buttonVariants({ variant, size }), className)} rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)}>
      <ActionLabel idle={children} pendingLabel={pendingLabel} />
    </Link>
  );
}

export function AppLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-1", className)}>
      {children}
      <PendingDot />
    </Link>
  );
}

export function TicketLink({
  href,
  ...props
}: {
  href: string;
  number: string;
  title: string;
  meta: ReactNode;
  stamp: string;
  tone: "pass" | "fail" | "queued" | "ink" | "muted";
  className?: string;
}) {
  return (
    <JobTicket as={Link} href={href} {...props}>
      <PendingOverlay />
    </JobTicket>
  );
}
