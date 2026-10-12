"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@inspectstack/ui";

const ITEMS = [
  { href: "/app/settings", label: "Brand", exact: true },
  { href: "/app/settings/team", label: "Team" },
  { href: "/app/settings/activity", label: "Activity" },
  { href: "/app/settings/usage", label: "Plan" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspace settings" className="mb-6 flex flex-wrap gap-4">
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 pb-1 text-ui",
              active ? "border-ink" : "border-transparent hover:border-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
