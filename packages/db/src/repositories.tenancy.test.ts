import { describe, expect, it } from "vitest";
import {
  findingComments,
  impersonationSessions,
  inspections,
  media,
  reportShareLinks,
  reportSnapshots,
  scheduleJobs,
  scheduleRules,
  sites,
} from "./schema";

describe("tenant columns exist on sensitive tables", () => {
  it("inspections are org-scoped", () => {
    expect(inspections.organizationId.name).toBe("organization_id");
    expect(inspections.id.name).toBe("id");
  });

  it("sites are org-scoped", () => {
    expect(sites.organizationId.name).toBe("organization_id");
  });

  it("media is org-scoped", () => {
    expect(media.organizationId.name).toBe("organization_id");
  });

  it("media stores field, capture time, GPS, and annotation", () => {
    expect(media.fieldKey.name).toBe("field_key");
    expect(media.capturedAt.name).toBe("captured_at");
    expect(media.latitude.name).toBe("latitude");
    expect(media.longitude.name).toBe("longitude");
    expect(media.annotation.name).toBe("annotation");
  });

  it("report snapshots and share links are org-scoped", () => {
    expect(reportSnapshots.organizationId.name).toBe("organization_id");
    expect(reportSnapshots.snapshot.name).toBe("snapshot");
    expect(reportShareLinks.organizationId.name).toBe("organization_id");
    expect(reportShareLinks.tokenHash.name).toBe("token_hash");
  });

  it("impersonation sessions record a target organization", () => {
    expect(impersonationSessions.targetOrganizationId.name).toBe("target_organization_id");
    expect(impersonationSessions.reason.name).toBe("reason");
    expect(impersonationSessions.actorUserId.name).toBe("actor_user_id");
  });

  it("schedule rules, jobs, and finding comments are org-scoped", () => {
    expect(scheduleRules.organizationId.name).toBe("organization_id");
    expect(scheduleJobs.organizationId.name).toBe("organization_id");
    expect(scheduleJobs.localDate.name).toBe("local_date");
    expect(findingComments.organizationId.name).toBe("organization_id");
    expect(findingComments.findingId.name).toBe("finding_id");
  });
});
