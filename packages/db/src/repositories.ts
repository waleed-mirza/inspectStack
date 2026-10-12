import { and, desc, eq, sql } from "drizzle-orm";
import {
  parseFeatureFlags,
  parsePlanKey,
  parseWorkspaceBranding,
  type AppMode,
  type MembershipRole,
  type MembershipStatus,
} from "@inspectstack/domain";
import type { Database } from "./client";
import {
  assets,
  auditEvents,
  findings,
  inspections,
  invitations,
  media,
  memberships,
  organizations,
  reportSnapshots,
  sites,
  templates,
  users,
} from "./schema";

export type OrgScope = { organizationId: string };

export async function listMembershipsForUser(db: Database, userId: string) {
  const rows = await db
    .select({
      membershipId: memberships.id,
      organizationId: memberships.organizationId,
      role: memberships.role,
      status: memberships.status,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      appMode: organizations.appMode,
      branding: organizations.branding,
      timezone: organizations.timezone,
      planKey: organizations.planKey,
      featureFlags: organizations.featureFlags,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")));
  return rows.map((row) => ({
    ...row,
    planKey: parsePlanKey(row.planKey),
    featureFlags: parseFeatureFlags(row.featureFlags),
    branding: parseWorkspaceBranding(row.branding, row.organizationName),
  }));
}

export async function getUserProfile(db: Database, userId: string) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

export async function getOrganization(db: Database, scope: OrgScope) {
  const [row] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, scope.organizationId))
    .limit(1);
  return row ?? null;
}

export async function updateOrganizationMode(db: Database, scope: OrgScope, appMode: AppMode) {
  const [row] = await db
    .update(organizations)
    .set({ appMode })
    .where(eq(organizations.id, scope.organizationId))
    .returning();
  return row ?? null;
}

export async function updateOrganizationBranding(
  db: Database,
  scope: OrgScope,
  branding: typeof organizations.$inferInsert.branding,
) {
  const [row] = await db
    .update(organizations)
    .set({ branding, updatedAt: new Date() })
    .where(eq(organizations.id, scope.organizationId))
    .returning();
  return row ?? null;
}

export async function updateOrganizationIdentity(
  db: Database,
  scope: OrgScope,
  input: { name: string; timezone: string },
) {
  const [row] = await db
    .update(organizations)
    .set({ name: input.name, timezone: input.timezone, updatedAt: new Date() })
    .where(eq(organizations.id, scope.organizationId))
    .returning();
  return row ?? null;
}

export async function listInspections(db: Database, scope: OrgScope) {
  return db
    .select()
    .from(inspections)
    .where(eq(inspections.organizationId, scope.organizationId))
    .orderBy(desc(inspections.updatedAt));
}

export async function getInspection(db: Database, scope: OrgScope, inspectionId: string) {
  const [row] = await db
    .select()
    .from(inspections)
    .where(
      and(eq(inspections.id, inspectionId), eq(inspections.organizationId, scope.organizationId)),
    )
    .limit(1);
  return row ?? null;
}

export async function listSites(db: Database, scope: OrgScope) {
  return db
    .select()
    .from(sites)
    .where(eq(sites.organizationId, scope.organizationId))
    .orderBy(sites.name);
}

export async function getSite(db: Database, scope: OrgScope, siteId: string) {
  const [row] = await db
    .select()
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.organizationId, scope.organizationId)))
    .limit(1);
  return row ?? null;
}

export async function listAssets(db: Database, scope: OrgScope) {
  return db.select().from(assets).where(eq(assets.organizationId, scope.organizationId));
}

export async function getAsset(db: Database, scope: OrgScope, assetId: string) {
  const [row] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.organizationId, scope.organizationId)))
    .limit(1);
  return row ?? null;
}

export async function listTemplates(db: Database, scope: OrgScope) {
  return db.select().from(templates).where(eq(templates.organizationId, scope.organizationId));
}

export async function listFindings(db: Database, scope: OrgScope) {
  return db
    .select()
    .from(findings)
    .where(eq(findings.organizationId, scope.organizationId))
    .orderBy(desc(findings.createdAt));
}

export async function getFinding(db: Database, scope: OrgScope, findingId: string) {
  const [row] = await db
    .select()
    .from(findings)
    .where(and(eq(findings.id, findingId), eq(findings.organizationId, scope.organizationId)))
    .limit(1);
  return row ?? null;
}

export async function getMedia(db: Database, scope: OrgScope, mediaId: string) {
  const [row] = await db
    .select()
    .from(media)
    .where(and(eq(media.id, mediaId), eq(media.organizationId, scope.organizationId)))
    .limit(1);
  return row ?? null;
}

export async function getReportSnapshot(db: Database, scope: OrgScope, snapshotId: string) {
  const [row] = await db
    .select()
    .from(reportSnapshots)
    .where(
      and(
        eq(reportSnapshots.id, snapshotId),
        eq(reportSnapshots.organizationId, scope.organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getReportByVerificationCode(db: Database, code: string) {
  const [row] = await db
    .select()
    .from(reportSnapshots)
    .where(eq(reportSnapshots.verificationCode, code))
    .limit(1);
  return row ?? null;
}

export async function listInvitations(db: Database, scope: OrgScope) {
  return db
    .select()
    .from(invitations)
    .where(eq(invitations.organizationId, scope.organizationId))
    .orderBy(desc(invitations.createdAt));
}

export async function createInvitation(
  db: Database,
  input: {
    organizationId: string;
    email: string;
    role: MembershipRole;
    tokenHash: string;
    expiresAt: Date;
    invitedByUserId: string;
  },
) {
  const [row] = await db.insert(invitations).values(input).returning();
  return row;
}

export async function listOrgMembers(db: Database, scope: OrgScope) {
  return db
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      role: memberships.role,
      status: memberships.status,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, scope.organizationId));
}

export async function recordAudit(
  db: Database,
  input: {
    organizationId: string | null;
    actorUserId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await db.insert(auditEvents).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function listOrgAudit(db: Database, scope: OrgScope, limit = 40) {
  return db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      metadata: auditEvents.metadata,
      createdAt: auditEvents.createdAt,
      actorName: users.displayName,
      actorEmail: users.email,
    })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorUserId))
    .where(eq(auditEvents.organizationId, scope.organizationId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
}

export async function updateMemberRole(
  db: Database,
  scope: OrgScope,
  input: { userId: string; role: MembershipRole },
) {
  const [row] = await db
    .update(memberships)
    .set({ role: input.role })
    .where(
      and(
        eq(memberships.organizationId, scope.organizationId),
        eq(memberships.userId, input.userId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function updateMemberStatus(
  db: Database,
  scope: OrgScope,
  input: { userId: string; status: MembershipStatus },
) {
  const [row] = await db
    .update(memberships)
    .set({ status: input.status })
    .where(
      and(
        eq(memberships.organizationId, scope.organizationId),
        eq(memberships.userId, input.userId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function countOwners(db: Database, scope: OrgScope) {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(memberships)
    .where(
      and(
        eq(memberships.organizationId, scope.organizationId),
        eq(memberships.role, "owner"),
        eq(memberships.status, "active"),
      ),
    );
  return row?.value ?? 0;
}
