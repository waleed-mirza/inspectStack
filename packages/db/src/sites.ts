import { and, desc, eq } from "drizzle-orm";
import {
  canAssignFromSite,
  canManageSites,
  mintQrToken,
  nextInspectionNumber,
  normalizeExternalId,
  normalizeTags,
  parseWorkspaceBranding,
  wouldCreateSiteCycle,
  type MembershipRole,
} from "@inspectstack/domain";
import type { Database } from "./client";
import { isUniqueViolation } from "./errors";
import { assets, auditEvents, inspections, organizations, sites, users } from "./schema";
import { getAsset, getSite, listOrgMembers, recordAudit, type OrgScope } from "./repositories";
import { getTemplateVersion } from "./templates";

export type SiteMutationError =
  | "denied"
  | "not_found"
  | "duplicate_id"
  | "invalid_id"
  | "cycle"
  | "invalid_parent"
  | "name";

export type SiteRecord = typeof sites.$inferSelect;
export type AssetRecord = typeof assets.$inferSelect;
export type InspectionRecord = typeof inspections.$inferSelect;

function nowStamp() {
  return new Date();
}

export async function nextOrgInspectionNumber(db: Database, scope: OrgScope, fallback: string) {
  const rows = await db
    .select({ number: inspections.number })
    .from(inspections)
    .where(eq(inspections.organizationId, scope.organizationId));
  const numbers = rows.map((row) => row.number);
  const [org] = await db
    .select({ branding: organizations.branding, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, scope.organizationId))
    .limit(1);
  const branded = org
    ? parseWorkspaceBranding(org.branding, org.name).formats.inspectionPrefix
    : "";
  const hit = numbers.find((value) => /^[A-Za-z]{1,4}-\d+$/.test(value));
  const prefix = branded || fallback || (hit ? hit.split("-")[0]! : "IS");
  return nextInspectionNumber(numbers, prefix);
}

async function parentRows(db: Database, scope: OrgScope) {
  return db
    .select({ id: sites.id, parentId: sites.parentId })
    .from(sites)
    .where(eq(sites.organizationId, scope.organizationId));
}

async function assertExternalIdFree(
  db: Database,
  table: "sites" | "assets",
  scope: OrgScope,
  externalId: string | null,
  excludeId?: string,
): Promise<boolean> {
  if (!externalId) return true;
  if (table === "sites") {
    const [row] = await db
      .select({ id: sites.id })
      .from(sites)
      .where(and(eq(sites.organizationId, scope.organizationId), eq(sites.externalId, externalId)))
      .limit(1);
    return !row || row.id === excludeId;
  }
  const [row] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.organizationId, scope.organizationId), eq(assets.externalId, externalId)))
    .limit(1);
  return !row || row.id === excludeId;
}

export async function listSitesTree(
  db: Database,
  scope: OrgScope,
  options?: { includeArchived?: boolean },
) {
  const [siteRows, assetRows] = await Promise.all([
    db
      .select()
      .from(sites)
      .where(eq(sites.organizationId, scope.organizationId))
      .orderBy(sites.name),
    db
      .select()
      .from(assets)
      .where(eq(assets.organizationId, scope.organizationId))
      .orderBy(assets.name),
  ]);
  const liveSites = options?.includeArchived ? siteRows : siteRows.filter((row) => !row.archivedAt);
  const liveIds = new Set(liveSites.map((row) => row.id));
  const normalized = liveSites.map((row) => ({
    ...row,
    parentId: row.parentId && liveIds.has(row.parentId) ? row.parentId : null,
  }));
  const liveAssets = options?.includeArchived
    ? assetRows
    : assetRows.filter((row) => !row.archivedAt && liveIds.has(row.siteId));
  return { sites: normalized, assets: liveAssets };
}

export type SiteDesk = {
  site: SiteRecord;
  ancestors: SiteRecord[];
  children: SiteRecord[];
  assets: AssetRecord[];
  history: Array<InspectionRecord & { inspectorName: string | null; assetName: string | null }>;
};

export async function getSiteDesk(
  db: Database,
  scope: OrgScope,
  siteId: string,
): Promise<SiteDesk | null> {
  const site = await getSite(db, scope, siteId);
  if (!site) return null;
  const tree = await listSitesTree(db, scope, { includeArchived: true });
  const byId = new Map(tree.sites.map((row) => [row.id, row]));
  const ancestors: SiteRecord[] = [];
  const seen = new Set<string>();
  let cursor = site.parentId;
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const row = byId.get(cursor);
    if (!row) break;
    ancestors.unshift(row);
    cursor = row.parentId;
  }
  const children = tree.sites.filter((row) => row.parentId === site.id && !row.archivedAt);
  const siteAssets = tree.assets.filter((row) => row.siteId === site.id && !row.archivedAt);
  const history = await db
    .select({
      inspection: inspections,
      inspectorName: users.displayName,
      assetName: assets.name,
    })
    .from(inspections)
    .leftJoin(users, eq(users.id, inspections.assignedToUserId))
    .leftJoin(assets, eq(assets.id, inspections.assetId))
    .where(
      and(eq(inspections.organizationId, scope.organizationId), eq(inspections.siteId, site.id)),
    )
    .orderBy(desc(inspections.updatedAt));
  return {
    site,
    ancestors,
    children,
    assets: siteAssets,
    history: history.map((row) => ({
      ...row.inspection,
      inspectorName: row.inspectorName,
      assetName: row.assetName,
    })),
  };
}

export type AssetDesk = {
  asset: AssetRecord;
  site: SiteRecord;
  history: Array<InspectionRecord & { inspectorName: string | null }>;
};

export async function getAssetDesk(
  db: Database,
  scope: OrgScope,
  assetId: string,
): Promise<AssetDesk | null> {
  const asset = await getAsset(db, scope, assetId);
  if (!asset) return null;
  const site = await getSite(db, scope, asset.siteId);
  if (!site) return null;
  const history = await db
    .select({
      inspection: inspections,
      inspectorName: users.displayName,
    })
    .from(inspections)
    .leftJoin(users, eq(users.id, inspections.assignedToUserId))
    .where(
      and(eq(inspections.organizationId, scope.organizationId), eq(inspections.assetId, asset.id)),
    )
    .orderBy(desc(inspections.updatedAt));
  return {
    asset,
    site,
    history: history.map((row) => ({
      ...row.inspection,
      inspectorName: row.inspectorName,
    })),
  };
}

export async function getAssetByQrToken(db: Database, token: string) {
  const [row] = await db.select().from(assets).where(eq(assets.qrToken, token)).limit(1);
  return row ?? null;
}

async function mintUniqueQrToken(db: Database): Promise<string> {
  for (let i = 0; i < 8; i += 1) {
    const token = mintQrToken();
    const [hit] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(eq(assets.qrToken, token))
      .limit(1);
    if (!hit) return token;
  }
  return mintQrToken();
}

export async function ensureAssetQrToken(
  db: Database,
  scope: OrgScope,
  assetId: string,
): Promise<string | null> {
  const asset = await getAsset(db, scope, assetId);
  if (!asset) return null;
  if (asset.qrToken) return asset.qrToken;
  const token = await mintUniqueQrToken(db);
  const [updated] = await db
    .update(assets)
    .set({ qrToken: token, updatedAt: nowStamp() })
    .where(and(eq(assets.id, asset.id), eq(assets.organizationId, scope.organizationId)))
    .returning();
  return updated?.qrToken ?? token;
}

export async function createSite(
  db: Database,
  input: {
    organizationId: string;
    role: MembershipRole;
    actorUserId: string;
    name: string;
    addressLine?: string | null;
    parentId?: string | null;
    tags?: readonly string[];
    externalId?: string | null;
  },
): Promise<{ ok: true; site: SiteRecord } | { ok: false; error: SiteMutationError }> {
  if (!canManageSites(input.role)) return { ok: false, error: "denied" };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "name" };
  const externalId = normalizeExternalId(input.externalId ?? null);
  if (input.externalId && input.externalId.trim() && !externalId) {
    return { ok: false, error: "invalid_id" };
  }
  const scope = { organizationId: input.organizationId };
  if (input.parentId) {
    const parent = await getSite(db, scope, input.parentId);
    if (!parent || parent.archivedAt) return { ok: false, error: "invalid_parent" };
  }
  if (!(await assertExternalIdFree(db, "sites", scope, externalId))) {
    return { ok: false, error: "duplicate_id" };
  }
  try {
    const [row] = await db
      .insert(sites)
      .values({
        organizationId: input.organizationId,
        name,
        addressLine: input.addressLine?.trim() || null,
        parentId: input.parentId || null,
        tags: normalizeTags(input.tags ?? []),
        externalId,
      })
      .returning();
    if (!row) return { ok: false, error: "not_found" };
    await recordAudit(db, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "site.created",
      entityType: "site",
      entityId: row.id,
      metadata: { name: row.name, externalId: row.externalId },
    });
    return { ok: true, site: row };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "duplicate_id" };
    throw error;
  }
}

export async function updateSite(
  db: Database,
  input: {
    organizationId: string;
    role: MembershipRole;
    actorUserId: string;
    siteId: string;
    name: string;
    addressLine?: string | null;
    parentId?: string | null;
    tags?: readonly string[];
    externalId?: string | null;
  },
): Promise<{ ok: true; site: SiteRecord } | { ok: false; error: SiteMutationError }> {
  if (!canManageSites(input.role)) return { ok: false, error: "denied" };
  const scope = { organizationId: input.organizationId };
  const site = await getSite(db, scope, input.siteId);
  if (!site) return { ok: false, error: "not_found" };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "name" };
  const externalId = normalizeExternalId(input.externalId ?? null);
  if (input.externalId && input.externalId.trim() && !externalId) {
    return { ok: false, error: "invalid_id" };
  }
  const parentId = input.parentId || null;
  if (parentId) {
    const parent = await getSite(db, scope, parentId);
    if (!parent) return { ok: false, error: "invalid_parent" };
  }
  const rows = await parentRows(db, scope);
  if (wouldCreateSiteCycle(rows, site.id, parentId)) return { ok: false, error: "cycle" };
  if (!(await assertExternalIdFree(db, "sites", scope, externalId, site.id))) {
    return { ok: false, error: "duplicate_id" };
  }
  try {
    const [row] = await db
      .update(sites)
      .set({
        name,
        addressLine: input.addressLine?.trim() || null,
        parentId,
        tags: normalizeTags(input.tags ?? []),
        externalId,
        updatedAt: nowStamp(),
      })
      .where(and(eq(sites.id, site.id), eq(sites.organizationId, input.organizationId)))
      .returning();
    if (!row) return { ok: false, error: "not_found" };
    await recordAudit(db, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "site.updated",
      entityType: "site",
      entityId: row.id,
    });
    return { ok: true, site: row };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "duplicate_id" };
    throw error;
  }
}

export async function archiveSite(
  db: Database,
  input: {
    organizationId: string;
    role: MembershipRole;
    actorUserId: string;
    siteId: string;
  },
): Promise<{ ok: true; site: SiteRecord } | { ok: false; error: SiteMutationError }> {
  if (!canManageSites(input.role)) return { ok: false, error: "denied" };
  const site = await getSite(db, { organizationId: input.organizationId }, input.siteId);
  if (!site) return { ok: false, error: "not_found" };
  const [row] = await db
    .update(sites)
    .set({ archivedAt: site.archivedAt ?? nowStamp(), updatedAt: nowStamp() })
    .where(and(eq(sites.id, site.id), eq(sites.organizationId, input.organizationId)))
    .returning();
  if (!row) return { ok: false, error: "not_found" };
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "site.archived",
    entityType: "site",
    entityId: row.id,
  });
  return { ok: true, site: row };
}

export async function createAsset(
  db: Database,
  input: {
    organizationId: string;
    role: MembershipRole;
    actorUserId: string;
    siteId: string;
    name: string;
    tags?: readonly string[];
    externalId?: string | null;
  },
): Promise<{ ok: true; asset: AssetRecord } | { ok: false; error: SiteMutationError }> {
  if (!canManageSites(input.role)) return { ok: false, error: "denied" };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "name" };
  const scope = { organizationId: input.organizationId };
  const site = await getSite(db, scope, input.siteId);
  if (!site || site.archivedAt) return { ok: false, error: "invalid_parent" };
  const externalId = normalizeExternalId(input.externalId ?? null);
  if (input.externalId && input.externalId.trim() && !externalId) {
    return { ok: false, error: "invalid_id" };
  }
  if (!(await assertExternalIdFree(db, "assets", scope, externalId))) {
    return { ok: false, error: "duplicate_id" };
  }
  const qrToken = await mintUniqueQrToken(db);
  try {
    const [row] = await db
      .insert(assets)
      .values({
        organizationId: input.organizationId,
        siteId: site.id,
        name,
        tags: normalizeTags(input.tags ?? []),
        externalId,
        qrToken,
      })
      .returning();
    if (!row) return { ok: false, error: "not_found" };
    await recordAudit(db, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "asset.created",
      entityType: "asset",
      entityId: row.id,
      metadata: { name: row.name, qrToken: row.qrToken },
    });
    return { ok: true, asset: row };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "duplicate_id" };
    throw error;
  }
}

export async function updateAsset(
  db: Database,
  input: {
    organizationId: string;
    role: MembershipRole;
    actorUserId: string;
    assetId: string;
    name: string;
    tags?: readonly string[];
    externalId?: string | null;
    siteId?: string;
  },
): Promise<{ ok: true; asset: AssetRecord } | { ok: false; error: SiteMutationError }> {
  if (!canManageSites(input.role)) return { ok: false, error: "denied" };
  const scope = { organizationId: input.organizationId };
  const asset = await getAsset(db, scope, input.assetId);
  if (!asset) return { ok: false, error: "not_found" };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "name" };
  const externalId = normalizeExternalId(input.externalId ?? null);
  if (input.externalId && input.externalId.trim() && !externalId) {
    return { ok: false, error: "invalid_id" };
  }
  const siteId = input.siteId ?? asset.siteId;
  const site = await getSite(db, scope, siteId);
  if (!site) return { ok: false, error: "invalid_parent" };
  if (!(await assertExternalIdFree(db, "assets", scope, externalId, asset.id))) {
    return { ok: false, error: "duplicate_id" };
  }
  try {
    const [row] = await db
      .update(assets)
      .set({
        name,
        tags: normalizeTags(input.tags ?? []),
        externalId,
        siteId,
        updatedAt: nowStamp(),
      })
      .where(and(eq(assets.id, asset.id), eq(assets.organizationId, input.organizationId)))
      .returning();
    if (!row) return { ok: false, error: "not_found" };
    await recordAudit(db, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "asset.updated",
      entityType: "asset",
      entityId: row.id,
    });
    return { ok: true, asset: row };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "duplicate_id" };
    throw error;
  }
}

export async function archiveAsset(
  db: Database,
  input: {
    organizationId: string;
    role: MembershipRole;
    actorUserId: string;
    assetId: string;
  },
): Promise<{ ok: true; asset: AssetRecord } | { ok: false; error: SiteMutationError }> {
  if (!canManageSites(input.role)) return { ok: false, error: "denied" };
  const asset = await getAsset(db, { organizationId: input.organizationId }, input.assetId);
  if (!asset) return { ok: false, error: "not_found" };
  const [row] = await db
    .update(assets)
    .set({ archivedAt: asset.archivedAt ?? nowStamp(), updatedAt: nowStamp() })
    .where(and(eq(assets.id, asset.id), eq(assets.organizationId, input.organizationId)))
    .returning();
  if (!row) return { ok: false, error: "not_found" };
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "asset.archived",
    entityType: "asset",
    entityId: row.id,
  });
  return { ok: true, asset: row };
}

export type AssignError = SiteMutationError | "template" | "assignee";

export async function assignInspectionToSite(
  db: Database,
  input: {
    organizationId: string;
    role: MembershipRole;
    actorUserId: string;
    siteId: string;
    assetId?: string | null;
    templateVersionId: string;
    assignedToUserId?: string | null;
    dueAt?: Date | null;
    numberPrefix?: string;
  },
): Promise<{ ok: true; inspection: InspectionRecord } | { ok: false; error: AssignError }> {
  if (!canAssignFromSite(input.role)) return { ok: false, error: "denied" };
  const scope = { organizationId: input.organizationId };
  const site = await getSite(db, scope, input.siteId);
  if (!site || site.archivedAt) return { ok: false, error: "not_found" };
  let assetId: string | null = input.assetId ?? null;
  if (assetId) {
    const asset = await getAsset(db, scope, assetId);
    if (!asset || asset.archivedAt || asset.siteId !== site.id) {
      return { ok: false, error: "not_found" };
    }
  }
  const version = await getTemplateVersion(db, scope, input.templateVersionId);
  if (!version || version.status !== "published") return { ok: false, error: "template" };
  if (input.assignedToUserId) {
    const members = await listOrgMembers(db, scope);
    if (!members.some((member) => member.userId === input.assignedToUserId)) {
      return { ok: false, error: "assignee" };
    }
  }
  const number = await nextOrgInspectionNumber(db, scope, input.numberPrefix ?? "IS");
  const [row] = await db
    .insert(inspections)
    .values({
      organizationId: input.organizationId,
      templateVersionId: version.id,
      siteId: site.id,
      assetId,
      assignedToUserId: input.assignedToUserId || null,
      status: "assigned",
      number,
      dueAt: input.dueAt ?? null,
    })
    .returning();
  if (!row) return { ok: false, error: "not_found" };
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "inspection.assigned",
    entityType: "inspection",
    entityId: row.id,
    metadata: { siteId: site.id, assetId, from: "site" },
  });
  return { ok: true, inspection: row };
}

export async function listSiteAudit(db: Database, scope: OrgScope, siteId: string) {
  return db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.organizationId, scope.organizationId),
        eq(auditEvents.entityType, "site"),
        eq(auditEvents.entityId, siteId),
      ),
    )
    .orderBy(desc(auditEvents.createdAt));
}
