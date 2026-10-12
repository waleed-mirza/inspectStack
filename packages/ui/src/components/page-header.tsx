import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function PageHeader({
  title,
  description,
  kicker,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  kicker?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6", className)}>
      {kicker ? <div className="mb-1">{kicker}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-page">{title}</h1>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {description ? (
        <p className="mt-2 max-w-[40rem] text-body text-muted">{description}</p>
      ) : null}
    </header>
  );
}
