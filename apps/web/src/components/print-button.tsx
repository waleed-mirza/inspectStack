"use client";

import { Button } from "@inspectstack/ui";

export function PrintButton({ label = "Print sheet" }: { label?: string }) {
  return (
    <Button type="button" variant="primary" className="no-print" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
