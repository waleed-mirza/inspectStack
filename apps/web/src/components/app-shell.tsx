"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({
  brand,
  header,
  status,
  banner,
  children,
}: {
  brand: string;
  header: ReactNode;
  status: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const runner = pathname.startsWith("/app/run");

  return (
    <div
      className={runner ? "h-dvh min-h-0" : "min-h-screen"}
      style={{ ["--org-brand" as string]: brand, ["--brand" as string]: brand }}
    >
      {banner}
      {runner ? (
        children
      ) : (
        <>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:bg-ink focus:px-3 focus:py-2 focus:text-ticket"
          >
            Skip to content
          </a>
          <div className={pathname.includes("/qr") ? "no-print" : undefined}>{header}</div>
          <div className={pathname.includes("/qr") ? "no-print" : undefined}>{status}</div>
          <main id="main" className="page-shell pb-16">
            {children}
          </main>
        </>
      )}
    </div>
  );
}
