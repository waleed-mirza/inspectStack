export const PLAN_KEYS = ["single", "agency", "saas"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const FEATURE_FLAG_KEYS = [
  "schedules",
  "qrLaunch",
  "correctivePortal",
  "shareLinks",
] as const;
export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];
export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export type PlanLimits = {
  members: number;
  inspectionsPerMonth: number;
  sites: number;
  templates: number;
  storageMb: number;
};

export type WorkspaceUsage = {
  members: number;
  inspectionsThisMonth: number;
  sites: number;
  templates: number;
  storageBytes: number;
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  schedules: true,
  qrLaunch: true,
  correctivePortal: true,
  shareLinks: true,
};

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  single: {
    members: 8,
    inspectionsPerMonth: 200,
    sites: 40,
    templates: 12,
    storageMb: 2048,
  },
  agency: {
    members: 25,
    inspectionsPerMonth: 1000,
    sites: 200,
    templates: 40,
    storageMb: 10240,
  },
  saas: {
    members: 100,
    inspectionsPerMonth: 5000,
    sites: 1000,
    templates: 100,
    storageMb: 51200,
  },
};

export function parsePlanKey(value: unknown): PlanKey {
  if (typeof value === "string" && PLAN_KEYS.includes(value as PlanKey)) {
    return value as PlanKey;
  }
  return "single";
}

export function limitsForPlan(plan: PlanKey): PlanLimits {
  return PLAN_LIMITS[plan];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function parseFeatureFlags(input: unknown): FeatureFlags {
  const row = asRecord(input);
  const flags = { ...DEFAULT_FEATURE_FLAGS };
  for (const key of FEATURE_FLAG_KEYS) {
    if (typeof row[key] === "boolean") flags[key] = row[key];
  }
  return flags;
}

export function isFeatureEnabled(flags: FeatureFlags, key: FeatureFlagKey): boolean {
  return flags[key] !== false;
}

export function usageMeter(
  used: number,
  limit: number,
): { used: number; limit: number; remaining: number; over: boolean; ratio: number } {
  const safeUsed = Math.max(0, used);
  const safeLimit = Math.max(0, limit);
  const remaining = Math.max(0, safeLimit - safeUsed);
  return {
    used: safeUsed,
    limit: safeLimit,
    remaining,
    over: safeUsed >= safeLimit && safeLimit > 0,
    ratio: safeLimit === 0 ? 1 : Math.min(1, safeUsed / safeLimit),
  };
}

export function canAcceptMore(used: number, limit: number): boolean {
  return !usageMeter(used, limit).over;
}

export type LimitKind = "members" | "inspections" | "sites" | "templates" | "storage";

export function limitKindLabel(kind: LimitKind): string {
  if (kind === "members") return "people";
  if (kind === "inspections") return "jobs this month";
  if (kind === "sites") return "sites";
  if (kind === "templates") return "templates";
  return "storage";
}
