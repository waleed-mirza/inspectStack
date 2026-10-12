import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "./client";

describe("resolveDatabaseUrl", () => {
  it("rewrites IPv6-only db hosts to the session pooler", () => {
    const out = resolveDatabaseUrl(
      "postgresql://postgres:YOUR_DB_PASSWORD@db.abcdefghijklmn.supabase.co:5432/postgres",
    );
    expect(out).toContain("pooler.supabase.com");
    expect(out).toContain("postgres.abcdefghijklmn");
    expect(out).not.toContain("db.abcdefghijklmn.supabase.co");
  });

  it("leaves pooler URLs unchanged", () => {
    const input =
      "postgresql://postgres.abcdefghijklmn:YOUR_DB_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";
    expect(resolveDatabaseUrl(input)).toBe(input);
  });
});
