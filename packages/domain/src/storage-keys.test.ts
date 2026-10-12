import { describe, expect, it } from "vitest";
import {
  assertOrgPrefixedKey,
  brandingObjectKey,
  evidenceObjectKey,
  reportObjectKey,
} from "./storage-keys";

const orgA = "11111111-1111-4111-8111-111111111111";
const orgB = "22222222-2222-4222-8222-222222222222";
const inspection = "33333333-3333-4333-8333-333333333333";
const media = "44444444-4444-4444-8444-444444444444";

describe("evidenceObjectKey", () => {
  it("prefixes keys by organization", () => {
    const key = evidenceObjectKey({
      organizationId: orgA,
      inspectionId: inspection,
      mediaId: media,
      random: "a1b2c3d4e5",
      ext: "jpg",
    });
    expect(key.startsWith(`${orgA}/`)).toBe(true);
    expect(key.endsWith(".jpg")).toBe(true);
  });
});

describe("reportObjectKey", () => {
  it("prefixes report PDFs by organization", () => {
    const snapshot = "55555555-5555-4555-8555-555555555555";
    const key = reportObjectKey({
      organizationId: orgA,
      inspectionId: inspection,
      snapshotId: snapshot,
    });
    expect(key.startsWith(`${orgA}/reports/`)).toBe(true);
    expect(key.endsWith("/report.pdf")).toBe(true);
  });
});

describe("brandingObjectKey", () => {
  it("prefixes logos by organization", () => {
    const key = brandingObjectKey({ organizationId: orgA, ext: "png" });
    expect(key).toBe(`${orgA}/branding/logo.png`);
  });
});

describe("assertOrgPrefixedKey", () => {
  it("rejects another tenant prefix", () => {
    expect(() => assertOrgPrefixedKey(orgA, `${orgB}/x`)).toThrow(/not owned/);
  });

  it("accepts a matching prefix", () => {
    expect(() => assertOrgPrefixedKey(orgA, `${orgA}/insp/media/rand.jpg`)).not.toThrow();
  });
});
