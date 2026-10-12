import { and, desc, eq } from "drizzle-orm";
import {
  SCHEDULE_FREQUENCIES,
  canManageSchedules,
  compareLocalDate,
  dueAtForLocalDate,
  firstDueOnOrAfter,
  formatLocalDate,
  localDateInZone,
  nextOccurrence,
  parseLocalDate,
  type MembershipRole,
  type ScheduleFrequency,
  type ScheduleRuleInput,
  type Weekday,
} from "@inspectstack/domain";
import type { Database } from "./client";
import { assets, inspections, scheduleJobs, scheduleRules, sites } from "./schema";
import { getAsset, getSite, recordAudit, type OrgScope } from "./repositories";
import { nextOrgInspectionNumber } from "./sites";
import { getTemplateVersion } from "./templates";

export type ScheduleError = "denied" | "not_found" | "invalid" | "template" | "site" | "duplicate";

export type ScheduleRuleRecord = typeof scheduleRules.$inferSelect;
export type ScheduleJobRecord = typeof scheduleJobs.$inferSelect;

function isFrequency(value: string): value is ScheduleFrequency {
  return (SCHEDULE_FREQUENCIES as readonly string[]).includes(value);
}

function asWeekday(value: number | null | undefined): Weekday | undefined {
  if (value == null) return undefined;
  if (value < 0 || value > 6) return undefined;
  return value as Weekday;
}

function ruleInput(row: {
  frequency: string;
  timeZone: string;
  localHour: number;
  localMinute: number;
  weekday: number | null;
  dayOfMonth: number | null;
  intervalDays: number | null;
  onceLocalDate: string | null;
}): ScheduleRuleInput | null {
  if (!isFrequency(row.frequency)) return null;
  const once = row.onceLocalDate ? parseLocalDate(row.onceLocalDate) : null;
  return {
    frequency: row.frequency,
    timeZone: row.timeZone,
    localHour: row.localHour,
    localMinute: row.localMinute,
    weekday: asWeekday(row.weekday),
    dayOfMonth: row.dayOfMonth ?? undefined,
    intervalDays: row.intervalDays ?? undefined,
    onceLocalDate: once ?? undefined,
  };
}

function validateRuleBody(input: {
  name: string;
  frequency: string;
  timeZone: string;
  localHour: number;
  localMinute: number;
  weekday?: number | null;
  dayOfMonth?: number | null;
  intervalDays?: number | null;
  onceLocalDate?: string | null;
}): { ok: true; frequency: ScheduleFrequency } | { ok: false } {
  if (!input.name.trim()) return { ok: false };
  if (!isFrequency(input.frequency)) return { ok: false };
  if (!input.timeZone.trim()) return { ok: false };
  if (input.localHour < 0 || input.localHour > 23) return { ok: false };
  if (input.localMinute < 0 || input.localMinute > 59) return { ok: false };
  if (input.frequency === "weekly" && asWeekday(input.weekday) == null) return { ok: false };
  if (input.frequency === "monthly" && (!input.dayOfMonth || input.dayOfMonth < 1)) {
    return { ok: false };
  }
  if (input.frequency === "every_n_days" && (!input.intervalDays || input.intervalDays < 1)) {
    return { ok: false };
  }
  if (input.frequency === "once" && !parseLocalDate(input.onceLocalDate ?? ""))
    return { ok: false };
  return { ok: true, frequency: input.frequency };
}

export async function listScheduleRules(db: Database, scope: OrgScope) {
  const rows = await db
    .select({
      rule: scheduleRules,
      siteName: sites.name,
      assetName: assets.name,
    })
    .from(scheduleRules)
    .leftJoin(sites, eq(sites.id, scheduleRules.siteId))
    .leftJoin(assets, eq(assets.id, scheduleRules.assetId))
    .where(eq(scheduleRules.organizationId, scope.organizationId))
    .orderBy(scheduleRules.name);
  return rows;
}

export async function getScheduleRule(db: Database, scope: OrgScope, ruleId: string) {
  const [row] = await db
    .select()
    .from(scheduleRules)
    .where(
      and(eq(scheduleRules.id, ruleId), eq(scheduleRules.organizationId, scope.organizationId)),
    )
    .limit(1);
  return row ?? null;
}

export async function listJobsForRule(db: Database, scope: OrgScope, ruleId: string) {
  return db
    .select({
      job: scheduleJobs,
      inspectionNumber: inspections.number,
    })
    .from(scheduleJobs)
    .leftJoin(inspections, eq(inspections.id, scheduleJobs.inspectionId))
    .where(
      and(
        eq(scheduleJobs.organizationId, scope.organizationId),
        eq(scheduleJobs.scheduleRuleId, ruleId),
      ),
    )
    .orderBy(desc(scheduleJobs.createdAt));
}

export async function createScheduleRule(
  db: Database,
  input: {
    organizationId: string;
    role: MembershipRole;
    actorUserId: string;
    name: string;
    frequency: string;
    timeZone: string;
    localHour: number;
    localMinute: number;
    weekday?: number | null;
    dayOfMonth?: number | null;
    intervalDays?: number | null;
    onceLocalDate?: string | null;
    siteId?: string | null;
    assetId?: string | null;
    templateVersionId: string;
    assignedToUserId?: string | null;
    now?: Date;
  },
): Promise<{ ok: true; rule: ScheduleRuleRecord } | { ok: false; error: ScheduleError }> {
  if (!canManageSchedules(input.role)) return { ok: false, error: "denied" };
  const parsed = validateRuleBody(input);
  if (!parsed.ok) return { ok: false, error: "invalid" };
  const scope = { organizationId: input.organizationId };
  const version = await getTemplateVersion(db, scope, input.templateVersionId);
  if (!version || version.status !== "published") return { ok: false, error: "template" };
  if (input.siteId) {
    const site = await getSite(db, scope, input.siteId);
    if (!site) return { ok: false, error: "site" };
  }
  if (input.assetId) {
    const asset = await getAsset(db, scope, input.assetId);
    if (!asset) return { ok: false, error: "site" };
  }
  const body: ScheduleRuleInput = {
    frequency: parsed.frequency,
    timeZone: input.timeZone,
    localHour: input.localHour,
    localMinute: input.localMinute,
    weekday: asWeekday(input.weekday),
    dayOfMonth: input.dayOfMonth ?? undefined,
    intervalDays: input.intervalDays ?? undefined,
    onceLocalDate: input.onceLocalDate
      ? (parseLocalDate(input.onceLocalDate) ?? undefined)
      : undefined,
  };
  const today = localDateInZone(input.now ?? new Date(), input.timeZone);
  const first = firstDueOnOrAfter(body, today);
  const [row] = await db
    .insert(scheduleRules)
    .values({
      organizationId: input.organizationId,
      name: input.name.trim(),
      frequency: parsed.frequency,
      timeZone: input.timeZone,
      localHour: input.localHour,
      localMinute: input.localMinute,
      weekday: body.weekday ?? null,
      dayOfMonth: body.dayOfMonth ?? null,
      intervalDays: body.intervalDays ?? null,
      onceLocalDate: input.onceLocalDate ?? null,
      siteId: input.siteId || null,
      assetId: input.assetId || null,
      templateVersionId: version.id,
      assignedToUserId: input.assignedToUserId || null,
      nextRunLocalDate: first ? formatLocalDate(first) : null,
    })
    .returning();
  if (!row) return { ok: false, error: "invalid" };
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "schedule.created",
    entityType: "schedule_rule",
    entityId: row.id,
    metadata: { frequency: row.frequency, nextRunLocalDate: row.nextRunLocalDate },
  });
  return { ok: true, rule: row };
}

export async function pauseScheduleRule(
  db: Database,
  input: {
    organizationId: string;
    role: MembershipRole;
    actorUserId: string;
    ruleId: string;
    pause: boolean;
  },
): Promise<{ ok: true; rule: ScheduleRuleRecord } | { ok: false; error: ScheduleError }> {
  if (!canManageSchedules(input.role)) return { ok: false, error: "denied" };
  const rule = await getScheduleRule(db, { organizationId: input.organizationId }, input.ruleId);
  if (!rule) return { ok: false, error: "not_found" };
  const [row] = await db
    .update(scheduleRules)
    .set({
      pausedAt: input.pause ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(scheduleRules.id, rule.id), eq(scheduleRules.organizationId, input.organizationId)),
    )
    .returning();
  if (!row) return { ok: false, error: "not_found" };
  await recordAudit(db, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.pause ? "schedule.paused" : "schedule.resumed",
    entityType: "schedule_rule",
    entityId: row.id,
  });
  return { ok: true, rule: row };
}

export type RunDueJobsResult = {
  considered: number;
  created: number;
  duplicates: number;
  failed: number;
  inspectionIds: string[];
};

async function fireRule(
  db: Database,
  rule: ScheduleRuleRecord,
  localDateStr: string,
  actorUserId: string | null,
): Promise<"created" | "duplicate" | "failed"> {
  const parsed = ruleInput(rule);
  const localDate = parseLocalDate(localDateStr);
  if (!parsed || !localDate) return "failed";

  const [job] = await db
    .insert(scheduleJobs)
    .values({
      organizationId: rule.organizationId,
      scheduleRuleId: rule.id,
      localDate: localDateStr,
      status: "pending",
    })
    .onConflictDoNothing({
      target: [scheduleJobs.scheduleRuleId, scheduleJobs.localDate],
    })
    .returning();

  const next = nextOccurrence(parsed, localDate);
  const nextStr = next ? formatLocalDate(next) : null;
  const pauseOnce = parsed.frequency === "once" ? new Date() : rule.pausedAt;

  if (!job) {
    await db
      .update(scheduleRules)
      .set({
        nextRunLocalDate: nextStr,
        pausedAt: pauseOnce,
        updatedAt: new Date(),
      })
      .where(
        and(eq(scheduleRules.id, rule.id), eq(scheduleRules.organizationId, rule.organizationId)),
      );
    return "duplicate";
  }

  try {
    const number = await nextOrgInspectionNumber(db, { organizationId: rule.organizationId }, "IS");
    const dueAt = dueAtForLocalDate(parsed, localDate);
    const [inspection] = await db
      .insert(inspections)
      .values({
        organizationId: rule.organizationId,
        templateVersionId: rule.templateVersionId,
        siteId: rule.siteId,
        assetId: rule.assetId,
        assignedToUserId: rule.assignedToUserId,
        status: "assigned",
        number,
        dueAt,
      })
      .returning();
    if (!inspection) throw new Error("inspection insert failed");
    await db
      .update(scheduleJobs)
      .set({
        inspectionId: inspection.id,
        status: "created",
      })
      .where(
        and(eq(scheduleJobs.id, job.id), eq(scheduleJobs.organizationId, rule.organizationId)),
      );
    await db
      .update(scheduleRules)
      .set({
        nextRunLocalDate: nextStr,
        pausedAt: pauseOnce,
        updatedAt: new Date(),
      })
      .where(
        and(eq(scheduleRules.id, rule.id), eq(scheduleRules.organizationId, rule.organizationId)),
      );
    await recordAudit(db, {
      organizationId: rule.organizationId,
      actorUserId,
      action: "schedule.job_created",
      entityType: "schedule_job",
      entityId: job.id,
      metadata: { localDate: localDateStr, inspectionId: inspection.id, number: inspection.number },
    });
    return "created";
  } catch (error) {
    await db
      .update(scheduleJobs)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "job failed",
      })
      .where(
        and(eq(scheduleJobs.id, job.id), eq(scheduleJobs.organizationId, rule.organizationId)),
      );
    return "failed";
  }
}

export async function runDueJobs(
  db: Database,
  input: {
    organizationId?: string;
    now?: Date;
    actorUserId?: string | null;
  } = {},
): Promise<RunDueJobsResult> {
  const now = input.now ?? new Date();
  const candidates = input.organizationId
    ? await db
        .select()
        .from(scheduleRules)
        .where(eq(scheduleRules.organizationId, input.organizationId))
    : await db.select().from(scheduleRules);

  const result: RunDueJobsResult = {
    considered: 0,
    created: 0,
    duplicates: 0,
    failed: 0,
    inspectionIds: [],
  };

  for (const rule of candidates) {
    if (rule.pausedAt) continue;
    if (!rule.nextRunLocalDate) continue;
    const parsed = ruleInput(rule);
    if (!parsed) continue;
    const today = localDateInZone(now, rule.timeZone);
    let cursor = parseLocalDate(rule.nextRunLocalDate);
    if (!cursor) continue;
    result.considered += 1;
    for (let step = 0; step < 14 && cursor; step += 1) {
      if (compareLocalDate(cursor, today) > 0) break;
      const dateStr = formatLocalDate(cursor);
      const outcome = await fireRule(db, rule, dateStr, input.actorUserId ?? null);
      if (outcome === "created") {
        result.created += 1;
        const [job] = await db
          .select({ inspectionId: scheduleJobs.inspectionId })
          .from(scheduleJobs)
          .where(
            and(
              eq(scheduleJobs.scheduleRuleId, rule.id),
              eq(scheduleJobs.localDate, dateStr),
              eq(scheduleJobs.organizationId, rule.organizationId),
            ),
          )
          .limit(1);
        if (job?.inspectionId) result.inspectionIds.push(job.inspectionId);
      } else if (outcome === "duplicate") {
        result.duplicates += 1;
      } else {
        result.failed += 1;
        break;
      }
      const fresh = await db
        .select()
        .from(scheduleRules)
        .where(
          and(eq(scheduleRules.id, rule.id), eq(scheduleRules.organizationId, rule.organizationId)),
        )
        .limit(1);
      const updated = fresh[0];
      if (!updated?.nextRunLocalDate || updated.pausedAt) break;
      cursor = parseLocalDate(updated.nextRunLocalDate);
    }
  }

  return result;
}
