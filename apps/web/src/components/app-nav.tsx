"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@inspectstack/ui";
import type { MembershipRole } from "@inspectstack/domain";

function NavPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className="stamp-pulse" aria-hidden />;
}

function navActive(pathname: string, href: string, exact?: boolean) {
  if (exact || href === "/app") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({
  role,
  inspectionsLabel = "Inspections",
  sitesLabel = "Sites",
  showAdmin = false,
}: {
  role: MembershipRole;
  inspectionsLabel?: string;
  sitesLabel?: string;
  showAdmin?: boolean;
}) {
  const pathname = usePathname();
  const items: Array<{
    href: string;
    label: string;
    exact?: boolean;
    hideFor?: MembershipRole[];
  }> = [
    { href: "/app", label: "Jobs", exact: true },
    { href: "/app/inspections", label: inspectionsLabel },
    { href: "/app/templates", label: "Templates" },
    { href: "/app/sites", label: sitesLabel, hideFor: ["client_viewer"] },
    {
      href: "/app/schedules",
      label: "Schedules",
      hideFor: ["client_viewer", "inspector", "reviewer", "template_manager"],
    },
    { href: "/app/actions", label: "Actions" },
    { href: "/app/review", label: "Review" },
    { href: "/app/reports", label: "Reports" },
    { href: "/app/settings", label: "Settings" },
  ];
  if (showAdmin) items.push({ href: "/app/admin", label: "Tenants" });

  return (
    <nav aria-label="Primary" className="page-shell flex gap-5 overflow-x-auto pb-2">
      {items
        .filter((item) => !item.hideFor?.includes(role))
        .map((item) => {
          const active = navActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 border-b-2 pb-1 text-ui",
                active ? "border-ink" : "border-transparent hover:border-ink",
              )}
            >
              {item.label}
              <NavPending />
            </Link>
          );
        })}
    </nav>
  );
}
