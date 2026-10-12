import { and, eq, gte, sql } from "drizzle-orm";
import {
  limitsForPlan,
  parseFeatureFlags,
  parsePlanKey,
  parseWorkspaceBranding,
  usageMeter,
  type FeatureFlags,
  type PlanKey,
  type WorkspaceBranding,
  type WorkspaceUsage,
} from "@inspectstack/domain";
import type { Database } from "./client";
import { inspections, media, memberships, organizations, sites, templates } from "./schema";
import { getOrganization, type OrgScope } from "./repositories";

export type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  appMode: (typeof organizations.$inferSelect)["appMode"];
  branding: WorkspaceBranding;
  planKey: PlanKey;
  featureFlags: FeatureFlags;
};

export function presentOrganization(row: typeof organizations.$inferSelect): WorkspaceRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    appMode: row.appMode,
    branding: parseWorkspaceBranding(row.branding, row.name),
    planKey: parsePlanKey(row.planKey),
    featureFlags: parseFeatureFlags(row.featureFlags),
  };
}

export async function getWorkspace(db: Database, scope: OrgScope): Promise<WorkspaceRecord | null> {
  const row = await getOrganization(db, scope);
  return row ? presentOrganization(row) : null;
}

function monthStartUtc(timeZone: string, now = new Date()): Date {
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month] = local.split("-");
  return new Date(`${year}-${month}-01T00:00:00.000Z`);
}

export async function getWorkspaceUsage(
  db: Database,
  scope: OrgScope,
): Promise<{
  workspace: WorkspaceRecord;
  usage: WorkspaceUsage;
  meters: ReturnType<typeof usageMetersFor>;
} | null> {
  const workspace = await getWorkspace(db, scope);
  if (!workspace) return null;

  const start = monthStartUtc(workspace.timezone);
  const [memberRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(memberships)
    .where(
      and(eq(memberships.organizationId, scope.organizationId), eq(memberships.status, "active")),
    );
  const [siteRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(sites)
    .where(eq(sites.organizationId, scope.organizationId));
  const [templateRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(templates)
    .where(eq(templates.organizationId, scope.organizationId));
  const [jobRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(inspections)
    .where(
      and(eq(inspections.organizationId, scope.organizationId), gte(inspections.createdAt, start)),
    );
  const [storageRow] = await db
    .select({ value: sql<number>`coalesce(sum(${media.byteSize}), 0)::int` })
    .from(media)
    .where(eq(media.organizationId, scope.organizationId));

  const usage: WorkspaceUsage = {
    members: memberRow?.value ?? 0,
    inspectionsThisMonth: jobRow?.value ?? 0,
    sites: siteRow?.value ?? 0,
    templates: templateRow?.value ?? 0,
    storageBytes: storageRow?.value ?? 0,
  };
  return { workspace, usage, meters: usageMetersFor(workspace.planKey, usage) };
}

export function usageMetersFor(planKey: PlanKey, usage: WorkspaceUsage) {
  const limits = limitsForPlan(planKey);
  return {
    members: usageMeter(usage.members, limits.members),
    inspections: usageMeter(usage.inspectionsThisMonth, limits.inspectionsPerMonth),
    sites: usageMeter(usage.sites, limits.sites),
    templates: usageMeter(usage.templates, limits.templates),
    storage: usageMeter(Math.ceil(usage.storageBytes / (1024 * 1024)), limits.storageMb),
  };
}
