import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  buildReportCanonical,
  canTransitionFinding,
  deriveFindingsFromAnswers,
  hashReportCanonical,
  layoutForPack,
  mintVerificationCode,
  parseFindingSeverity,
  parseFindingStatus,
  parseTemplateSchema,
  planApprove,
  planReturn,
  reviewDeniedMessage,
  validateForSubmit,
  type InspectionIssue,
  type MembershipRole,
  type ReportCanonical,
} from "@inspectstack/domain";
import type { Database } from "./client";
import {
  assets,
  auditEvents,
  findings,
  inspections,
  media,
  reportSnapshots,
  responses,
  sites,
  templateVersions,
  templates,
  users,
} from "./schema";
import { listOrgMembers, recordAudit, type OrgScope } from "./repositories";

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function answersMap(rows: Array<{ fieldKey: string; value: unknown }>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const row of rows) out[row.fieldKey] = row.value;
  return out;
}

export async function listReviewQueue(db: Database, scope: OrgScope) {
  const jobs = await db
    .select()
    .from(inspections)
    .where(
      and(
        eq(inspections.organizationId, scope.organizationId),
        inArray(inspections.status, ["submitted", "returned"]),
      ),
    )
    .orderBy(desc(inspections.updatedAt));
  return jobs;
}

export async function listIssuedReports(db: Database, scope: OrgScope) {
  return db
    .select({
      snapshot: reportSnapshots,
      inspectionNumber: inspections.number,
      inspectionStatus: inspections.status,
    })
    .from(reportSnapshots)
    .innerJoin(inspections, eq(inspections.id, reportSnapshots.inspectionId))
    .where(eq(reportSnapshots.organizationId, scope.organizationId))
    .orderBy(desc(reportSnapshots.issuedAt));
}

export async function listAuditForInspection(db: Database, scope: OrgScope, inspectionId: string) {
  return db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.organizationId, scope.organizationId),
        eq(auditEvents.entityType, "inspection"),
        eq(auditEvents.entityId, inspectionId),
      ),
    )
    .orderBy(desc(auditEvents.createdAt));
}

export async function listFindingsForInspection(
  db: Database,
  scope: OrgScope,
  inspectionId: string,
) {
  return db
    .select()
    .from(findings)
    .where(
      and(
        eq(findings.organizationId, scope.organizationId),
        eq(findings.inspectionId, inspectionId),
      ),
    )
    .orderBy(desc(findings.createdAt));
}

async function loadInspection(db: Database, scope: OrgScope, inspectionId: string, lock: boolean) {
  const query = db
    .select()
    .from(inspections)
    .where(
      and(eq(inspections.id, inspectionId), eq(inspections.organizationId, scope.organizationId)),
    )
    .limit(1);
  const [row] = lock ? await query.for("update") : await query;
  return row ?? null;
}

export type ReviewDesk = {
  inspection: typeof inspections.$inferSelect;
  templateName: string;
  templateVersion: number;
  packKey: string | null;
  schema: ReturnType<typeof parseTemplateSchema>;
  siteName: string | null;
  assetName: string | null;
  inspectorName: string | null;
  responses: Record<string, unknown>;
  media: Array<typeof media.$inferSelect>;
  findings: Array<typeof findings.$inferSelect & { ownerName: string | null }>;
  audit: Array<typeof auditEvents.$inferSelect & { actorName: string | null }>;
  members: Awaited<ReturnType<typeof listOrgMembers>>;
  issues: InspectionIssue[];
  liveSnapshot: typeof reportSnapshots.$inferSelect | null;
};

export async function getReviewDesk(
  db: Database,
  scope: OrgScope,
  inspectionId: string,
): Promise<ReviewDesk | null> {
  const job = await loadInspection(db, scope, inspectionId, false);
  if (!job) return null;

  const [version] = await db
    .select()
    .from(templateVersions)
    .where(
      and(
        eq(templateVersions.id, job.templateVersionId),
        eq(templateVersions.organizationId, scope.organizationId),
      ),
    )
    .limit(1);
  if (!version) return null;
  const [template] = await db
    .select()
    .from(templates)
    .where(
      and(eq(templates.id, version.templateId), eq(templates.organizationId, scope.organizationId)),
    )
    .limit(1);
  if (!template) return null;

  const schema = parseTemplateSchema(version.schema);
  const [responseRows, mediaRows, findingRows, auditRows, members, inspector, site, asset, live] =
    await Promise.all([
      db
        .select()
        .from(responses)
        .where(
          and(
            eq(responses.inspectionId, job.id),
            eq(responses.organizationId, scope.organizationId),
          ),
        ),
      db
        .select()
        .from(media)
        .where(and(eq(media.inspectionId, job.id), eq(media.organizationId, scope.organizationId))),
      listFindingsForInspection(db, scope, job.id),
      listAuditForInspection(db, scope, job.id),
      listOrgMembers(db, scope),
      job.assignedToUserId
        ? db.select().from(users).where(eq(users.id, job.assignedToUserId)).limit(1)
        : Promise.resolve([]),
      job.siteId
        ? db
            .select()
            .from(sites)
            .where(and(eq(sites.id, job.siteId), eq(sites.organizationId, scope.organizationId)))
            .limit(1)
        : Promise.resolve([]),
      job.assetId
        ? db
            .select()
            .from(assets)
            .where(and(eq(assets.id, job.assetId), eq(assets.organizationId, scope.organizationId)))
            .limit(1)
        : Promise.resolve([]),
      db
        .select()
        .from(reportSnapshots)
        .where(
          and(
            eq(reportSnapshots.inspectionId, job.id),
            eq(reportSnapshots.organizationId, scope.organizationId),
            isNull(reportSnapshots.revokedAt),
          ),
        )
        .orderBy(desc(reportSnapshots.issuedAt))
        .limit(1),
    ]);

  const memberName = new Map(members.map((m) => [m.userId, m.displayName]));
  const answers = answersMap(responseRows);
  const issues = validateForSubmit(
    schema,
    answers,
    mediaRows
      .filter((row) => row.fieldKey && row.contentHash)
      .map((row) => ({
        mediaId: row.id,
        fieldKey: row.fieldKey!,
        contentHash: row.contentHash!,
        contentType: row.contentType,
        byteSize: row.byteSize ?? 0,
        caption: row.caption ?? undefined,
      })),
  );

  return {
    inspection: job,
    templateName: template.name,
    templateVersion: version.version,
    packKey: template.packKey,
    schema,
    siteName: site[0]?.name ?? null,
    assetName: asset[0]?.name ?? null,
    inspectorName: inspector[0]?.displayName ?? null,
    responses: answers,
    media: mediaRows,
    findings: findingRows.map((row) => ({
      ...row,
      ownerName: row.ownerUserId ? (memberName.get(row.ownerUserId) ?? null) : null,
    })),
    audit: auditRows.map((row) => ({
      ...row,
      actorName: row.actorUserId ? (memberName.get(row.actorUserId) ?? null) : null,
    })),
    members,
    issues,
    liveSnapshot: live[0] ?? null,
  };
}

export async function upsertDerivedFindings(
  db: Database,
  scope: OrgScope,
  inspectionId: string,
): Promise<number> {
  const desk = await getReviewDesk(db, scope, inspectionId);
  if (!desk) return 0;
  const derived = deriveFindingsFromAnswers(desk.schema, desk.responses);
  let created = 0;
  for (const row of derived) {
    const exists = desk.findings.some(
      (finding) => finding.fieldKey === row.fieldKey && finding.title === row.title,
    );
    if (exists) continue;
    await db.insert(findings).values({
      organizationId: scope.organizationId,
      inspectionId,
      fieldKey: row.fieldKey,
      title: row.title,
      severity: row.severity,
      status: "open",
      notes: row.notes,
    });
    created += 1;
  }
  return created;
}

export async function returnInspection(
  db: Database,
  input: {
    organizationId: string;
    inspectionId: string;
    actorUserId: string;
    role: MembershipRole;
    note: string;
  },
): Promise<
  | { ok: true; inspection: typeof inspections.$inferSelect }
  | {
      ok: false;
      error: "not_found" | "denied" | "not_submitted" | "already_approved" | "incomplete";
      message: string;
    }
> {
  return db.transaction(async (tx) => {
    const scoped = tx as unknown as Database;
    const job = await loadInspection(
      scoped,
      { organizationId: input.organizationId },
      input.inspectionId,
      true,
    );
    if (!job)
      return { ok: false as const, error: "not_found" as const, message: "Inspection not found." };
    const planned = planReturn({ status: job.status, role: input.role, note: input.note });
    if (!planned.ok) {
      return {
        ok: false as const,
        error: planned.error,
        message: reviewDeniedMessage(planned.error),
      };
    }
    const [updated] = await scoped
      .update(inspections)
      .set({
        status: "returned",
        reviewNote: input.note.trim(),
        returnedAt: new Date(),
        reviewedByUserId: input.actorUserId,
        updatedAt: new Date(),
        revision: job.revision + 1,
      })
      .where(and(eq(inspections.id, job.id), eq(inspections.organizationId, input.organizationId)))
      .returning();
    if (!updated)
      return { ok: false as const, error: "not_found" as const, message: "Inspection not found." };
    await recordAudit(scoped, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "inspection.returned",
      entityType: "inspection",
      entityId: job.id,
      metadata: { note: input.note.trim() },
    });
    return { ok: true as const, inspection: updated };
  });
}

export async function approveInspection(
  db: Database,
  input: {
    organizationId: string;
    inspectionId: string;
    actorUserId: string;
    actorName: string;
    role: MembershipRole;
    orgName: string;
    orgTimezone: string;
    branding: ReportCanonical["organization"]["branding"];
  },
): Promise<
  | {
      ok: true;
      inspection: typeof inspections.$inferSelect;
      snapshot: typeof reportSnapshots.$inferSelect;
      canonical: ReportCanonical;
      duplicate: boolean;
    }
  | {
      ok: false;
      error: "not_found" | "denied" | "not_submitted" | "already_approved" | "incomplete";
      message: string;
      issues?: InspectionIssue[];
    }
> {
  return db.transaction(async (tx) => {
    const scoped = tx as unknown as Database;
    const scope = { organizationId: input.organizationId };
    const job = await loadInspection(scoped, scope, input.inspectionId, true);
    if (!job)
      return { ok: false as const, error: "not_found" as const, message: "Inspection not found." };

    const [existing] = await scoped
      .select()
      .from(reportSnapshots)
      .where(
        and(
          eq(reportSnapshots.inspectionId, job.id),
          eq(reportSnapshots.organizationId, input.organizationId),
          isNull(reportSnapshots.revokedAt),
        ),
      )
      .limit(1);
    if (existing && job.status === "approved") {
      return {
        ok: true as const,
        inspection: job,
        snapshot: existing,
        canonical: existing.snapshot,
        duplicate: true,
      };
    }

    const desk = await getReviewDesk(scoped, scope, job.id);
    if (!desk)
      return { ok: false as const, error: "not_found" as const, message: "Inspection not found." };

    const planned = planApprove({
      status: job.status,
      role: input.role,
      actorUserId: input.actorUserId,
      assignedToUserId: job.assignedToUserId,
      issues: desk.issues,
    });
    if (!planned.ok) {
      return {
        ok: false as const,
        error: planned.error,
        message: reviewDeniedMessage(planned.error),
        issues: planned.error === "incomplete" ? desk.issues : undefined,
      };
    }

    await upsertDerivedFindings(scoped, scope, job.id);
    const findingsNow = await listFindingsForInspection(scoped, scope, job.id);
    const memberName = new Map(desk.members.map((m) => [m.userId, m.displayName]));

    const canonical = buildReportCanonical({
      layoutKey: layoutForPack(desk.packKey),
      organization: {
        name: input.orgName,
        timezone: input.orgTimezone,
        branding: input.branding,
      },
      inspection: {
        number: job.number,
        templateName: desk.templateName,
        templateVersion: desk.templateVersion,
        siteName: desk.siteName,
        assetName: desk.assetName,
        inspectorName: desk.inspectorName,
        reviewerName: input.actorName,
      },
      schema: desk.schema,
      responses: desk.responses,
      findings: findingsNow.map((row) => ({
        id: row.id,
        title: row.title,
        severity: row.severity,
        status: row.status,
        notes: row.notes,
        fieldKey: row.fieldKey,
        ownerName: row.ownerUserId ? (memberName.get(row.ownerUserId) ?? null) : null,
        dueAt: iso(row.dueAt),
        evidenceHashes: desk.media
          .filter((item) => item.findingId === row.id && item.contentHash)
          .map((item) => item.contentHash!),
      })),
      media: desk.media
        .filter((row) => row.contentHash)
        .map((row) => ({
          id: row.id,
          fieldKey: row.fieldKey,
          caption: row.caption,
          contentType: row.contentType,
          contentHash: row.contentHash!,
          capturedAt: iso(row.capturedAt),
          latitude: row.latitude,
          longitude: row.longitude,
        })),
    });
    const contentHash = await hashReportCanonical(canonical);
    const verificationCode = mintVerificationCode();
    const now = new Date();

    const [updated] = await scoped
      .update(inspections)
      .set({
        status: "approved",
        approvedAt: now,
        reviewedByUserId: input.actorUserId,
        updatedAt: now,
        revision: job.revision + 1,
      })
      .where(and(eq(inspections.id, job.id), eq(inspections.organizationId, input.organizationId)))
      .returning();
    if (!updated)
      return { ok: false as const, error: "not_found" as const, message: "Inspection not found." };

    const [snapshot] = await scoped
      .insert(reportSnapshots)
      .values({
        organizationId: input.organizationId,
        inspectionId: job.id,
        layoutKey: canonical.layoutKey,
        contentHash,
        verificationCode,
        snapshot: canonical,
        issuedAt: now,
        issuedByUserId: input.actorUserId,
      })
      .returning();
    if (!snapshot) throw new Error("Snapshot insert failed");

    await recordAudit(scoped, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "inspection.approved",
      entityType: "inspection",
      entityId: job.id,
      metadata: { snapshotId: snapshot.id, contentHash, verificationCode },
    });
    await recordAudit(scoped, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "report.issued",
      entityType: "report_snapshot",
      entityId: snapshot.id,
      metadata: { inspectionId: job.id, contentHash, verificationCode },
    });

    return { ok: true as const, inspection: updated, snapshot, canonical, duplicate: false };
  });
}

export async function createFinding(
  db: Database,
  input: {
    organizationId: string;
    inspectionId: string;
    actorUserId: string;
    title: string;
    severity: string;
    notes: string | null;
    fieldKey: string | null;
    ownerUserId: string | null;
    dueAt: Date | null;
  },
) {
  const job = await loadInspection(
    db,
    { organizationId: input.organizationId },
    input.inspectionId,
    false,
  );
  if (!job) return { ok: false as const, error: "not_found" as const };
  const [row] = await db
    .insert(findings)
    .values({
      organizationId: input.organizationId,
      inspectionId: input.inspectionId,
      title: input.title.trim(),
      severity: parseFindingSeverity(input.severity),
      status: "open",
      notes: input.notes,
      fieldKey: input.fieldKey,
      ownerUserId: input.ownerUserId,
      dueAt: input.dueAt,
    })
    .returning();
  if (!row) return { ok: false as const, error: "not_found" as const };
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "finding.created",
    entityType: "finding",
    entityId: row.id,
    metadata: { inspectionId: input.inspectionId, title: row.title },
  });
  return { ok: true as const, finding: row };
}

export async function updateFinding(
  db: Database,
  input: {
    organizationId: string;
    findingId: string;
    actorUserId: string;
    title?: string;
    severity?: string;
    notes?: string | null;
    ownerUserId?: string | null;
    dueAt?: Date | null;
    status?: string;
  },
) {
  const [current] = await db
    .select()
    .from(findings)
    .where(and(eq(findings.id, input.findingId), eq(findings.organizationId, input.organizationId)))
    .limit(1);
  if (!current) return { ok: false as const, error: "not_found" as const };

  if (input.status && input.status !== current.status) {
    const next = parseFindingStatus(input.status);
    if (!canTransitionFinding(current.status, next)) {
      return { ok: false as const, error: "invalid_transition" as const };
    }
  }

  const [row] = await db
    .update(findings)
    .set({
      title: input.title?.trim() ?? current.title,
      severity: input.severity ? parseFindingSeverity(input.severity) : current.severity,
      notes: input.notes === undefined ? current.notes : input.notes,
      ownerUserId: input.ownerUserId === undefined ? current.ownerUserId : input.ownerUserId,
      dueAt: input.dueAt === undefined ? current.dueAt : input.dueAt,
      status: input.status ? parseFindingStatus(input.status) : current.status,
      updatedAt: new Date(),
    })
    .where(and(eq(findings.id, input.findingId), eq(findings.organizationId, input.organizationId)))
    .returning();
  if (!row) return { ok: false as const, error: "not_found" as const };
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.status ? "finding.status" : "finding.updated",
    entityType: "finding",
    entityId: row.id,
    metadata: {
      inspectionId: current.inspectionId,
      from: current.status,
      to: row.status,
    },
  });
  return { ok: true as const, finding: row };
}
