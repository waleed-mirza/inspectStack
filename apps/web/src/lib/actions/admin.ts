"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  IMPERSONATION_COOKIE,
  PLAN_KEYS,
  canAccessPlatform,
  parseFeatureFlags,
  parsePlanKey,
} from "@inspectstack/domain";
import {
  endImpersonation,
  setTenantFlags,
  setTenantPlan,
  startImpersonation,
} from "@inspectstack/db";
import { requireSession } from "../session";
import { getDb } from "../db";
import { ORG_COOKIE } from "../session";

async function requireOperator() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canAccessPlatform(session.session.user.isPlatformAdmin)) redirect("/app/denied");
  return session.session;
}

export async function impersonateTenantAction(formData: FormData) {
  const session = await requireOperator();
  const organizationId = String(formData.get("organizationId") ?? "");
  const targetUserIdRaw = String(formData.get("targetUserId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "");
  if (!z.string().uuid().safeParse(organizationId).success) {
    redirect("/app/admin?error=invalid");
  }
  const targetUserId = z.string().uuid().safeParse(targetUserIdRaw).success
    ? targetUserIdRaw
    : null;
  const result = await startImpersonation(getDb(), {
    actorUserId: session.user.id,
    isPlatformAdmin: session.user.isPlatformAdmin,
    organizationId,
    targetUserId,
    reason,
  });
  if (!result.ok) {
    redirect(`/app/admin/${organizationId}?error=${result.error}`);
  }
  const jar = await cookies();
  jar.set(IMPERSONATION_COOKIE, result.session.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  jar.set(ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
  redirect("/app");
}

export async function stopImpersonationAction() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  const jar = await cookies();
  const sessionId = jar.get(IMPERSONATION_COOKIE)?.value;
  if (sessionId) {
    await endImpersonation(getDb(), {
      actorUserId: session.session.user.id,
      sessionId,
    });
  }
  jar.delete(IMPERSONATION_COOKIE);
  revalidatePath("/", "layout");
  redirect("/app/admin");
}

export async function setTenantPlanAction(formData: FormData) {
  const session = await requireOperator();
  const organizationId = String(formData.get("organizationId") ?? "");
  const planKey = parsePlanKey(formData.get("planKey"));
  if (!z.string().uuid().safeParse(organizationId).success) redirect("/app/admin");
  if (!PLAN_KEYS.includes(planKey)) redirect(`/app/admin/${organizationId}?error=plan`);
  const result = await setTenantPlan(getDb(), {
    actorUserId: session.user.id,
    isPlatformAdmin: session.user.isPlatformAdmin,
    organizationId,
    planKey,
  });
  if (!result.ok) redirect(`/app/admin/${organizationId}?error=${result.error}`);
  revalidatePath("/app/admin");
  revalidatePath(`/app/admin/${organizationId}`);
  redirect(`/app/admin/${organizationId}`);
}

export async function setTenantFlagsAction(formData: FormData) {
  const session = await requireOperator();
  const organizationId = String(formData.get("organizationId") ?? "");
  if (!z.string().uuid().safeParse(organizationId).success) redirect("/app/admin");
  const flags = { ...DEFAULT_FEATURE_FLAGS };
  for (const key of FEATURE_FLAG_KEYS) {
    flags[key] = formData.get(key) === "on";
  }
  const result = await setTenantFlags(getDb(), {
    actorUserId: session.user.id,
    isPlatformAdmin: session.user.isPlatformAdmin,
    organizationId,
    featureFlags: parseFeatureFlags(flags),
  });
  if (!result.ok) redirect(`/app/admin/${organizationId}?error=${result.error}`);
  revalidatePath(`/app/admin/${organizationId}`);
  redirect(`/app/admin/${organizationId}`);
}
