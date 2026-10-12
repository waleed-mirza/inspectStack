"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canManageSchedules, type MembershipRole } from "@inspectstack/domain";
import { createScheduleRule, pauseScheduleRule, runDueJobs } from "@inspectstack/db";
import { getDb } from "../db";
import { requireSession } from "../session";

async function requireScheduleManager() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canManageSchedules(session.session.active.role as MembershipRole)) {
    redirect("/app/denied");
  }
  return session.session;
}

function intOrNull(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function uuidOrEmpty(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return z.string().uuid().safeParse(raw).success ? raw : null;
}

export async function createScheduleRuleAction(formData: FormData) {
  const session = await requireScheduleManager();
  const result = await createScheduleRule(getDb(), {
    organizationId: session.active.organizationId,
    role: session.active.role as MembershipRole,
    actorUserId: session.user.id,
    name: String(formData.get("name") ?? ""),
    frequency: String(formData.get("frequency") ?? ""),
    timeZone: session.active.timezone,
    localHour: intOrNull(formData.get("localHour")) ?? 17,
    localMinute: intOrNull(formData.get("localMinute")) ?? 0,
    weekday: intOrNull(formData.get("weekday")),
    dayOfMonth: intOrNull(formData.get("dayOfMonth")),
    intervalDays: intOrNull(formData.get("intervalDays")),
    onceLocalDate: String(formData.get("onceLocalDate") ?? "") || null,
    siteId: uuidOrEmpty(formData.get("siteId")),
    assetId: uuidOrEmpty(formData.get("assetId")),
    templateVersionId: String(formData.get("templateVersionId") ?? ""),
    assignedToUserId: uuidOrEmpty(formData.get("assignedToUserId")),
  });
  revalidatePath("/app/schedules");
  if (!result.ok) redirect(`/app/schedules?error=${result.error}`);
  redirect("/app/schedules?saved=1");
}

export async function pauseScheduleRuleAction(formData: FormData) {
  const session = await requireScheduleManager();
  const ruleId = String(formData.get("ruleId") ?? "");
  if (!z.string().uuid().safeParse(ruleId).success) redirect("/app/schedules?error=not_found");
  const pause = String(formData.get("pause") ?? "1") !== "0";
  const result = await pauseScheduleRule(getDb(), {
    organizationId: session.active.organizationId,
    role: session.active.role as MembershipRole,
    actorUserId: session.user.id,
    ruleId,
    pause,
  });
  revalidatePath("/app/schedules");
  if (!result.ok) redirect(`/app/schedules?error=${result.error}`);
  redirect(pause ? "/app/schedules?paused=1" : "/app/schedules?resumed=1");
}

export async function runDueJobsAction() {
  const session = await requireScheduleManager();
  const result = await runDueJobs(getDb(), {
    organizationId: session.active.organizationId,
    actorUserId: session.user.id,
  });
  revalidatePath("/app/schedules");
  revalidatePath("/app/inspections");
  redirect(
    `/app/schedules?ran=1&made=${result.created}&duplicates=${result.duplicates}&failed=${result.failed}`,
  );
}
