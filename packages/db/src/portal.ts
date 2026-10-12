import { and, desc, eq, ne } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";
import {
  assertOrgPrefixedKey,
  canCommentOnFinding,
  canOpenActionsPortal,
  canUploadFindingEvidence,
  evidenceObjectKey,
  parseFindingStatus,
  planAdvanceFinding,
  portalDeniedMessage,
  type FindingStatus,
  type MembershipRole,
} from "@inspectstack/domain";
import type { Database } from "./client";
import { assets, findings, findingComments, inspections, media, sites, users } from "./schema";
import { getFinding, recordAudit, type OrgScope } from "./repositories";
import type { StorageAdapter } from "./storage";

export type PortalError = "denied" | "not_found" | "illegal" | "empty" | "invalid";

export type PortalFindingRow = typeof findings.$inferSelect & {
  inspectionNumber: string;
  siteName: string | null;
  assetName: string | null;
  ownerName: string | null;
};

export async function listPortalQueue(
  db: Database,
  scope: OrgScope,
  options?: { includeClosed?: boolean },
): Promise<PortalFindingRow[]> {
  const rows = await db
    .select({
      finding: findings,
      inspectionNumber: inspections.number,
      siteName: sites.name,
      assetName: assets.name,
      ownerName: users.displayName,
    })
    .from(findings)
    .innerJoin(inspections, eq(inspections.id, findings.inspectionId))
    .leftJoin(sites, eq(sites.id, inspections.siteId))
    .leftJoin(assets, eq(assets.id, inspections.assetId))
    .leftJoin(users, eq(users.id, findings.ownerUserId))
    .where(
      options?.includeClosed
        ? eq(findings.organizationId, scope.organizationId)
        : and(eq(findings.organizationId, scope.organizationId), ne(findings.status, "closed")),
    )
    .orderBy(desc(findings.dueAt), desc(findings.updatedAt));
  return rows.map((row) => ({
    ...row.finding,
    inspectionNumber: row.inspectionNumber,
    siteName: row.siteName,
    assetName: row.assetName,
    ownerName: row.ownerName,
  }));
}

export type PortalFindingDesk = {
  finding: PortalFindingRow;
  comments: Array<typeof findingComments.$inferSelect & { authorName: string | null }>;
  evidence: Array<typeof media.$inferSelect>;
};

export async function getPortalFinding(
  db: Database,
  scope: OrgScope,
  findingId: string,
): Promise<PortalFindingDesk | null> {
  const finding = await getFinding(db, scope, findingId);
  if (!finding) return null;
  const [meta] = await db
    .select({
      inspectionNumber: inspections.number,
      siteName: sites.name,
      assetName: assets.name,
    })
    .from(inspections)
    .leftJoin(sites, eq(sites.id, inspections.siteId))
    .leftJoin(assets, eq(assets.id, inspections.assetId))
    .where(
      and(
        eq(inspections.id, finding.inspectionId),
        eq(inspections.organizationId, scope.organizationId),
      ),
    )
    .limit(1);
  let ownerName: string | null = null;
  if (finding.ownerUserId) {
    const [owner] = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, finding.ownerUserId))
      .limit(1);
    ownerName = owner?.displayName ?? null;
  }
  const comments = await db
    .select({
      comment: findingComments,
      authorName: users.displayName,
    })
    .from(findingComments)
    .leftJoin(users, eq(users.id, findingComments.authorUserId))
    .where(
      and(
        eq(findingComments.organizationId, scope.organizationId),
        eq(findingComments.findingId, finding.id),
      ),
    )
    .orderBy(findingComments.createdAt);
  const evidence = await db
    .select()
    .from(media)
    .where(and(eq(media.organizationId, scope.organizationId), eq(media.findingId, finding.id)))
    .orderBy(desc(media.createdAt));
  return {
    finding: {
      ...finding,
      inspectionNumber: meta?.inspectionNumber ?? "",
      siteName: meta?.siteName ?? null,
      assetName: meta?.assetName ?? null,
      ownerName,
    },
    comments: comments.map((row) => ({ ...row.comment, authorName: row.authorName })),
    evidence,
  };
}

export async function addFindingComment(
  db: Database,
  input: {
    organizationId: string;
    role: MembershipRole;
    actorUserId: string;
    findingId: string;
    body: string;
  },
): Promise<{ ok: true } | { ok: false; error: PortalError; message: string }> {
  if (!canCommentOnFinding(input.role) || !canOpenActionsPortal(input.role)) {
    return { ok: false, error: "denied", message: "You cannot comment on this finding." };
  }
  const body = input.body.trim();
  if (!body) return { ok: false, error: "empty", message: "Write a comment before saving." };
  const finding = await getFinding(db, { organizationId: input.organizationId }, input.findingId);
  if (!finding) return { ok: false, error: "not_found", message: "Finding not found." };
  await db.insert(findingComments).values({
    organizationId: input.organizationId,
    findingId: finding.id,
    authorUserId: input.actorUserId,
    body,
  });
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "finding.commented",
    entityType: "finding",
    entityId: finding.id,
  });
  return { ok: true };
}

export async function transitionPortalFinding(
  db: Database,
  input: {
    organizationId: string;
    role: MembershipRole;
    actorUserId: string;
    findingId: string;
    to: FindingStatus;
  },
): Promise<
  { ok: true; status: FindingStatus } | { ok: false; error: PortalError; message: string }
> {
  const finding = await getFinding(db, { organizationId: input.organizationId }, input.findingId);
  if (!finding) return { ok: false, error: "not_found", message: "Finding not found." };
  const planned = planAdvanceFinding({
    role: input.role,
    from: parseFindingStatus(finding.status),
    to: input.to,
  });
  if (!planned.ok) {
    return {
      ok: false,
      error: planned.error,
      message: portalDeniedMessage(planned.error),
    };
  }
  const [row] = await db
    .update(findings)
    .set({ status: planned.to, updatedAt: new Date() })
    .where(and(eq(findings.id, finding.id), eq(findings.organizationId, input.organizationId)))
    .returning();
  if (!row) return { ok: false, error: "not_found", message: "Finding not found." };
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: `finding.${planned.to}`,
    entityType: "finding",
    entityId: finding.id,
    metadata: { from: finding.status, to: planned.to },
  });
  return { ok: true, status: planned.to };
}

function extFromContentType(contentType: string): string {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("heic")) return "heic";
  return "bin";
}

export async function attachFindingEvidence(
  db: Database,
  storage: StorageAdapter,
  input: {
    organizationId: string;
    role: MembershipRole;
    actorUserId: string;
    findingId: string;
    bytes: Buffer;
    contentType: string;
    caption?: string | null;
  },
): Promise<{ ok: true; mediaId: string } | { ok: false; error: PortalError; message: string }> {
  if (!canUploadFindingEvidence(input.role)) {
    return { ok: false, error: "denied", message: "You cannot attach evidence here." };
  }
  const finding = await getFinding(db, { organizationId: input.organizationId }, input.findingId);
  if (!finding) return { ok: false, error: "not_found", message: "Finding not found." };
  if (input.bytes.length === 0) {
    return { ok: false, error: "invalid", message: "The file was empty." };
  }
  const mediaId = randomUUID();
  const key = evidenceObjectKey({
    organizationId: input.organizationId,
    inspectionId: finding.inspectionId,
    mediaId,
    random: randomBytes(8).toString("hex"),
    ext: extFromContentType(input.contentType),
  });
  assertOrgPrefixedKey(input.organizationId, key);
  await storage.put(input.organizationId, key, input.bytes, input.contentType);
  await db.insert(media).values({
    id: mediaId,
    organizationId: input.organizationId,
    inspectionId: finding.inspectionId,
    findingId: finding.id,
    storageKey: key,
    contentType: input.contentType,
    byteSize: input.bytes.length,
    caption: input.caption?.trim() || null,
    capturedAt: new Date(),
  });
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "finding.evidence",
    entityType: "finding",
    entityId: finding.id,
    metadata: { mediaId },
  });
  return { ok: true, mediaId };
}
