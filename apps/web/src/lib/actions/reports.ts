"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canReview, isFeatureEnabled, parseFeatureFlags } from "@inspectstack/domain";
import { createShareLink, getWorkspace, revokeShareLink, revokeSnapshot } from "@inspectstack/db";
import { getDb } from "../db";
import { requireSession } from "../session";

async function requireReviewer() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canReview(session.session.active.role)) redirect("/app/denied");
  return session.session;
}

export async function revokeSnapshotAction(formData: FormData) {
  const session = await requireReviewer();
  const snapshotId = String(formData.get("snapshotId") ?? "");
  if (!z.string().uuid().safeParse(snapshotId).success) redirect("/app/reports");
  const result = await revokeSnapshot(getDb(), {
    organizationId: session.active.organizationId,
    snapshotId,
    actorUserId: session.user.id,
  });
  revalidatePath("/app/reports");
  revalidatePath(`/app/reports/${snapshotId}`);
  if (!result.ok) redirect(`/app/reports/${snapshotId}?error=not_found`);
  redirect(`/app/reports/${snapshotId}?revoked=1`);
}

export async function createShareLinkAction(formData: FormData) {
  const session = await requireReviewer();
  const workspace = await getWorkspace(getDb(), {
    organizationId: session.active.organizationId,
  });
  if (workspace && !isFeatureEnabled(parseFeatureFlags(workspace.featureFlags), "shareLinks")) {
    redirect("/app/denied");
  }
  const snapshotId = String(formData.get("snapshotId") ?? "");
  const days = Number(formData.get("days") ?? 14);
  if (!z.string().uuid().safeParse(snapshotId).success) redirect("/app/reports");
  const expiresAt =
    Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
  const result = await createShareLink(getDb(), {
    organizationId: session.active.organizationId,
    snapshotId,
    actorUserId: session.user.id,
    expiresAt,
  });
  revalidatePath(`/app/reports/${snapshotId}`);
  if (!result.ok) redirect(`/app/reports/${snapshotId}?error=${result.error}`);
  redirect(`/app/reports/${snapshotId}?share=${encodeURIComponent(result.token)}`);
}

export async function revokeShareLinkAction(formData: FormData) {
  const session = await requireReviewer();
  const snapshotId = String(formData.get("snapshotId") ?? "");
  const shareLinkId = String(formData.get("shareLinkId") ?? "");
  if (!z.string().uuid().safeParse(shareLinkId).success) {
    redirect(`/app/reports/${snapshotId}`);
  }
  await revokeShareLink(getDb(), {
    organizationId: session.active.organizationId,
    shareLinkId,
    actorUserId: session.user.id,
  });
  revalidatePath(`/app/reports/${snapshotId}`);
  redirect(`/app/reports/${snapshotId}`);
}
