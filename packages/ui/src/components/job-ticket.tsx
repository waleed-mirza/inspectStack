import type { ElementType, ReactNode } from "react";
import { cn } from "../lib/utils";
import { StatusStamp } from "./status-stamp";

export function JobTicket({
  number,
  title,
  meta,
  stamp,
  tone,
  href,
  as,
  className,
  children,
}: {
  number: string;
  title: string;
  meta: ReactNode;
  stamp: string;
  tone: "pass" | "fail" | "queued" | "ink" | "muted";
  href?: string;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}) {
  const Comp: ElementType = as ?? (href ? "a" : "article");
  return (
    <Comp href={href} className={cn("relative block surface ticket-rail p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-micro uppercase tracking-id text-muted">{number}</p>
        <StatusStamp tone={tone}>{stamp}</StatusStamp>
      </div>
      <h3 className="mt-2 font-display text-title">{title}</h3>
      <div className="mt-2 text-ui text-muted">{meta}</div>
      {children}
    </Comp>
  );
}
