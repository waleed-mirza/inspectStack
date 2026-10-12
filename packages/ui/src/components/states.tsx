import type { ReactNode } from "react";
import { cn } from "../lib/utils";

function Frame({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface p-6", className)}>
      <p className="font-mono text-micro uppercase tracking-id text-muted">{title}</p>
      <div className="mt-2 text-body text-ink">{children}</div>
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return <Frame title={title}>{children}</Frame>;
}

export function TicketSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="surface ticket-rail p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="h-3 w-16 animate-pulse bg-fill" />
            <div className="h-5 w-14 animate-pulse bg-fill" />
          </div>
          <div className="mt-2 h-5 w-48 max-w-full animate-pulse bg-fill" />
          <div className="mt-2 h-4 w-32 max-w-full animate-pulse bg-fill" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ label = "Loading field tickets…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <p className="sr-only">{label}</p>
      <div className="mb-6 h-8 w-40 animate-pulse bg-fill" />
      <div className="mb-6 h-4 w-72 max-w-full animate-pulse bg-fill" />
      <TicketSkeleton />
    </div>
  );
}

export function LoadingState({
  label = "Loading field tickets…",
  layout = "block",
}: {
  label?: string;
  layout?: "block" | "tickets" | "runner";
}) {
  if (layout === "tickets") return <PageSkeleton label={label} />;
  if (layout === "runner") {
    return (
      <div role="status" aria-live="polite" className="flex h-full min-h-80 flex-col bg-paper">
        <p className="sr-only">{label}</p>
        <div className="ticket-rail border-b border-ink bg-ticket px-4 py-3">
          <div className="h-3 w-16 animate-pulse bg-fill" />
          <div className="mt-2 h-5 w-40 animate-pulse bg-fill" />
          <div className="mt-3 h-1 w-full bg-fill">
            <div className="h-full w-1/3 bg-brand" />
          </div>
          <div className="mt-3 flex gap-2">
            <div className="h-8 w-20 animate-pulse bg-fill" />
            <div className="h-8 w-24 animate-pulse bg-fill" />
          </div>
        </div>
        <div className="space-y-4 px-4 py-4">
          <div className="h-4 w-32 animate-pulse bg-fill" />
          <div className="h-10 animate-pulse bg-fill" />
          <div className="h-4 w-28 animate-pulse bg-fill" />
          <div className="h-10 animate-pulse bg-fill" />
          <div className="h-24 animate-pulse bg-fill" />
        </div>
      </div>
    );
  }
  return (
    <Frame title="Loading">
      <p className="flex items-center gap-2">
        <span className="stamp-pulse" aria-hidden />
        {label}
      </p>
    </Frame>
  );
}

export function ErrorState({
  title = "Could not load",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <Frame title={title} className="border-fail">
      {children}
    </Frame>
  );
}

export function DeniedState({
  children = "You do not have permission for this workspace action.",
}: {
  children?: ReactNode;
}) {
  return <Frame title="Permission denied">{children}</Frame>;
}
