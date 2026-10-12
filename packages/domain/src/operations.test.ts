import { describe, expect, it } from "vitest";
import {
  canCommentOnFinding,
  canVerifyFinding,
  planAdvanceFinding,
  planReopenFinding,
  planVerifyFinding,
} from "./actions-portal";
import { normalizeQrToken, planQrLaunch, qrLaunchDeniedMessage } from "./qr";
import {
  firstDueOnOrAfter,
  formatLocalDate,
  jobDedupKey,
  localDateInZone,
  localDateTimeToUtc,
  nextInspectionNumber,
  nextOccurrence,
  planCreateJob,
} from "./schedules";
import {
  canManageSites,
  canViewSites,
  normalizeExternalId,
  normalizeTags,
  wouldCreateSiteCycle,
} from "./sites";

describe("sites authorization and ids", () => {
  it("lets owner/admin manage sites and blocks inspector/client", () => {
    expect(canManageSites("owner")).toBe(true);
    expect(canManageSites("admin")).toBe(true);
    expect(canManageSites("inspector")).toBe(false);
    expect(canManageSites("client_viewer")).toBe(false);
    expect(canViewSites("inspector")).toBe(true);
    expect(canViewSites("client_viewer")).toBe(false);
  });

  it("accepts CSV-friendly external ids and rejects spaces/symbols", () => {
    expect(normalizeExternalId("NPG-HARBOUR-4")).toBe("NPG-HARBOUR-4");
    expect(normalizeExternalId("  harbour 12 u4 ")).toBe("harbour-12-u4");
    expect(normalizeExternalId("bad/id")).toBe(null);
    expect(normalizeExternalId("")).toBe(null);
  });

  it("normalizes tags and blocks a parent cycle", () => {
    expect(normalizeTags([" Harbour ", "HARBOUR", "meters"])).toEqual(["harbour", "meters"]);
    const rows = [
      { id: "harbour", parentId: null },
      { id: "unit-4", parentId: "harbour" },
      { id: "unit-9", parentId: "harbour" },
    ];
    expect(wouldCreateSiteCycle(rows, "harbour", "unit-4")).toBe(true);
    expect(wouldCreateSiteCycle(rows, "unit-4", "unit-9")).toBe(false);
    expect(wouldCreateSiteCycle(rows, "unit-4", "unit-4")).toBe(true);
  });
});

describe("QR launch isolation", () => {
  const harbour = {
    id: "asset-harbour",
    organizationId: "northline",
    archivedAt: null,
  };

  it("opens the asset only for a member of that org", () => {
    expect(
      planQrLaunch({ authenticated: true, membershipOrgId: "northline", asset: harbour }),
    ).toEqual({ ok: true, assetId: "asset-harbour" });
  });

  it("denies another tenant without a distinct not-found leak", () => {
    const denied = planQrLaunch({
      authenticated: true,
      membershipOrgId: "westfield",
      asset: harbour,
    });
    const missing = planQrLaunch({
      authenticated: true,
      membershipOrgId: "westfield",
      asset: null,
    });
    expect(denied).toEqual({ ok: false, error: "denied" });
    expect(missing).toEqual({ ok: false, error: "not_found" });
    expect(qrLaunchDeniedMessage("denied")).toBe(qrLaunchDeniedMessage("not_found"));
  });

  it("normalizes keypad entry", () => {
    expect(normalizeQrToken("isq abcd efgh")).toBe("ISQ-ABCDEFGH");
    expect(normalizeQrToken("ISQ-ABCDEFGH")).toBe("ISQ-ABCDEFGH");
  });
});

describe("timezone-safe schedules", () => {
  const sydney = "Australia/Sydney";
  const weeklyFriday = {
    frequency: "weekly" as const,
    timeZone: sydney,
    localHour: 17,
    localMinute: 0,
    weekday: 5 as const,
  };

  it("treats 14:00 UTC on 3 Oct 2026 as 4 Oct in Sydney", () => {
    const instant = new Date("2026-10-03T14:00:00.000Z");
    expect(formatLocalDate(localDateInZone(instant, sydney))).toBe("2026-10-04");
    expect(formatLocalDate(localDateInZone(instant, "UTC"))).toBe("2026-10-03");
  });

  it("converts Friday 17:00 Sydney to the matching UTC instant", () => {
    const due = localDateTimeToUtc({ year: 2026, month: 10, day: 2 }, 17, 0, sydney);
    const back = localDateInZone(due, sydney);
    expect(formatLocalDate(back)).toBe("2026-10-02");
    expect(due.toISOString()).not.toBe("2026-10-02T17:00:00.000Z");
  });

  it("finds the next Friday after a Thursday in Sydney", () => {
    const thursday = { year: 2026, month: 10, day: 1 };
    expect(formatLocalDate(firstDueOnOrAfter(weeklyFriday, thursday)!)).toBe("2026-10-02");
    expect(formatLocalDate(nextOccurrence(weeklyFriday, { year: 2026, month: 10, day: 2 })!)).toBe(
      "2026-10-09",
    );
  });

  it("refuses a second job for the same rule and local date", () => {
    const key = jobDedupKey("rule-harbour", "2026-10-02");
    const first = planCreateJob({
      existingKeys: [],
      scheduleRuleId: "rule-harbour",
      localDate: "2026-10-02",
    });
    const second = planCreateJob({
      existingKeys: [key],
      scheduleRuleId: "rule-harbour",
      localDate: "2026-10-02",
    });
    expect(first).toEqual({ ok: true, key });
    expect(second).toEqual({ ok: false, error: "duplicate" });
  });

  it("increments NL-1003 to NL-1004", () => {
    expect(nextInspectionNumber(["NL-1001", "NL-1002", "NL-1003", "WV-2001"], "NL")).toBe(
      "NL-1004",
    );
  });
});

describe("corrective-action portal", () => {
  it("lets a client comment but not close", () => {
    expect(canCommentOnFinding("client_viewer")).toBe(true);
    expect(canVerifyFinding("client_viewer")).toBe(false);
    expect(canVerifyFinding("inspector")).toBe(false);
    expect(planVerifyFinding({ role: "inspector", from: "ready_for_review" })).toEqual({
      ok: false,
      error: "denied",
    });
    expect(planVerifyFinding({ role: "reviewer", from: "ready_for_review" })).toEqual({
      ok: true,
      to: "closed",
    });
    expect(planReopenFinding({ role: "admin", from: "closed" })).toEqual({
      ok: true,
      to: "reopened",
    });
    expect(planReopenFinding({ role: "reviewer", from: "open" }).ok).toBe(false);
  });

  it("lets an inspector mark ready but not close", () => {
    expect(
      planAdvanceFinding({ role: "inspector", from: "in_progress", to: "ready_for_review" }),
    ).toEqual({ ok: true, to: "ready_for_review" });
    expect(
      planAdvanceFinding({ role: "inspector", from: "ready_for_review", to: "closed" }),
    ).toEqual({ ok: false, error: "denied" });
    expect(planAdvanceFinding({ role: "client_viewer", from: "open", to: "acknowledged" })).toEqual(
      { ok: false, error: "denied" },
    );
  });
});
