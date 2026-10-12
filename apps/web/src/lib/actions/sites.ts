"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  canAssignFromSite,
  canManageSites,
  localDateTimeToUtc,
  parseLocalDate,
  parseTagsField,
  type MembershipRole,
} from "@inspectstack/domain";
import {
  archiveAsset,
  archiveSite,
  assignInspectionToSite,
  createAsset,
  createSite,
  updateAsset,
  updateSite,
} from "@inspectstack/db";
import { getDb } from "../db";
import { requireSession } from "../session";

async function requireSitesSession() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  return session.session;
}

function uuidOrEmpty(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return z.string().uuid().safeParse(raw).success ? raw : null;
}

export async function createSiteAction(formData: FormData) {
  const session = await requireSitesSession();
  if (!canManageSites(session.active.role as MembershipRole)) redirect("/app/denied");
  const result = await createSite(getDb(), {
    organizationId: session.active.organizationId,
    role: session.active.role as MembershipRole,
    actorUserId: session.user.id,
    name: String(formData.get("name") ?? ""),
    addressLine: String(formData.get("addressLine") ?? "") || null,
    parentId: uuidOrEmpty(formData.get("parentId")),
    tags: parseTagsField(String(formData.get("tags") ?? "")),
    externalId: String(formData.get("externalId") ?? "") || null,
  });
  revalidatePath("/app/sites");
  if (!result.ok) redirect(`/app/sites?error=${result.error}`);
  redirect(`/app/sites/${result.site.id}`);
}

export async function updateSiteAction(formData: FormData) {
  const session = await requireSitesSession();
  if (!canManageSites(session.active.role as MembershipRole)) redirect("/app/denied");
  const siteId = String(formData.get("siteId") ?? "");
  if (!z.string().uuid().safeParse(siteId).success) redirect("/app/sites?error=not_found");
  const result = await updateSite(getDb(), {
    organizationId: session.active.organizationId,
    role: session.active.role as MembershipRole,
    actorUserId: session.user.id,
    siteId,
    name: String(formData.get("name") ?? ""),
    addressLine: String(formData.get("addressLine") ?? "") || null,
    parentId: uuidOrEmpty(formData.get("parentId")),
    tags: parseTagsField(String(formData.get("tags") ?? "")),
    externalId: String(formData.get("externalId") ?? "") || null,
  });
  revalidatePath("/app/sites");
  revalidatePath(`/app/sites/${siteId}`);
  if (!result.ok) redirect(`/app/sites/${siteId}?error=${result.error}`);
  redirect(`/app/sites/${siteId}?saved=1`);
}

export async function archiveSiteAction(formData: FormData) {
  const session = await requireSitesSession();
  if (!canManageSites(session.active.role as MembershipRole)) redirect("/app/denied");
  const siteId = String(formData.get("siteId") ?? "");
  if (!z.string().uuid().safeParse(siteId).success) redirect("/app/sites?error=not_found");
  const result = await archiveSite(getDb(), {
    organizationId: session.active.organizationId,
    role: session.active.role as MembershipRole,
    actorUserId: session.user.id,
    siteId,
  });
  revalidatePath("/app/sites");
  if (!result.ok) redirect(`/app/sites/${siteId}?error=${result.error}`);
  redirect("/app/sites?archived=1");
}

export async function createAssetAction(formData: FormData) {
  const session = await requireSitesSession();
  if (!canManageSites(session.active.role as MembershipRole)) redirect("/app/denied");
  const siteId = String(formData.get("siteId") ?? "");
  if (!z.string().uuid().safeParse(siteId).success) redirect("/app/sites?error=not_found");
  const result = await createAsset(getDb(), {
    organizationId: session.active.organizationId,
    role: session.active.role as MembershipRole,
    actorUserId: session.user.id,
    siteId,
    name: String(formData.get("name") ?? ""),
    tags: parseTagsField(String(formData.get("tags") ?? "")),
    externalId: String(formData.get("externalId") ?? "") || null,
  });
  revalidatePath("/app/sites");
  revalidatePath(`/app/sites/${siteId}`);
  if (!result.ok) redirect(`/app/sites/${siteId}?error=${result.error}`);
  redirect(`/app/sites/assets/${result.asset.id}`);
}

export async function updateAssetAction(formData: FormData) {
  const session = await requireSitesSession();
  if (!canManageSites(session.active.role as MembershipRole)) redirect("/app/denied");
  const assetId = String(formData.get("assetId") ?? "");
  if (!z.string().uuid().safeParse(assetId).success) redirect("/app/sites?error=not_found");
  const result = await updateAsset(getDb(), {
    organizationId: session.active.organizationId,
    role: session.active.role as MembershipRole,
    actorUserId: session.user.id,
    assetId,
    name: String(formData.get("name") ?? ""),
    tags: parseTagsField(String(formData.get("tags") ?? "")),
    externalId: String(formData.get("externalId") ?? "") || null,
    siteId: uuidOrEmpty(formData.get("siteId")) ?? undefined,
  });
  revalidatePath("/app/sites");
  revalidatePath(`/app/sites/assets/${assetId}`);
  if (!result.ok) redirect(`/app/sites/assets/${assetId}?error=${result.error}`);
  redirect(`/app/sites/assets/${assetId}?saved=1`);
}

export async function archiveAssetAction(formData: FormData) {
  const session = await requireSitesSession();
  if (!canManageSites(session.active.role as MembershipRole)) redirect("/app/denied");
  const assetId = String(formData.get("assetId") ?? "");
  const siteId = String(formData.get("siteId") ?? "");
  if (!z.string().uuid().safeParse(assetId).success) redirect("/app/sites?error=not_found");
  const result = await archiveAsset(getDb(), {
    organizationId: session.active.organizationId,
    role: session.active.role as MembershipRole,
    actorUserId: session.user.id,
    assetId,
  });
  revalidatePath("/app/sites");
  if (!result.ok) redirect(`/app/sites/assets/${assetId}?error=${result.error}`);
  if (z.string().uuid().safeParse(siteId).success) {
    redirect(`/app/sites/${siteId}?archived=1`);
  }
  redirect("/app/sites?archived=1");
}

export async function assignInspectionAction(formData: FormData) {
  const session = await requireSitesSession();
  if (!canAssignFromSite(session.active.role as MembershipRole)) redirect("/app/denied");
  const siteId = String(formData.get("siteId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "");
  const failPath = returnTo.startsWith("/app/sites")
    ? returnTo.split("?")[0]!
    : `/app/sites/${siteId}`;
  if (!z.string().uuid().safeParse(siteId).success) redirect("/app/sites?error=not_found");
  const dueRaw = String(formData.get("dueAt") ?? "").trim();
  const local = dueRaw ? parseLocalDate(dueRaw) : null;
  const dueAt = local ? localDateTimeToUtc(local, 17, 0, session.active.timezone) : null;
  const result = await assignInspectionToSite(getDb(), {
    organizationId: session.active.organizationId,
    role: session.active.role as MembershipRole,
    actorUserId: session.user.id,
    siteId,
    assetId: uuidOrEmpty(formData.get("assetId")),
    templateVersionId: String(formData.get("templateVersionId") ?? ""),
    assignedToUserId: uuidOrEmpty(formData.get("assignedToUserId")),
    dueAt,
  });
  revalidatePath("/app/sites");
  revalidatePath("/app/inspections");
  if (!result.ok) redirect(`${failPath}?error=${result.error}`);
  redirect(`/app/inspections/${result.inspection.id}`);
}
