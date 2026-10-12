import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createOperation, evidenceObjectKey } from "@inspectstack/domain";
import { TENANT_A, TENANT_B } from "@inspectstack/testkit";
import { and, eq } from "drizzle-orm";
import { createDb } from "./client";
import { applySyncOperations, getAssignmentBundle, putInspectionMediaBytes } from "./inspections";
import { getInspection, getReportSnapshot, listInspections } from "./repositories";
import { getAssetByQrToken, getAssetDesk, getSiteDesk } from "./sites";
import { getScheduleRule, listScheduleRules, runDueJobs } from "./schedules";
import { getPortalFinding, listPortalQueue } from "./portal";
import { assets, scheduleRules, sites as sitesTable } from "./schema";
import { getTemplate, listTemplateLibrary, saveDraftSchema } from "./templates";
import {
  inspections,
  media,
  organizations,
  reportSnapshots,
  responses,
  syncOperations,
  templateVersions,
  templates,
} from "./schema";

const live = Boolean(
  process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes("127.0.0.1") &&
    !process.env.DATABASE_URL.includes("example.supabase"),
);

describe.skipIf(!live)("cross-tenant repository isolation", () => {
  it("does not return another organization's inspection by id", async () => {
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

    const bJobs = await listInspections(db, { organizationId: orgB.id });
    expect(bJobs.length).toBeGreaterThan(0);
    const stolen = await getInspection(db, { organizationId: orgA.id }, bJobs[0]!.id);
    expect(stolen).toBeNull();

    const owned = await getInspection(db, { organizationId: orgB.id }, bJobs[0]!.id);
    expect(owned?.id).toBe(bJobs[0]!.id);
    expect(owned?.organizationId).toBe(orgB.id);
  });

  it("does not return another organization's report snapshot by id", async () => {
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

    const aSnapshots = await db
      .select()
      .from(reportSnapshots)
      .where(eq(reportSnapshots.organizationId, orgA.id))
      .limit(1);
    if (aSnapshots.length === 0) return;
    const stolen = await getReportSnapshot(db, { organizationId: orgB.id }, aSnapshots[0]!.id);
    expect(stolen).toBeNull();
    const owned = await getReportSnapshot(db, { organizationId: orgA.id }, aSnapshots[0]!.id);
    expect(owned?.id).toBe(aSnapshots[0]!.id);
  });

  it("does not return another organization's template by id", async () => {
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

    const bLibrary = await listTemplateLibrary(db, { organizationId: orgB.id });
    expect(bLibrary.length).toBeGreaterThan(0);
    const stolen = await getTemplate(db, { organizationId: orgA.id }, bLibrary[0]!.id);
    expect(stolen).toBeNull();
  });

  it("keeps a published schema unchanged when a later draft is saved", async () => {
    const db = createDb();
    const [orgA] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, TENANT_A.slug))
      .limit(1);
    expect(orgA).toBeTruthy();
    if (!orgA) return;

    const [template] = await db
      .select()
      .from(templates)
      .where(and(eq(templates.organizationId, orgA.id), eq(templates.slug, "property-condition")))
      .limit(1);
    expect(template).toBeTruthy();
    if (!template) return;

    const [published] = await db
      .select()
      .from(templateVersions)
      .where(
        and(
          eq(templateVersions.templateId, template.id),
          eq(templateVersions.version, 1),
          eq(templateVersions.status, "published"),
        ),
      )
      .limit(1);
    expect(published).toBeTruthy();
    if (!published) return;

    const before = JSON.stringify(published.schema);
    const locked = await saveDraftSchema(db, {
      organizationId: orgA.id,
      versionId: published.id,
      schema: { ...published.schema, sections: [] },
    });
    expect(locked.ok).toBe(false);

    const [after] = await db
      .select()
      .from(templateVersions)
      .where(eq(templateVersions.id, published.id))
      .limit(1);
    expect(JSON.stringify(after?.schema)).toBe(before);
  });

  it("does not return another organization's assignment bundle", async () => {
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

    const bJobs = await listInspections(db, { organizationId: orgB.id });
    expect(bJobs.length).toBeGreaterThan(0);
    const stolen = await getAssignmentBundle(db, { organizationId: orgA.id }, bJobs[0]!.id);
    expect(stolen).toBeNull();

    const owned = await getAssignmentBundle(db, { organizationId: orgB.id }, bJobs[0]!.id);
    expect(owned?.inspection.id).toBe(bJobs[0]!.id);
    expect(owned?.organization.id).toBe(orgB.id);
  });

  it("rejects cross-tenant sync apply without leaking the row", async () => {
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

    const aJobs = await listInspections(db, { organizationId: orgA.id });
    const job = aJobs.find((row) => row.number === "NL-1001") ?? aJobs[0];
    expect(job).toBeTruthy();
    if (!job) return;

    const op = await createOperation({
      inspectionId: job.id,
      entityId: "smoke_alarm",
      type: "set_response",
      baseRevision: job.revision,
      payload: { fieldKey: "smoke_alarm", value: { result: "fail" } },
    });
    const applied = await applySyncOperations(db, {
      organizationId: orgB.id,
      inspectionId: job.id,
      operations: [op],
    });
    expect(applied.ok).toBe(false);
    if (!applied.ok) expect(applied.error).toBe("not_found");

    const still = await getInspection(db, { organizationId: orgA.id }, job.id);
    expect(still?.revision).toBe(job.revision);
  });

  it("applies the same client operation id once and stores media capture fields", async () => {
    const db = createDb();
    const [orgA] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, TENANT_A.slug))
      .limit(1);
    expect(orgA).toBeTruthy();
    if (!orgA) return;

    const jobs = await listInspections(db, { organizationId: orgA.id });
    const job = jobs.find((row) => row.number === "NL-1001") ?? jobs[0];
    expect(job).toBeTruthy();
    if (!job) return;

    const bundle = await getAssignmentBundle(db, { organizationId: orgA.id }, job.id);
    expect(bundle?.inspection.number).toBe(job.number);
    expect(bundle?.responses.some((row) => row.fieldKey === "smoke_alarm")).toBe(true);

    const mediaId = randomUUID();
    const probe = await createOperation({
      inspectionId: job.id,
      entityId: "w4_s2_probe",
      type: "set_response",
      baseRevision: bundle?.inspection.revision ?? job.revision,
      payload: { fieldKey: "w4_s2_probe", value: { note: "probe" } },
    });
    const add = await createOperation({
      inspectionId: job.id,
      entityId: mediaId,
      type: "add_media_manifest",
      baseRevision: bundle?.inspection.revision ?? job.revision,
      payload: {
        mediaId,
        fieldKey: "smoke_photo",
        contentHash: `w4s2${mediaId.replaceAll("-", "").slice(0, 12)}`,
        contentType: "image/jpeg",
        byteSize: 24,
        caption: "W4-S2 probe",
        capturedAt: "2026-08-30T12:00:00.000Z",
        latitude: -33.86,
        longitude: 151.21,
        annotation: { note: "probe" },
      },
    });

    try {
      const first = await applySyncOperations(db, {
        organizationId: orgA.id,
        inspectionId: job.id,
        operations: [probe],
      });
      const second = await applySyncOperations(db, {
        organizationId: orgA.id,
        inspectionId: job.id,
        operations: [probe],
      });
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (first.ok && second.ok) {
        expect(second.operations[0]?.duplicate).toBe(true);
        expect(second.revision).toBe(first.revision);
      }

      const mediaApply = await applySyncOperations(db, {
        organizationId: orgA.id,
        inspectionId: job.id,
        operations: [add],
      });
      expect(mediaApply.ok).toBe(true);

      const after = await getAssignmentBundle(db, { organizationId: orgA.id }, job.id);
      const captured = after?.media.find((row) => row.mediaId === mediaId);
      expect(captured?.fieldKey).toBe("smoke_photo");
      expect(captured?.latitude).toBe(-33.86);
      expect(captured?.longitude).toBe(151.21);
      expect(captured?.annotation).toEqual({ note: "probe" });
      expect(captured?.capturedAt).toBeTruthy();
    } finally {
      await db
        .delete(responses)
        .where(and(eq(responses.inspectionId, job.id), eq(responses.fieldKey, "w4_s2_probe")));
      await db.delete(media).where(and(eq(media.id, mediaId), eq(media.organizationId, orgA.id)));
      await db
        .delete(syncOperations)
        .where(
          and(
            eq(syncOperations.organizationId, orgA.id),
            eq(syncOperations.clientOperationId, probe.operationId),
          ),
        );
      await db
        .delete(syncOperations)
        .where(
          and(
            eq(syncOperations.organizationId, orgA.id),
            eq(syncOperations.clientOperationId, add.operationId),
          ),
        );
      await db
        .update(inspections)
        .set({ revision: job.revision, updatedAt: new Date() })
        .where(and(eq(inspections.id, job.id), eq(inspections.organizationId, orgA.id)));
    }
  });

  it("does not upload media bytes for another organization's row", async () => {
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

    const [row] = await db.select().from(media).where(eq(media.organizationId, orgA.id)).limit(1);
    expect(row).toBeTruthy();
    if (!row) return;

    const stored = await putInspectionMediaBytes(
      db,
      {
        put: async () => {
          throw new Error("cross-tenant put");
        },
        remove: async () => undefined,
        signedDownloadUrl: async () => "",
        signedUploadUrl: async () => "",
        evidenceKey: evidenceObjectKey,
      },
      { organizationId: orgB.id },
      {
        inspectionId: row.inspectionId,
        mediaId: row.id,
        bytes: Buffer.from("x"),
        contentType: "image/png",
      },
    );
    expect(stored.ok).toBe(false);
    if (!stored.ok) expect(stored.error).toBe("not_found");
  });

  it("does not return another organization's site or asset desk", async () => {
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

    const [harbour] = await db
      .select()
      .from(sitesTable)
      .where(eq(sitesTable.organizationId, orgA.id))
      .limit(1);
    expect(harbour).toBeTruthy();
    if (!harbour) return;
    const stolenSite = await getSiteDesk(db, { organizationId: orgB.id }, harbour.id);
    expect(stolenSite).toBeNull();
    const ownedSite = await getSiteDesk(db, { organizationId: orgA.id }, harbour.id);
    expect(ownedSite?.site.id).toBe(harbour.id);

    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.organizationId, orgA.id))
      .limit(1);
    expect(asset).toBeTruthy();
    if (!asset) return;
    const stolenAsset = await getAssetDesk(db, { organizationId: orgB.id }, asset.id);
    expect(stolenAsset).toBeNull();
    if (asset.qrToken) {
      const byToken = await getAssetByQrToken(db, asset.qrToken);
      expect(byToken?.id).toBe(asset.id);
      expect(byToken?.organizationId).not.toBe(orgB.id);
    }
  });

  it("does not list another organization's schedule rules or portal findings", async () => {
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

    const aRules = await listScheduleRules(db, { organizationId: orgA.id });
    const bRules = await listScheduleRules(db, { organizationId: orgB.id });
    expect(bRules.every((row) => row.rule.organizationId === orgB.id)).toBe(true);
    if (aRules[0]) {
      const stolen = await getScheduleRule(db, { organizationId: orgB.id }, aRules[0].rule.id);
      expect(stolen).toBeNull();
    }

    const aQueue = await listPortalQueue(db, { organizationId: orgA.id }, { includeClosed: true });
    expect(aQueue.every((row) => row.organizationId === orgA.id)).toBe(true);
    if (aQueue[0]) {
      const stolen = await getPortalFinding(db, { organizationId: orgB.id }, aQueue[0].id);
      expect(stolen).toBeNull();
    }
  });

  it("creates one assignment when due jobs run twice for the same local date", async () => {
    const db = createDb();
    const [orgA] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, TENANT_A.slug))
      .limit(1);
    expect(orgA).toBeTruthy();
    if (!orgA) return;
    const [rule] = await db
      .select()
      .from(scheduleRules)
      .where(eq(scheduleRules.organizationId, orgA.id))
      .limit(1);
    if (!rule) return;
    const first = await runDueJobs(db, { organizationId: orgA.id });
    const second = await runDueJobs(db, { organizationId: orgA.id });
    expect(first.created + first.duplicates).toBeGreaterThanOrEqual(0);
    expect(second.created).toBe(0);
  });
});
