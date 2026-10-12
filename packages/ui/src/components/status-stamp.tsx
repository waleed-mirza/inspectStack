import { cn } from "../lib/utils";

const TONES = {
  pass: "border-pass text-pass",
  fail: "border-fail text-fail",
  queued: "border-queued text-queued",
  offline: "border-queued text-queued",
  muted: "border-ink text-muted",
  ink: "border-ink text-ink",
} as const;

export function StatusStamp({
  children,
  tone = "ink",
  className,
}: {
  children: string;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-none border px-2 py-0.5 font-mono text-micro uppercase tracking-id",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
