export function safeAppPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (!raw.startsWith("/app")) return null;
  if (raw.startsWith("//") || raw.includes("://") || raw.includes("\\")) return null;
  if (raw.includes("\n") || raw.includes("\r")) return null;
  return raw;
}
