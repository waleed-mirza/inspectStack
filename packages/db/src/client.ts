import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readServerEnv } from "@inspectstack/config";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

/** Direct `db.<ref>.supabase.co` is IPv6-only; this network cannot resolve it. */
export function resolveDatabaseUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const match = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (!match) return url;
  const ref = match[1];
  parsed.hostname = process.env.SUPABASE_POOLER_HOST ?? "aws-0-ap-southeast-1.pooler.supabase.com";
  if (!parsed.port) parsed.port = "5432";
  if (parsed.username && !parsed.username.includes(".")) {
    parsed.username = `${parsed.username}.${ref}`;
  }
  return parsed.toString();
}

function createSql(url: string) {
  const resolved = resolveDatabaseUrl(url);
  const pooler = resolved.includes("6543") || resolved.includes("pooler.supabase.com");
  return postgres(resolved, {
    max: 1,
    prepare: !pooler,
    ssl: "require",
  });
}

export function createDb(url = readServerEnv().DATABASE_URL): Database {
  return drizzle(createSql(url), { schema });
}

export function createSqlClient(url = readServerEnv().DATABASE_URL) {
  return createSql(url);
}
