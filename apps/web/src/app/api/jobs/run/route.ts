import { timingSafeEqual } from "node:crypto";
import { runDueJobs } from "@inspectstack/db";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function bearerToken(header: string | null): string {
  if (!header) return "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return "";
}

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET ?? "";
  const provided = bearerToken(request.headers.get("authorization"));
  if (!expected || !secretsMatch(provided, expected)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const result = await runDueJobs(getDb(), { actorUserId: null });
  return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
