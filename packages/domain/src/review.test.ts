import { describe, expect, it } from "vitest";
import { deriveFindingsFromAnswers } from "./findings";
import { canTransitionFinding } from "./findings";
import { propertyConditionPack } from "./packs/property-condition";
import {
  buildReportCanonical,
  hashReportCanonical,
  isShareUnavailable,
  layoutForPack,
  newVerificationCode,
} from "./report-snapshot";
import { canApproveInspection, planApprove, planReturn } from "./review";

describe("review authorization", () => {
  it("blocks an inspector and a reviewer assigned to the job", () => {
    expect(
      canApproveInspection({
        role: "inspector",
        actorUserId: "maya",
        assignedToUserId: "maya",
      }),
    ).toBe(false);
    expect(
      canApproveInspection({
        role: "reviewer",
        actorUserId: "jon",
        assignedToUserId: "jon",
      }),
    ).toBe(false);
    expect(
      canApproveInspection({
        role: "reviewer",
        actorUserId: "jon",
        assignedToUserId: "maya",
      }),
    ).toBe(true);
    expect(
      canApproveInspection({
        role: "owner",
        actorUserId: "amina",
        assignedToUserId: "amina",
      }),
    ).toBe(true);
  });

  it("approves only submitted complete jobs", () => {
    const base = {
      role: "reviewer" as const,
      actorUserId: "jon",
      assignedToUserId: "maya",
    };
    expect(planApprove({ ...base, status: "in_progress", issues: [] }).ok).toBe(false);
    expect(
      planApprove({
        ...base,
        status: "submitted",
        issues: [{ fieldId: "x", fieldKey: "x", code: "required", message: "x" }],
      }).ok,
    ).toBe(false);
    expect(planApprove({ ...base, status: "submitted", issues: [] })).toEqual({
      ok: true,
      to: "approved",
    });
  });

  it("returns only with a note", () => {
    expect(planReturn({ status: "submitted", role: "reviewer", note: "" }).ok).toBe(false);
    expect(planReturn({ status: "submitted", role: "reviewer", note: "Fix the photo." })).toEqual({
      ok: true,
      to: "returned",
    });
  });
});

describe("finding lifecycle", () => {
  it("allows the documented transitions only", () => {
    expect(canTransitionFinding("open", "acknowledged")).toBe(true);
    expect(canTransitionFinding("closed", "open")).toBe(false);
    expect(canTransitionFinding("closed", "reopened")).toBe(true);
    expect(canTransitionFinding("reopened", "in_progress")).toBe(true);
  });

  it("derives the smoke-alarm finding from a fail", () => {
    const derived = deriveFindingsFromAnswers(propertyConditionPack.schema, {
      smoke_alarm: { result: "fail" },
    });
    expect(derived.some((row) => row.title === "Life-safety device failed")).toBe(true);
    expect(derived.find((row) => row.title === "Life-safety device failed")?.severity).toBe("high");
  });
});

describe("report snapshot hash", () => {
  const sample = () =>
    buildReportCanonical({
      layoutKey: "condition",
      organization: {
        name: "Northline Property Group",
        timezone: "Australia/Sydney",
        branding: {
          logoUrl: null,
          primaryColor: "#215C45",
          legalFooter: "Not a legal certificate.",
          terminology: {
            inspection: "Inspection",
            site: "Site",
            asset: "Asset",
            finding: "Finding",
          },
        },
      },
      inspection: {
        number: "NL-1002",
        templateName: "Property Condition",
        templateVersion: 1,
        siteName: "12 Harbour St / Unit 4",
        assetName: "Living smoke alarm",
        inspectorName: "Maya Inspector",
        reviewerName: "Jon Reviewer",
      },
      schema: propertyConditionPack.schema,
      responses: {
        address: "12 Harbour St",
        unit: "4",
        occupancy: "tenanted",
        smoke_alarm: { result: "fail" },
      },
      findings: [
        {
          id: "f1",
          title: "Life-safety device failed",
          severity: "high",
          status: "open",
          notes: "Dust cap still on.",
          fieldKey: "smoke_alarm",
          ownerName: "Building manager",
          dueAt: "2026-09-01T00:00:00.000Z",
          evidenceHashes: ["abc"],
        },
      ],
      media: [
        {
          id: "m1",
          fieldKey: "smoke_photo",
          caption: "Detector with dust cap",
          contentType: "image/png",
          contentHash: "abc",
          capturedAt: "2026-08-30T00:00:00.000Z",
          latitude: null,
          longitude: null,
        },
      ],
    });

  it("hashes identical canonical snapshots the same", async () => {
    const a = await hashReportCanonical(sample());
    const b = await hashReportCanonical(sample());
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("maps packs to the two v1 layouts", () => {
    expect(layoutForPack("property-condition")).toBe("condition");
    expect(layoutForPack("vehicle")).toBe("condition");
    expect(layoutForPack("construction")).toBe("audit");
    expect(layoutForPack("workplace-safety")).toBe("audit");
  });

  it("mints verification codes from bytes deterministically", () => {
    expect(newVerificationCode(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]))).toMatch(
      /^IS-[A-Z0-9]{8}$/,
    );
  });

  it("treats revoked and expired shares as unavailable", () => {
    expect(isShareUnavailable({ revokedAt: new Date() })).toBe(true);
    expect(isShareUnavailable({ revokedAt: null, expiresAt: "2000-01-01T00:00:00.000Z" })).toBe(
      true,
    );
    expect(isShareUnavailable({ revokedAt: null, expiresAt: "2099-01-01T00:00:00.000Z" })).toBe(
      false,
    );
  });
});
