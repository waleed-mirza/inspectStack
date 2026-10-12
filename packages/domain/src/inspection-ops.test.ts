import { describe, expect, it } from "vitest";
import { propertyConditionPack } from "./packs/property-condition";
import {
  ASSIGNMENT_BUNDLE_VERSION,
  defaultUploadPolicy,
  parseAssignmentBundle,
  type AssignmentBundle,
} from "./assignment-bundle";
import {
  applyOperation,
  applyOperations,
  createOperation,
  hashPayload,
  isUuid,
  newOperationId,
  projectionFromBundle,
  responseConflicts,
} from "./inspection-ops";
import { sha256HexFallback } from "./sha256";
import { runnerProgress, validateForSubmit } from "./inspection-validation";
import { canMutateInspection } from "./statuses";

function demoBundle(overrides: Partial<AssignmentBundle["inspection"]> = {}): AssignmentBundle {
  return parseAssignmentBundle({
    bundleVersion: ASSIGNMENT_BUNDLE_VERSION,
    downloadedAt: "2026-08-30T00:00:00.000Z",
    organization: { id: "org-northline", name: "Northline", timezone: "Australia/Sydney" },
    inspection: {
      id: "insp-1",
      number: "NL-1001",
      status: "in_progress",
      revision: 3,
      templateVersionId: "tv-1",
      ...overrides,
    },
    template: {
      id: "tpl-1",
      name: "Property Condition",
      version: 1,
      versionId: "tv-1",
      schema: propertyConditionPack.schema,
    },
    site: { id: "site-1", name: "12 Harbour St" },
    asset: { id: "asset-1", name: "Unit 4" },
    responses: [{ fieldKey: "smoke_alarm", value: { result: "fail" }, revision: 1 }],
    media: [],
    findings: [],
    uploadPolicy: defaultUploadPolicy(),
  });
}

describe("inspection operations", () => {
  it("hashes the same payload regardless of key order", async () => {
    const a = await hashPayload({ fieldKey: "smoke_alarm", value: { result: "fail" } });
    const b = await hashPayload({ value: { result: "fail" }, fieldKey: "smoke_alarm" });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("mints UUID v4 without randomUUID", () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues: (bytes: Uint8Array) => {
          for (let i = 0; i < bytes.length; i += 1) bytes[i] = (i * 17 + 3) & 0xff;
          return bytes;
        },
      },
    });
    try {
      const id = newOperationId();
      expect(isUuid(id)).toBe(true);
    } finally {
      Object.defineProperty(globalThis, "crypto", { configurable: true, value: original });
    }
  });

  it("fallback SHA-256 matches the FIPS empty and abc vectors", () => {
    const encoder = new TextEncoder();
    expect(sha256HexFallback(encoder.encode(""))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256HexFallback(encoder.encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("applies a response and ignores a duplicate operation id", async () => {
    const projection = projectionFromBundle(demoBundle());
    const op = await createOperation({
      inspectionId: "insp-1",
      entityId: "smoke_alarm",
      type: "set_response",
      baseRevision: 3,
      payload: { fieldKey: "smoke_alarm", value: { result: "pass" } },
    });
    const once = applyOperation(projection, op);
    const twice = applyOperation(once, op);
    expect(once.responses.smoke_alarm).toEqual({ result: "pass" });
    expect(twice).toBe(once);
  });

  it("does not duplicate media when the same add is replayed", async () => {
    const start = projectionFromBundle(demoBundle());
    const add = await createOperation({
      inspectionId: "insp-1",
      entityId: "media-1",
      type: "add_media_manifest",
      baseRevision: 3,
      payload: {
        mediaId: "media-1",
        fieldKey: "smoke_photo",
        contentHash: "abc",
        contentType: "image/jpeg",
        byteSize: 1200,
      },
    });
    const next = applyOperations(start, [add, add]);
    expect(next.media).toHaveLength(1);
  });

  it("rejects an operation for a different inspection", async () => {
    const projection = projectionFromBundle(demoBundle());
    const op = await createOperation({
      inspectionId: "other",
      entityId: "smoke_alarm",
      type: "set_response",
      baseRevision: 0,
      payload: { fieldKey: "smoke_alarm", value: { result: "pass" } },
    });
    expect(() => applyOperation(projection, op)).toThrow(/inspection/i);
  });

  it("flags a response conflict when the server revision moved", () => {
    expect(responseConflicts(3, 4)).toBe(true);
    expect(responseConflicts(3, 3)).toBe(false);
  });
});

describe("submit validation", () => {
  it("blocks a life-safety fail that has no photo", () => {
    const issues = validateForSubmit(propertyConditionPack.schema, {
      smoke_alarm: { result: "fail" },
    });
    expect(
      issues.some((issue) => issue.fieldKey === "smoke_photo" && issue.code === "evidence"),
    ).toBe(true);
  });

  it("clears the smoke-photo evidence issue once a manifest exists", () => {
    const issues = validateForSubmit(
      propertyConditionPack.schema,
      { smoke_alarm: { result: "fail" } },
      [
        {
          mediaId: "m1",
          fieldKey: "smoke_photo",
          contentHash: "h",
          contentType: "image/jpeg",
          byteSize: 10,
        },
      ],
    );
    expect(issues.some((issue) => issue.fieldKey === "smoke_photo")).toBe(false);
  });

  it("requires the inspector signature on the property pack", () => {
    const issues = validateForSubmit(propertyConditionPack.schema, {
      address: "12 Harbour St",
      occupancy: "tenanted",
      smoke_alarm: { result: "pass" },
      bedroom_name: "Bedroom 1",
      bedroom_smoke: { result: "pass" },
      tenant_ack: true,
    });
    expect(
      issues.some((issue) => issue.fieldKey === "inspector_sig" && issue.code === "signature"),
    ).toBe(true);
  });

  it("counts progress on visible fields only", () => {
    const progress = runnerProgress(propertyConditionPack.schema, {
      smoke_alarm: { result: "pass" },
    });
    expect(progress.answered).toBeGreaterThanOrEqual(1);
    expect(progress.total).toBeGreaterThan(progress.answered);
    expect(progress.percent).toBeLessThan(100);
    expect(progress.score.failCount).toBe(0);
  });
});

describe("inspection status", () => {
  it("allows writes on in-progress and returned jobs only", () => {
    expect(canMutateInspection("in_progress")).toBe(true);
    expect(canMutateInspection("returned")).toBe(true);
    expect(canMutateInspection("submitted")).toBe(false);
    expect(canMutateInspection("approved")).toBe(false);
  });
});
