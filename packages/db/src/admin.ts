import { and, desc, eq, isNull, sql } from "drizzle-orm";
import {
  AUTH_RATE_LIMIT,
  PUBLIC_LINK_RATE_LIMIT,
  canImpersonate,
  normalizeImpersonationReason,
  parseFeatureFlags,
  rateLimitBucketKey,
  rateLimitExceeded,
  rateLimitWindowStart,
  sha256Hex,
  type FeatureFlags,
  type PlanKey,
  type RateLimitKind,
} from "@inspectstack/domain";
import type { Database } from "./client";
import {
  impersonationSessions,
  memberships,
  organizations,
  rateLimitBuckets,
  users,
} from "./schema";
import { recordAudit } from "./repositories";
import { getWorkspaceUsage, presentOrganization } from "./workspace";

export async function listTenants(db: Database, isPlatformAdmin: boolean) {
  if (!canImpersonate(isPlatformAdmin)) return [];
  const rows = await db.select().from(organizations).orderBy(organizations.name);
  return rows.map(presentOrganization);
}

export async function getTenantDesk(
  db: Database,
  isPlatformAdmin: boolean,
  organizationId: string,
) {
  if (!canImpersonate(isPlatformAdmin)) return null;
  const usage = await getWorkspaceUsage(db, { organizationId });
  if (!usage) return null;
  const members = await db
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      role: memberships.role,
      status: memberships.status,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, organizationId));
  const impersonations = await db
    .select({
      id: impersonationSessions.id,
      reason: impersonationSessions.reason,
      startedAt: impersonationSessions.startedAt,
      endedAt: impersonationSessions.endedAt,
      actorEmail: users.email,
    })
    .from(impersonationSessions)
    .leftJoin(users, eq(users.id, impersonationSessions.actorUserId))
    .where(eq(impersonationSessions.targetOrganizationId, organizationId))
    .orderBy(desc(impersonationSessions.startedAt))
    .limit(20);
  return { ...usage, members, impersonations };
}

export async function setTenantPlan(
  db: Database,
  input: {
    actorUserId: string;
    isPlatformAdmin: boolean;
    organizationId: string;
    planKey: PlanKey;
  },
) {
  if (!canImpersonate(input.isPlatformAdmin))
    return { ok: false as const, error: "denied" as const };
  const [row] = await db
    .update(organizations)
    .set({ planKey: input.planKey, updatedAt: new Date() })
    .where(eq(organizations.id, input.organizationId))
    .returning();
  if (!row) return { ok: false as const, error: "not_found" as const };
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "admin.plan",
    entityType: "organization",
    entityId: input.organizationId,
    metadata: { planKey: input.planKey },
  });
  return { ok: true as const, workspace: presentOrganization(row) };
}

export async function setTenantFlags(
  db: Database,
  input: {
    actorUserId: string;
    isPlatformAdmin: boolean;
    organizationId: string;
    featureFlags: FeatureFlags;
  },
) {
  if (!canImpersonate(input.isPlatformAdmin))
    return { ok: false as const, error: "denied" as const };
  const flags = parseFeatureFlags(input.featureFlags);
  const [row] = await db
    .update(organizations)
    .set({ featureFlags: flags, updatedAt: new Date() })
    .where(eq(organizations.id, input.organizationId))
    .returning();
  if (!row) return { ok: false as const, error: "not_found" as const };
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "admin.flags",
    entityType: "organization",
    entityId: input.organizationId,
    metadata: { featureFlags: flags },
  });
  return { ok: true as const, workspace: presentOrganization(row) };
}

export async function startImpersonation(
  db: Database,
  input: {
    actorUserId: string;
    isPlatformAdmin: boolean;
    organizationId: string;
    targetUserId: string | null;
    reason: string;
  },
) {
  if (!canImpersonate(input.isPlatformAdmin))
    return { ok: false as const, error: "denied" as const };
  const reason = normalizeImpersonationReason(input.reason);
  if (!reason) return { ok: false as const, error: "reason" as const };

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, input.organizationId))
    .limit(1);
  if (!org) return { ok: false as const, error: "not_found" as const };

  let targetUserId = input.targetUserId;
  if (targetUserId) {
    const [member] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, org.id),
          eq(memberships.userId, targetUserId),
          eq(memberships.status, "active"),
        ),
      )
      .limit(1);
    if (!member) return { ok: false as const, error: "member" as const };
  } else {
    const [owner] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, org.id),
          eq(memberships.role, "owner"),
          eq(memberships.status, "active"),
        ),
      )
      .limit(1);
    targetUserId = owner?.userId ?? null;
  }

  const [session] = await db
    .insert(impersonationSessions)
    .values({
      actorUserId: input.actorUserId,
      targetOrganizationId: org.id,
      targetUserId,
      reason,
    })
    .returning();
  if (!session) throw new Error("Impersonation insert failed");

  await recordAudit(db, {
    organizationId: org.id,
    actorUserId: input.actorUserId,
    action: "admin.impersonation.start",
    entityType: "organization",
    entityId: org.id,
    metadata: { reason, targetUserId, sessionId: session.id },
  });

  return { ok: true as const, session, workspace: presentOrganization(org) };
}

export async function getOpenImpersonation(db: Database, actorUserId: string, sessionId: string) {
  const [row] = await db
    .select()
    .from(impersonationSessions)
    .where(
      and(
        eq(impersonationSessions.id, sessionId),
        eq(impersonationSessions.actorUserId, actorUserId),
        isNull(impersonationSessions.endedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function impersonationView(
  db: Database,
  session: typeof impersonationSessions.$inferSelect,
) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.targetOrganizationId))
    .limit(1);
  if (!org) return null;
  let member: {
    membershipId: string;
    role: (typeof memberships.$inferSelect)["role"];
    status: (typeof memberships.$inferSelect)["status"];
    email: string;
    displayName: string;
    userId: string;
  } | null = null;
  if (session.targetUserId) {
    const [hit] = await db
      .select({
        membershipId: memberships.id,
        role: memberships.role,
        status: memberships.status,
        email: users.email,
        displayName: users.displayName,
        userId: users.id,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(
        and(eq(memberships.organizationId, org.id), eq(memberships.userId, session.targetUserId)),
      )
      .limit(1);
    member = hit ?? null;
  }
  return { org: presentOrganization(org), member, session };
}

export async function endImpersonation(
  db: Database,
  input: { actorUserId: string; sessionId: string },
) {
  const [row] = await db
    .update(impersonationSessions)
    .set({ endedAt: new Date() })
    .where(
      and(
        eq(impersonationSessions.id, input.sessionId),
        eq(impersonationSessions.actorUserId, input.actorUserId),
        isNull(impersonationSessions.endedAt),
      ),
    )
    .returning();
  if (!row) return { ok: false as const, error: "not_found" as const };
  await recordAudit(db, {
    organizationId: row.targetOrganizationId,
    actorUserId: input.actorUserId,
    action: "admin.impersonation.end",
    entityType: "organization",
    entityId: row.targetOrganizationId,
    metadata: { sessionId: row.id, reason: row.reason },
  });
  return { ok: true as const, session: row };
}

export async function consumeRateLimit(
  db: Database,
  input: { kind: RateLimitKind; material: string; now?: Date },
): Promise<{ ok: true } | { ok: false; error: "rate" }> {
  const spec = input.kind === "auth" ? AUTH_RATE_LIMIT : PUBLIC_LINK_RATE_LIMIT;
  const now = input.now ?? new Date();
  const windowStart = rateLimitWindowStart(now, spec.windowMs);
  const materialHash = await sha256Hex(new TextEncoder().encode(input.material));
  const bucketKey = rateLimitBucketKey(input.kind, materialHash);

  const [row] = await db
    .insert(rateLimitBuckets)
    .values({ bucketKey, windowStart, hitCount: 1 })
    .onConflictDoUpdate({
      target: [rateLimitBuckets.bucketKey, rateLimitBuckets.windowStart],
      set: { hitCount: sql`${rateLimitBuckets.hitCount} + 1` },
    })
    .returning();

  const hits = row?.hitCount ?? 1;
  if (rateLimitExceeded(hits, spec.limit)) return { ok: false, error: "rate" };
  return { ok: true };
}
