import { and, eq } from "drizzle-orm";
import {
  ASSIGNMENT_BUNDLE_VERSION,
  assertOrgPrefixedKey,
  assertSafeImageUpload,
  canMutateInspection,
  defaultUploadPolicy,
  evidenceObjectKey,
  MAX_EVIDENCE_BYTES,
  parseAssignmentBundle,
  parseTemplateSchema,
  payloadHashMatches,
  responseConflicts,
  validateForSubmit,
  type AssignmentBundle,
  type MediaManifest,
  type OperationType,
  type SyncOperation,
  type SyncStatus,
} from "@inspectstack/domain";
import type { Database } from "./client";
import {
  assets,
  findings,
  inspections,
  media,
  organizations,
  responses,
  sites,
  syncOperations,
  templateVersions,
  templates,
} from "./schema";
import type { OrgScope } from "./repositories";
import type { StorageAdapter } from "./storage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const OPERATION_TYPES: ReadonlySet<string> = new Set([
  "start_inspection",
  "set_response",
  "add_media_manifest",
  "update_media_meta",
  "remove_media",
  "submit_inspection",
]);

export type SyncOpApplyRow = {
  operationId: string;
  status: Extract<SyncStatus, "applied" | "conflict" | "failed">;
  duplicate: boolean;
  result: Record<string, unknown> | null;
  error?: string;
};

export type ApplySyncResult =
  | { ok: true; inspectionId: string; revision: number; operations: SyncOpApplyRow[] }
  | { ok: false; error: "not_found" };

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function annotationOf(value: unknown): Record<string, unknown> {
  return asRecord(value);
}

function extFromContentType(contentType: string): string {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("heic")) return "heic";
  return "bin";
}

function toManifest(row: typeof media.$inferSelect): MediaManifest | null {
  if (!row.fieldKey || !row.contentHash) return null;
  return {
    mediaId: row.id,
    fieldKey: row.fieldKey,
    contentHash: row.contentHash,
    contentType: row.contentType,
    byteSize: row.byteSize ?? 0,
    caption: row.caption ?? undefined,
    capturedAt: iso(row.capturedAt) ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    annotation: Object.keys(row.annotation ?? {}).length > 0 ? row.annotation : undefined,
    storageKey: row.storageKey,
  };
}

function pendingStorageKey(input: {
  organizationId: string;
  inspectionId: string;
  mediaId: string;
  contentType: string;
}): string {
  const random = input.mediaId.replaceAll("-", "").slice(0, 16);
  return evidenceObjectKey({
    organizationId: input.organizationId,
    inspectionId: input.inspectionId,
    mediaId: input.mediaId,
    random,
    ext: extFromContentType(input.contentType),
  });
}

async function loadJob(db: Database, scope: OrgScope, inspectionId: string, lock: boolean) {
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

export async function getAssignmentBundle(
  db: Database,
  scope: OrgScope,
  inspectionId: string,
): Promise<AssignmentBundle | null> {
  const job = await loadJob(db, scope, inspectionId, false);
  if (!job) return null;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, scope.organizationId))
    .limit(1);
  if (!org) return null;

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

  const site = job.siteId
    ? (
        await db
          .select()
          .from(sites)
          .where(and(eq(sites.id, job.siteId), eq(sites.organizationId, scope.organizationId)))
          .limit(1)
      )[0]
    : undefined;
  const asset = job.assetId
    ? (
        await db
          .select()
          .from(assets)
          .where(and(eq(assets.id, job.assetId), eq(assets.organizationId, scope.organizationId)))
          .limit(1)
      )[0]
    : undefined;

  const [responseRows, mediaRows, findingRows] = await Promise.all([
    db
      .select()
      .from(responses)
      .where(
        and(eq(responses.inspectionId, job.id), eq(responses.organizationId, scope.organizationId)),
      ),
    db
      .select()
      .from(media)
      .where(and(eq(media.inspectionId, job.id), eq(media.organizationId, scope.organizationId))),
    db
      .select()
      .from(findings)
      .where(
        and(eq(findings.inspectionId, job.id), eq(findings.organizationId, scope.organizationId)),
      ),
  ]);

  return parseAssignmentBundle({
    bundleVersion: ASSIGNMENT_BUNDLE_VERSION,
    downloadedAt: new Date().toISOString(),
    organization: {
      id: org.id,
      name: org.name,
      timezone: org.timezone,
      branding: org.branding,
    },
    inspection: {
      id: job.id,
      number: job.number,
      status: job.status,
      revision: job.revision,
      dueAt: iso(job.dueAt),
      startedAt: iso(job.startedAt),
      assignedToUserId: job.assignedToUserId,
      templateVersionId: job.templateVersionId,
      siteId: job.siteId,
      assetId: job.assetId,
    },
    template: {
      id: template.id,
      name: template.name,
      version: version.version,
      versionId: version.id,
      schema: parseTemplateSchema(version.schema),
    },
    site: site ? { id: site.id, name: site.name, externalId: site.externalId } : null,
    asset: asset ? { id: asset.id, name: asset.name, externalId: asset.externalId } : null,
    responses: responseRows.map((row) => ({
      fieldKey: row.fieldKey,
      value: row.value,
      revision: row.revision,
    })),
    media: mediaRows.map(toManifest).filter((row): row is MediaManifest => row !== null),
    findings: findingRows.map((row) => ({
      id: row.id,
      fieldKey: row.fieldKey,
      title: row.title,
      severity: row.severity,
      status: row.status,
      notes: row.notes,
    })),
    uploadPolicy: defaultUploadPolicy(),
  });
}

async function recordSyncOp(
  db: Database,
  input: {
    organizationId: string;
    inspectionId: string;
    operation: SyncOperation;
    status: Extract<SyncStatus, "applied" | "conflict" | "failed">;
    result: Record<string, unknown> | null;
  },
) {
  await db.insert(syncOperations).values({
    organizationId: input.organizationId,
    inspectionId: input.inspectionId,
    clientOperationId: input.operation.operationId,
    status: input.status,
    payload: {
      type: input.operation.type,
      entityId: input.operation.entityId,
      clientTimestamp: input.operation.clientTimestamp,
      baseRevision: input.operation.baseRevision,
      payloadHash: input.operation.payloadHash,
      payload: input.operation.payload,
    },
    result: input.result,
    appliedAt: input.status === "applied" ? new Date() : null,
  });
}

async function bumpRevision(
  db: Database,
  job: typeof inspections.$inferSelect,
  patch: Partial<typeof inspections.$inferInsert> = {},
) {
  const nextRevision = job.revision + 1;
  const [row] = await db
    .update(inspections)
    .set({
      ...patch,
      revision: nextRevision,
      updatedAt: new Date(),
    })
    .where(and(eq(inspections.id, job.id), eq(inspections.organizationId, job.organizationId)))
    .returning();
  if (!row) throw new Error("Inspection revision update failed");
  return row;
}

async function applyOne(
  db: Database,
  job: typeof inspections.$inferSelect,
  operation: SyncOperation,
  revisionAtOpen: number,
): Promise<{ job: typeof inspections.$inferSelect; row: SyncOpApplyRow }> {
  const orgId = job.organizationId;
  if (operation.inspectionId !== job.id) {
    const row: SyncOpApplyRow = {
      operationId: operation.operationId,
      status: "failed",
      duplicate: false,
      result: null,
      error: "inspection_mismatch",
    };
    await recordSyncOp(db, {
      organizationId: orgId,
      inspectionId: job.id,
      operation,
      status: "failed",
      result: { error: row.error },
    });
    return { job, row };
  }

  if (!(await payloadHashMatches(operation))) {
    const row: SyncOpApplyRow = {
      operationId: operation.operationId,
      status: "failed",
      duplicate: false,
      result: null,
      error: "payload_hash",
    };
    await recordSyncOp(db, {
      organizationId: orgId,
      inspectionId: job.id,
      operation,
      status: "failed",
      result: { error: row.error },
    });
    return { job, row };
  }

  if (!OPERATION_TYPES.has(operation.type)) {
    const row: SyncOpApplyRow = {
      operationId: operation.operationId,
      status: "failed",
      duplicate: false,
      result: null,
      error: "unknown_type",
    };
    await recordSyncOp(db, {
      organizationId: orgId,
      inspectionId: job.id,
      operation,
      status: "failed",
      result: { error: row.error },
    });
    return { job, row };
  }

  if (!canMutateInspection(job.status)) {
    const row: SyncOpApplyRow = {
      operationId: operation.operationId,
      status: "failed",
      duplicate: false,
      result: null,
      error: "locked",
    };
    await recordSyncOp(db, {
      organizationId: orgId,
      inspectionId: job.id,
      operation,
      status: "failed",
      result: { error: row.error },
    });
    return { job, row };
  }

  const type = operation.type as OperationType;

  if (type === "set_response" && responseConflicts(operation.baseRevision, revisionAtOpen)) {
    const fieldKey =
      (typeof operation.payload.fieldKey === "string" && operation.payload.fieldKey) ||
      operation.entityId;
    const row: SyncOpApplyRow = {
      operationId: operation.operationId,
      status: "conflict",
      duplicate: false,
      result: {
        fieldKey,
        serverRevision: revisionAtOpen,
        baseRevision: operation.baseRevision,
      },
    };
    await recordSyncOp(db, {
      organizationId: orgId,
      inspectionId: job.id,
      operation,
      status: "conflict",
      result: row.result,
    });
    return { job, row };
  }

  if (type === "start_inspection") {
    const next = await bumpRevision(db, job, {
      status: job.status === "draft" || job.status === "assigned" ? "in_progress" : job.status,
      startedAt: job.startedAt ?? new Date(),
    });
    const row: SyncOpApplyRow = {
      operationId: operation.operationId,
      status: "applied",
      duplicate: false,
      result: { revision: next.revision, status: next.status },
    };
    await recordSyncOp(db, {
      organizationId: orgId,
      inspectionId: job.id,
      operation,
      status: "applied",
      result: row.result,
    });
    return { job: next, row };
  }

  if (type === "set_response") {
    const fieldKey =
      (typeof operation.payload.fieldKey === "string" && operation.payload.fieldKey) ||
      operation.entityId;
    if (!fieldKey) {
      const row: SyncOpApplyRow = {
        operationId: operation.operationId,
        status: "failed",
        duplicate: false,
        result: null,
        error: "field_key",
      };
      await recordSyncOp(db, {
        organizationId: orgId,
        inspectionId: job.id,
        operation,
        status: "failed",
        result: { error: row.error },
      });
      return { job, row };
    }
    const next = await bumpRevision(db, job);
    await db
      .insert(responses)
      .values({
        organizationId: orgId,
        inspectionId: job.id,
        fieldKey,
        value: operation.payload.value ?? {},
        revision: next.revision,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [responses.inspectionId, responses.fieldKey],
        set: {
          value: operation.payload.value ?? {},
          revision: next.revision,
          updatedAt: new Date(),
        },
      });
    const row: SyncOpApplyRow = {
      operationId: operation.operationId,
      status: "applied",
      duplicate: false,
      result: { revision: next.revision, fieldKey },
    };
    await recordSyncOp(db, {
      organizationId: orgId,
      inspectionId: job.id,
      operation,
      status: "applied",
      result: row.result,
    });
    return { job: next, row };
  }

  if (type === "add_media_manifest") {
    const mediaId =
      (typeof operation.payload.mediaId === "string" && operation.payload.mediaId) ||
      operation.entityId;
    const fieldKey =
      typeof operation.payload.fieldKey === "string" ? operation.payload.fieldKey : "";
    const contentHash =
      typeof operation.payload.contentHash === "string" ? operation.payload.contentHash : "";
    const contentType =
      typeof operation.payload.contentType === "string"
        ? operation.payload.contentType
        : "application/octet-stream";
    if (!UUID.test(mediaId) || !fieldKey || !contentHash) {
      const row: SyncOpApplyRow = {
        operationId: operation.operationId,
        status: "failed",
        duplicate: false,
        result: null,
        error: "media_manifest",
      };
      await recordSyncOp(db, {
        organizationId: orgId,
        inspectionId: job.id,
        operation,
        status: "failed",
        result: { error: row.error },
      });
      return { job, row };
    }

    const [byId] = await db
      .select()
      .from(media)
      .where(and(eq(media.id, mediaId), eq(media.organizationId, orgId)))
      .limit(1);
    if (byId && byId.inspectionId !== job.id) {
      const row: SyncOpApplyRow = {
        operationId: operation.operationId,
        status: "failed",
        duplicate: false,
        result: null,
        error: "media_tenant",
      };
      await recordSyncOp(db, {
        organizationId: orgId,
        inspectionId: job.id,
        operation,
        status: "failed",
        result: { error: row.error },
      });
      return { job, row };
    }
    const [byHash] = await db
      .select()
      .from(media)
      .where(
        and(
          eq(media.organizationId, orgId),
          eq(media.inspectionId, job.id),
          eq(media.contentHash, contentHash),
        ),
      )
      .limit(1);
    const existing = byId ?? byHash;
    if (existing) {
      const next = await bumpRevision(db, job);
      const row: SyncOpApplyRow = {
        operationId: operation.operationId,
        status: "applied",
        duplicate: false,
        result: { revision: next.revision, mediaId: existing.id, deduped: true },
      };
      await recordSyncOp(db, {
        organizationId: orgId,
        inspectionId: job.id,
        operation,
        status: "applied",
        result: row.result,
      });
      return { job: next, row };
    }

    let storageKey =
      typeof operation.payload.storageKey === "string" ? operation.payload.storageKey : "";
    if (storageKey) {
      try {
        assertOrgPrefixedKey(orgId, storageKey);
      } catch {
        const row: SyncOpApplyRow = {
          operationId: operation.operationId,
          status: "failed",
          duplicate: false,
          result: null,
          error: "storage_key",
        };
        await recordSyncOp(db, {
          organizationId: orgId,
          inspectionId: job.id,
          operation,
          status: "failed",
          result: { error: row.error },
        });
        return { job, row };
      }
    } else {
      storageKey = pendingStorageKey({
        organizationId: orgId,
        inspectionId: job.id,
        mediaId,
        contentType,
      });
    }

    const capturedAt =
      typeof operation.payload.capturedAt === "string"
        ? new Date(operation.payload.capturedAt)
        : null;
    const latitude =
      typeof operation.payload.latitude === "number" && Number.isFinite(operation.payload.latitude)
        ? operation.payload.latitude
        : null;
    const longitude =
      typeof operation.payload.longitude === "number" &&
      Number.isFinite(operation.payload.longitude)
        ? operation.payload.longitude
        : null;

    await db.insert(media).values({
      id: mediaId,
      organizationId: orgId,
      inspectionId: job.id,
      fieldKey,
      storageKey,
      contentType,
      byteSize: typeof operation.payload.byteSize === "number" ? operation.payload.byteSize : 0,
      contentHash,
      caption: typeof operation.payload.caption === "string" ? operation.payload.caption : null,
      capturedAt: capturedAt && !Number.isNaN(capturedAt.getTime()) ? capturedAt : null,
      latitude,
      longitude,
      annotation: annotationOf(operation.payload.annotation),
    });
    const next = await bumpRevision(db, job);
    const row: SyncOpApplyRow = {
      operationId: operation.operationId,
      status: "applied",
      duplicate: false,
      result: { revision: next.revision, mediaId, storageKey },
    };
    await recordSyncOp(db, {
      organizationId: orgId,
      inspectionId: job.id,
      operation,
      status: "applied",
      result: row.result,
    });
    return { job: next, row };
  }

  if (type === "update_media_meta") {
    const mediaId =
      (typeof operation.payload.mediaId === "string" && operation.payload.mediaId) ||
      operation.entityId;
    const patch: {
      caption?: string;
      annotation?: Record<string, unknown>;
    } = {};
    if (typeof operation.payload.caption === "string") patch.caption = operation.payload.caption;
    if (operation.payload.annotation !== undefined) {
      patch.annotation = annotationOf(operation.payload.annotation);
    }
    const [updated] = await db
      .update(media)
      .set(patch)
      .where(
        and(eq(media.id, mediaId), eq(media.organizationId, orgId), eq(media.inspectionId, job.id)),
      )
      .returning();
    if (!updated) {
      const row: SyncOpApplyRow = {
        operationId: operation.operationId,
        status: "failed",
        duplicate: false,
        result: null,
        error: "media_not_found",
      };
      await recordSyncOp(db, {
        organizationId: orgId,
        inspectionId: job.id,
        operation,
        status: "failed",
        result: { error: row.error },
      });
      return { job, row };
    }
    const next = await bumpRevision(db, job);
    const row: SyncOpApplyRow = {
      operationId: operation.operationId,
      status: "applied",
      duplicate: false,
      result: { revision: next.revision, mediaId },
    };
    await recordSyncOp(db, {
      organizationId: orgId,
      inspectionId: job.id,
      operation,
      status: "applied",
      result: row.result,
    });
    return { job: next, row };
  }

  if (type === "remove_media") {
    const mediaId =
      (typeof operation.payload.mediaId === "string" && operation.payload.mediaId) ||
      operation.entityId;
    const [removed] = await db
      .delete(media)
      .where(
        and(eq(media.id, mediaId), eq(media.organizationId, orgId), eq(media.inspectionId, job.id)),
      )
      .returning();
    if (!removed) {
      const row: SyncOpApplyRow = {
        operationId: operation.operationId,
        status: "failed",
        duplicate: false,
        result: null,
        error: "media_not_found",
      };
      await recordSyncOp(db, {
        organizationId: orgId,
        inspectionId: job.id,
        operation,
        status: "failed",
        result: { error: row.error },
      });
      return { job, row };
    }
    const next = await bumpRevision(db, job);
    const row: SyncOpApplyRow = {
      operationId: operation.operationId,
      status: "applied",
      duplicate: false,
      result: { revision: next.revision, mediaId, removed: true },
    };
    await recordSyncOp(db, {
      organizationId: orgId,
      inspectionId: job.id,
      operation,
      status: "applied",
      result: row.result,
    });
    return { job: next, row };
  }

  if (type === "submit_inspection") {
    const [version] = await db
      .select()
      .from(templateVersions)
      .where(
        and(
          eq(templateVersions.id, job.templateVersionId),
          eq(templateVersions.organizationId, orgId),
        ),
      )
      .limit(1);
    if (!version) {
      const row: SyncOpApplyRow = {
        operationId: operation.operationId,
        status: "failed",
        duplicate: false,
        result: null,
        error: "template_missing",
      };
      await recordSyncOp(db, {
        organizationId: orgId,
        inspectionId: job.id,
        operation,
        status: "failed",
        result: { error: row.error },
      });
      return { job, row };
    }
    const schema = parseTemplateSchema(version.schema);
    const [responseRows, mediaRows] = await Promise.all([
      db
        .select()
        .from(responses)
        .where(and(eq(responses.inspectionId, job.id), eq(responses.organizationId, orgId))),
      db
        .select()
        .from(media)
        .where(and(eq(media.inspectionId, job.id), eq(media.organizationId, orgId))),
    ]);
    const answerMap: Record<string, unknown> = {};
    for (const item of responseRows) answerMap[item.fieldKey] = item.value;
    const issues = validateForSubmit(
      schema,
      answerMap,
      mediaRows.map(toManifest).filter((row): row is MediaManifest => row !== null),
    );
    if (issues.length > 0) {
      const row: SyncOpApplyRow = {
        operationId: operation.operationId,
        status: "failed",
        duplicate: false,
        result: { issues },
        error: "incomplete",
      };
      await recordSyncOp(db, {
        organizationId: orgId,
        inspectionId: job.id,
        operation,
        status: "failed",
        result: row.result,
      });
      return { job, row };
    }
    const next = await bumpRevision(db, job, {
      status: "submitted",
      submittedAt: new Date(),
    });
    const { upsertDerivedFindings } = await import("./review");
    await upsertDerivedFindings(db, { organizationId: orgId }, job.id);
    const row: SyncOpApplyRow = {
      operationId: operation.operationId,
      status: "applied",
      duplicate: false,
      result: { revision: next.revision, status: next.status },
    };
    await recordSyncOp(db, {
      organizationId: orgId,
      inspectionId: job.id,
      operation,
      status: "applied",
      result: row.result,
    });
    return { job: next, row };
  }

  const row: SyncOpApplyRow = {
    operationId: operation.operationId,
    status: "failed",
    duplicate: false,
    result: null,
    error: "unknown_type",
  };
  await recordSyncOp(db, {
    organizationId: orgId,
    inspectionId: job.id,
    operation,
    status: "failed",
    result: { error: row.error },
  });
  return { job, row };
}

export async function applySyncOperations(
  db: Database,
  input: { organizationId: string; inspectionId: string; operations: SyncOperation[] },
): Promise<ApplySyncResult> {
  return db.transaction(async (tx) => {
    const scoped = tx as unknown as Database;
    const job = await loadJob(
      scoped,
      { organizationId: input.organizationId },
      input.inspectionId,
      true,
    );
    if (!job) return { ok: false as const, error: "not_found" as const };

    const revisionAtOpen = job.revision;
    const operations: SyncOpApplyRow[] = [];
    let current = job;

    for (const operation of input.operations) {
      const [existing] = await scoped
        .select()
        .from(syncOperations)
        .where(
          and(
            eq(syncOperations.organizationId, input.organizationId),
            eq(syncOperations.clientOperationId, operation.operationId),
          ),
        )
        .limit(1);
      if (existing) {
        const status =
          existing.status === "applied" ||
          existing.status === "conflict" ||
          existing.status === "failed"
            ? existing.status
            : "failed";
        operations.push({
          operationId: operation.operationId,
          status,
          duplicate: true,
          result: existing.result,
        });
        continue;
      }
      const applied = await applyOne(scoped, current, operation, revisionAtOpen);
      current = applied.job;
      operations.push(applied.row);
    }

    return {
      ok: true as const,
      inspectionId: current.id,
      revision: current.revision,
      operations,
    };
  });
}

export async function putInspectionMediaBytes(
  db: Database,
  storage: StorageAdapter,
  scope: OrgScope,
  input: { inspectionId: string; mediaId: string; bytes: Buffer; contentType: string },
): Promise<{ ok: true; storageKey: string } | { ok: false; error: "not_found" | "mismatch" }> {
  if (!UUID.test(input.inspectionId) || !UUID.test(input.mediaId)) {
    return { ok: false, error: "mismatch" };
  }
  const sniffed = assertSafeImageUpload(
    new Uint8Array(input.bytes),
    input.contentType,
    MAX_EVIDENCE_BYTES,
  );
  if (!sniffed.ok) return { ok: false, error: "mismatch" };
  const [row] = await db
    .select()
    .from(media)
    .where(
      and(
        eq(media.id, input.mediaId),
        eq(media.organizationId, scope.organizationId),
        eq(media.inspectionId, input.inspectionId),
      ),
    )
    .limit(1);
  if (!row) return { ok: false, error: "not_found" };
  await storage.put(scope.organizationId, row.storageKey, input.bytes, sniffed.contentType);
  await db
    .update(media)
    .set({
      byteSize: input.bytes.byteLength,
      contentType: sniffed.contentType,
    })
    .where(and(eq(media.id, row.id), eq(media.organizationId, scope.organizationId)));
  return { ok: true, storageKey: row.storageKey };
}
