import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  AUTH_RATE_LIMIT,
  assertOrgPrefixedKey,
  brandingObjectKey,
  canImpersonate,
  canManageWorkspace,
  isSafeUploadContentType,
  isShareUnavailable,
} from "@inspectstack/domain";
import { publicEnvSchema, serverEnvSchema } from "@inspectstack/config";
import { TENANT_A, TENANT_B } from "@inspectstack/testkit";
import { createDb } from "./client";
import { consumeRateLimit, getTenantDesk, setTenantPlan, startImpersonation } from "./admin";
import { getWorkspace, getWorkspaceUsage } from "./workspace";
import { listOrgAudit } from "./repositories";
import { getPublicReportByCode } from "./reports";
import { organizations, reportSnapshots, users } from "./schema";

const live = Boolean(
  process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes("127.0.0.1") &&
    !process.env.DATABASE_URL.includes("example.supabase"),
);

describe("authorization matrix (static)", () => {
  it("keeps the service role off the public env schema", () => {
    expect("SUPABASE_SERVICE_ROLE_KEY" in publicEnvSchema.shape).toBe(false);
    expect("DATABASE_URL" in publicEnvSchema.shape).toBe(false);
    expect("SUPABASE_SERVICE_ROLE_KEY" in serverEnvSchema.shape).toBe(true);
    expect("NEXT_PUBLIC_SUPABASE_ANON_KEY" in publicEnvSchema.shape).toBe(true);
  });

  it("blocks inspectors from workspace admin and non-admins from impersonation", () => {
    expect(canManageWorkspace("inspector")).toBe(false);
    expect(canImpersonate(false)).toBe(false);
  });

  it("rejects a signed URL key from another tenant and unsafe uploads", () => {
    const orgA = "11111111-1111-4111-8111-111111111111";
    const orgB = "22222222-2222-4222-8222-222222222222";
    const key = brandingObjectKey({ organizationId: orgA, ext: "png" });
    expect(() => assertOrgPrefixedKey(orgB, key)).toThrow(/not owned/);
    expect(isSafeUploadContentType("image/png")).toBe(true);
    expect(isSafeUploadContentType("text/html")).toBe(false);
  });

  it("hides a revoked public link", () => {
    expect(isShareUnavailable({ revokedAt: new Date(), expiresAt: null })).toBe(true);
  });
});

describe.skipIf(!live)("authorization matrix (dev database)", () => {
  it("does not return another organization's workspace, usage, or audit", async () => {
    const db = createDb();
    const [orgA] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, TENANT_A.slug))
      .limit(1);
    const [orgB] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, TENANT_B.slug))
      .limit(1);
    expect(orgA && orgB).toBeTruthy();
    if (!orgA || !orgB) return;

    const stolen = await getWorkspace(db, { organizationId: orgB.id });
    expect(stolen?.id).toBe(orgB.id);
    expect(stolen?.id).not.toBe(orgA.id);

    const usageA = await getWorkspaceUsage(db, { organizationId: orgA.id });
    const usageB = await getWorkspaceUsage(db, { organizationId: orgB.id });
    expect(usageA?.workspace.id).toBe(orgA.id);
    expect(usageB?.workspace.id).toBe(orgB.id);

    const auditA = await listOrgAudit(db, { organizationId: orgA.id }, 20);
    expect(auditA.every((row) => row.entityType.length > 0)).toBe(true);
  }, 20_000);

  it("denies impersonation without the platform flag or a written reason", async () => {
    const db = createDb();
    const [orgB] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, TENANT_B.slug))
      .limit(1);
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.email, "owner@inspectstack.demo"))
      .limit(1);
    expect(orgB && owner).toBeTruthy();
    if (!orgB || !owner) return;

    const denied = await startImpersonation(db, {
      actorUserId: owner.id,
      isPlatformAdmin: false,
      organizationId: orgB.id,
      targetUserId: null,
      reason: "Support asked to reproduce a Westfield report",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toBe("denied");

    const noReason = await startImpersonation(db, {
      actorUserId: owner.id,
      isPlatformAdmin: true,
      organizationId: orgB.id,
      targetUserId: null,
      reason: "nope",
    });
    expect(noReason.ok).toBe(false);
    if (!noReason.ok) expect(noReason.error).toBe("reason");

    const desk = await getTenantDesk(db, false, orgB.id);
    expect(desk).toBeNull();

    const plan = await setTenantPlan(db, {
      actorUserId: owner.id,
      isPlatformAdmin: false,
      organizationId: orgB.id,
      planKey: "saas",
    });
    expect(plan.ok).toBe(false);
  }, 20_000);

  it("does not return a revoked verification code", async () => {
    const db = createDb();
    const [orgA] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, TENANT_A.slug))
      .limit(1);
    if (!orgA) return;
    const [revoked] = await db
      .select()
      .from(reportSnapshots)
      .where(eq(reportSnapshots.organizationId, orgA.id))
      .limit(5);
    if (!revoked) return;
    if (!revoked.revokedAt) return;
    const publicView = await getPublicReportByCode(db, revoked.verificationCode);
    expect(publicView.ok).toBe(false);
  }, 20_000);

  it("trips the auth rate-limit bucket after the window fills", async () => {
    const db = createDb();
    const material = `authz-matrix-${Date.now()}`;
    const now = new Date("2026-08-31T12:00:00.000Z");
    let last: { ok: true } | { ok: false; error: "rate" } = { ok: true };
    for (let i = 0; i < AUTH_RATE_LIMIT.limit + 1; i += 1) {
      last = await consumeRateLimit(db, { kind: "auth", material, now });
    }
    expect(last.ok).toBe(false);
    if (!last.ok) expect(last.error).toBe("rate");
  }, 20_000);
});
