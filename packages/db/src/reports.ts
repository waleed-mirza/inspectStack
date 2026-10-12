import { and, desc, eq, isNull } from "drizzle-orm";
import {
  isShareUnavailable,
  mintShareToken,
  parseReportCanonical,
  reportObjectKey,
  sha256Hex,
  type ReportCanonical,
} from "@inspectstack/domain";
import type { Database } from "./client";
import {
  inspections,
  organizations,
  reportDownloads,
  reportShareLinks,
  reportSnapshots,
} from "./schema";
import { recordAudit, type OrgScope } from "./repositories";
import type { StorageAdapter } from "./storage";

async function hashToken(token: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(token));
}

export type PublicReport =
  | { ok: true; snapshot: typeof reportSnapshots.$inferSelect; canonical: ReportCanonical }
  | { ok: false; error: "unavailable" };

export async function getLiveSnapshotForInspection(
  db: Database,
  scope: OrgScope,
  inspectionId: string,
) {
  const [row] = await db
    .select()
    .from(reportSnapshots)
    .where(
      and(
        eq(reportSnapshots.inspectionId, inspectionId),
        eq(reportSnapshots.organizationId, scope.organizationId),
        isNull(reportSnapshots.revokedAt),
      ),
    )
    .orderBy(desc(reportSnapshots.issuedAt))
    .limit(1);
  return row ?? null;
}

export async function attachReportPdf(
  db: Database,
  storage: StorageAdapter,
  input: {
    organizationId: string;
    snapshotId: string;
    pdf: Buffer;
  },
) {
  const [row] = await db
    .select()
    .from(reportSnapshots)
    .where(
      and(
        eq(reportSnapshots.id, input.snapshotId),
        eq(reportSnapshots.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!row) return { ok: false as const, error: "not_found" as const };
  const key = reportObjectKey({
    organizationId: input.organizationId,
    inspectionId: row.inspectionId,
    snapshotId: row.id,
  });
  await storage.put(input.organizationId, key, input.pdf, "application/pdf");
  const [updated] = await db
    .update(reportSnapshots)
    .set({ storageKey: key })
    .where(eq(reportSnapshots.id, row.id))
    .returning();
  return { ok: true as const, snapshot: updated ?? row, storageKey: key };
}

export async function getPublicReportByCode(db: Database, code: string): Promise<PublicReport> {
  const [row] = await db
    .select()
    .from(reportSnapshots)
    .where(eq(reportSnapshots.verificationCode, code.trim().toUpperCase()))
    .limit(1);
  if (!row || isShareUnavailable({ revokedAt: row.revokedAt, expiresAt: row.expiresAt })) {
    return { ok: false, error: "unavailable" };
  }
  try {
    return { ok: true, snapshot: row, canonical: parseReportCanonical(row.snapshot) };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

export async function getPublicReportByShareToken(
  db: Database,
  token: string,
): Promise<PublicReport> {
  const tokenHash = await hashToken(token);
  const [link] = await db
    .select()
    .from(reportShareLinks)
    .where(eq(reportShareLinks.tokenHash, tokenHash))
    .limit(1);
  if (!link || isShareUnavailable({ revokedAt: link.revokedAt, expiresAt: link.expiresAt })) {
    return { ok: false, error: "unavailable" };
  }
  const [row] = await db
    .select()
    .from(reportSnapshots)
    .where(eq(reportSnapshots.id, link.snapshotId))
    .limit(1);
  if (!row || isShareUnavailable({ revokedAt: row.revokedAt, expiresAt: row.expiresAt })) {
    return { ok: false, error: "unavailable" };
  }
  try {
    return { ok: true, snapshot: row, canonical: parseReportCanonical(row.snapshot) };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

export async function createShareLink(
  db: Database,
  input: {
    organizationId: string;
    snapshotId: string;
    actorUserId: string;
    expiresAt: Date | null;
  },
) {
  const [snapshot] = await db
    .select()
    .from(reportSnapshots)
    .where(
      and(
        eq(reportSnapshots.id, input.snapshotId),
        eq(reportSnapshots.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!snapshot) return { ok: false as const, error: "not_found" as const };
  if (snapshot.revokedAt) return { ok: false as const, error: "revoked" as const };
  const token = mintShareToken();
  const tokenHash = await hashToken(token);
  const [link] = await db
    .insert(reportShareLinks)
    .values({
      organizationId: input.organizationId,
      snapshotId: snapshot.id,
      tokenHash,
      expiresAt: input.expiresAt,
      createdByUserId: input.actorUserId,
    })
    .returning();
  if (!link) throw new Error("Share link insert failed");
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "report.share_created",
    entityType: "report_snapshot",
    entityId: snapshot.id,
    metadata: { shareLinkId: link.id, expiresAt: input.expiresAt?.toISOString() ?? null },
  });
  return { ok: true as const, token, link };
}

export async function revokeSnapshot(
  db: Database,
  input: { organizationId: string; snapshotId: string; actorUserId: string },
) {
  const now = new Date();
  const [row] = await db
    .update(reportSnapshots)
    .set({ revokedAt: now })
    .where(
      and(
        eq(reportSnapshots.id, input.snapshotId),
        eq(reportSnapshots.organizationId, input.organizationId),
        isNull(reportSnapshots.revokedAt),
      ),
    )
    .returning();
  if (!row) return { ok: false as const, error: "not_found" as const };
  await db
    .update(reportShareLinks)
    .set({ revokedAt: now })
    .where(
      and(
        eq(reportShareLinks.snapshotId, row.id),
        eq(reportShareLinks.organizationId, input.organizationId),
        isNull(reportShareLinks.revokedAt),
      ),
    );
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "report.revoked",
    entityType: "report_snapshot",
    entityId: row.id,
    metadata: { verificationCode: row.verificationCode },
  });
  return { ok: true as const, snapshot: row };
}

export async function revokeShareLink(
  db: Database,
  input: { organizationId: string; shareLinkId: string; actorUserId: string },
) {
  const [row] = await db
    .update(reportShareLinks)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(reportShareLinks.id, input.shareLinkId),
        eq(reportShareLinks.organizationId, input.organizationId),
        isNull(reportShareLinks.revokedAt),
      ),
    )
    .returning();
  if (!row) return { ok: false as const, error: "not_found" as const };
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "report.share_revoked",
    entityType: "report_snapshot",
    entityId: row.snapshotId,
    metadata: { shareLinkId: row.id },
  });
  return { ok: true as const, link: row };
}

export async function listShareLinks(db: Database, scope: OrgScope, snapshotId: string) {
  return db
    .select()
    .from(reportShareLinks)
    .where(
      and(
        eq(reportShareLinks.organizationId, scope.organizationId),
        eq(reportShareLinks.snapshotId, snapshotId),
      ),
    )
    .orderBy(desc(reportShareLinks.createdAt));
}

export async function logReportDownload(
  db: Database,
  input: {
    organizationId: string;
    snapshotId: string;
    source: "verify" | "share" | "app";
    actorUserId?: string | null;
    shareLinkId?: string | null;
  },
) {
  await db.insert(reportDownloads).values({
    organizationId: input.organizationId,
    snapshotId: input.snapshotId,
    source: input.source,
    actorUserId: input.actorUserId ?? null,
    shareLinkId: input.shareLinkId ?? null,
  });
}

export async function getSnapshotPdfBytes(
  db: Database,
  storage: StorageAdapter,
  snapshot: typeof reportSnapshots.$inferSelect,
): Promise<Buffer | null> {
  if (!snapshot.storageKey) return null;
  const url = await storage.signedDownloadUrl(snapshot.organizationId, snapshot.storageKey, 60);
  const response = await fetch(url);
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

export async function getOrgForSnapshot(db: Database, organizationId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return org ?? null;
}

export async function getInspectionNumber(db: Database, scope: OrgScope, inspectionId: string) {
  const [row] = await db
    .select({ number: inspections.number })
    .from(inspections)
    .where(
      and(eq(inspections.id, inspectionId), eq(inspections.organizationId, scope.organizationId)),
    )
    .limit(1);
  return row?.number ?? null;
}
