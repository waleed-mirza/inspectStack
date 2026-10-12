export const AUTH_RATE_LIMIT = { limit: 8, windowMs: 15 * 60 * 1000 } as const;
export const PUBLIC_LINK_RATE_LIMIT = { limit: 40, windowMs: 15 * 60 * 1000 } as const;

export type RateLimitKind = "auth" | "verify" | "share";

export function rateLimitWindowStart(now: Date, windowMs: number): Date {
  const ms = now.getTime();
  return new Date(Math.floor(ms / windowMs) * windowMs);
}

export function rateLimitExceeded(hits: number, limit: number): boolean {
  return hits > limit;
}

export function rateLimitBucketKey(kind: RateLimitKind, materialHash: string): string {
  const hash = materialHash
    .replace(/[^a-f0-9]/gi, "")
    .slice(0, 64)
    .toLowerCase();
  return `${kind}:${hash || "anon"}`;
}
