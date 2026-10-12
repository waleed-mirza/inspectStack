import { describe, expect, it } from "vitest";
import {
  AUTH_RATE_LIMIT,
  assertOrgPrefixedKey,
  assertSafeImageUpload,
  brandingObjectKey,
  canAccessPlatform,
  canChangeMemberRole,
  canImpersonate,
  canInvite,
  canManageWorkspace,
  canSuspendMember,
  DEFAULT_BRANDING,
  formatDisplayDate,
  isFeatureEnabled,
  isShareUnavailable,
  isSafeUploadContentType,
  limitsForPlan,
  navLabel,
  normalizeBrandColor,
  normalizeImpersonationReason,
  parseFeatureFlags,
  parsePlanKey,
  parseWorkspaceBranding,
  PUBLIC_LINK_RATE_LIMIT,
  rateLimitBucketKey,
  rateLimitExceeded,
  rateLimitWindowStart,
  snapshotBranding,
  sniffImageType,
  usageMeter,
} from "./index";

const orgA = "11111111-1111-4111-8111-111111111111";
const orgB = "22222222-2222-4222-8222-222222222222";

const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);

describe("roles matrix", () => {
  it("lets owners and admins brand and invite; inspectors cannot", () => {
    expect(canManageWorkspace("owner")).toBe(true);
    expect(canManageWorkspace("admin")).toBe(true);
    expect(canManageWorkspace("inspector")).toBe(false);
    expect(canInvite("reviewer")).toBe(false);
  });

  it("blocks demoting the last owner and assigning owner from admin", () => {
    expect(
      canChangeMemberRole({ actor: "admin", target: "inspector", next: "owner", ownerCount: 1 }),
    ).toBe(false);
    expect(
      canChangeMemberRole({ actor: "owner", target: "owner", next: "admin", ownerCount: 1 }),
    ).toBe(false);
    expect(
      canChangeMemberRole({ actor: "owner", target: "owner", next: "admin", ownerCount: 2 }),
    ).toBe(true);
    expect(canSuspendMember({ actor: "owner", target: "owner", ownerCount: 1 })).toBe(false);
    expect(canSuspendMember({ actor: "admin", target: "inspector", ownerCount: 1 })).toBe(true);
  });

  it("reserves platform admin for the platform flag, not a membership role", () => {
    expect(canAccessPlatform(true)).toBe(true);
    expect(canAccessPlatform(false)).toBe(false);
    expect(canImpersonate(true)).toBe(true);
    expect(canImpersonate(false)).toBe(false);
  });
});

describe("branding", () => {
  it("fills new identity fields from older stored json", () => {
    const parsed = parseWorkspaceBranding(
      {
        logoUrl: null,
        primaryColor: "#1a3a5c",
        legalFooter: "Not a certificate.",
        terminology: { inspection: "Check", site: "Yard", asset: "Van", finding: "Defect" },
      },
      "Westfield Vehicle Checks",
    );
    expect(parsed.primaryColor).toBe("#1A3A5C");
    expect(parsed.terminology.inspection).toBe("Check");
    expect(parsed.reportIdentity.fromName).toBe("Westfield Vehicle Checks");
    expect(parsed.formats.paper).toBe("a4");
    expect(snapshotBranding(parsed).terminology.finding).toBe("Defect");
    expect("formats" in snapshotBranding(parsed)).toBe(false);
  });

  it("rejects junk color and empty impersonation reasons", () => {
    expect(normalizeBrandColor("blue")).toBe(DEFAULT_BRANDING.primaryColor);
    expect(normalizeImpersonationReason("short")).toBeNull();
    expect(normalizeImpersonationReason("Support asked to reproduce WV-2001")).toBe(
      "Support asked to reproduce WV-2001",
    );
  });

  it("formats dates and nav labels without protocol jargon", () => {
    expect(formatDisplayDate("2026-09-01T00:00:00.000Z", "dmy")).toBe("01 Sep 2026");
    expect(formatDisplayDate("2026-09-01", "mdy")).toBe("09/01/2026");
    expect(navLabel("Site")).toBe("Sites");
    expect(navLabel("Inspections")).toBe("Inspections");
  });
});

describe("plans and flags", () => {
  it("caps single-plan members below agency", () => {
    expect(limitsForPlan("single").members).toBeLessThan(limitsForPlan("agency").members);
    expect(parsePlanKey("saas")).toBe("saas");
    expect(parsePlanKey("gold")).toBe("single");
    expect(usageMeter(8, 8).over).toBe(true);
    expect(usageMeter(7, 8).over).toBe(false);
  });

  it("merges feature flag overrides", () => {
    const flags = parseFeatureFlags({ shareLinks: false, extra: true });
    expect(isFeatureEnabled(flags, "schedules")).toBe(true);
    expect(isFeatureEnabled(flags, "shareLinks")).toBe(false);
  });
});

describe("signed URL and upload", () => {
  it("rejects another tenant prefix on branding and evidence keys", () => {
    const key = brandingObjectKey({ organizationId: orgA, ext: "png" });
    expect(key.startsWith(`${orgA}/branding/`)).toBe(true);
    expect(() => assertOrgPrefixedKey(orgB, key)).toThrow(/not owned/);
    expect(() => assertOrgPrefixedKey(orgA, key)).not.toThrow();
  });

  it("sniffs image bytes and rejects a declared mismatch", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(isSafeUploadContentType("image/png")).toBe(true);
    expect(isSafeUploadContentType("application/pdf")).toBe(false);
    expect(assertSafeImageUpload(PNG, "image/png").ok).toBe(true);
    expect(assertSafeImageUpload(PNG, "image/jpeg").ok).toBe(false);
    expect(assertSafeImageUpload(new Uint8Array([1, 2, 3]), "image/png").ok).toBe(false);
  });
});

describe("public link and rate limit", () => {
  it("hides revoked and expired shares", () => {
    expect(isShareUnavailable({ revokedAt: new Date() })).toBe(true);
    expect(isShareUnavailable({ revokedAt: null, expiresAt: "2000-01-01T00:00:00.000Z" })).toBe(
      true,
    );
    expect(isShareUnavailable({ revokedAt: null, expiresAt: "2099-01-01T00:00:00.000Z" })).toBe(
      false,
    );
  });

  it("windows auth and public-link buckets", () => {
    const start = rateLimitWindowStart(
      new Date("2026-08-31T00:07:00.000Z"),
      AUTH_RATE_LIMIT.windowMs,
    );
    expect(start.toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(rateLimitExceeded(AUTH_RATE_LIMIT.limit, AUTH_RATE_LIMIT.limit)).toBe(false);
    expect(rateLimitExceeded(AUTH_RATE_LIMIT.limit + 1, AUTH_RATE_LIMIT.limit)).toBe(true);
    expect(rateLimitBucketKey("verify", "abc123").startsWith("verify:")).toBe(true);
    expect(PUBLIC_LINK_RATE_LIMIT.limit).toBeGreaterThan(AUTH_RATE_LIMIT.limit);
  });
});
