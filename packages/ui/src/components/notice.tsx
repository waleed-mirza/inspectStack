import type { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

export function Notice({
  tone = "ink",
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & {
  tone?: "pass" | "fail" | "ink";
}) {
  return (
    <p
      role={tone === "fail" ? "alert" : undefined}
      className={cn(
        "surface px-3 py-2 text-ui",
        tone === "fail" && "border-fail text-fail",
        tone === "pass" && "border-pass text-pass",
        className,
      )}
      {...props}
    />
  );
}
