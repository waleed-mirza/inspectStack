"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  DEFAULT_UPLOAD_POLICY,
  canOpenActionsPortal,
  parseFindingStatus,
  type MembershipRole,
} from "@inspectstack/domain";
import {
  addFindingComment,
  attachFindingEvidence,
  createStorageAdapter,
  transitionPortalFinding,
} from "@inspectstack/db";
import { getDb } from "../db";
import { requireSession } from "../session";

async function requirePortal() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canOpenActionsPortal(session.session.active.role as MembershipRole)) {
    redirect("/app/denied");
  }
  return session.session;
}

function findingPath(findingId: string, query?: string) {
  return query ? `/app/actions/${findingId}?${query}` : `/app/actions/${findingId}`;
}

export async function addFindingCommentAction(formData: FormData) {
  const session = await requirePortal();
  const findingId = String(formData.get("findingId") ?? "");
  if (!z.string().uuid().safeParse(findingId).success) redirect("/app/actions?error=not_found");
  const result = await addFindingComment(getDb(), {
    organizationId: session.active.organizationId,
    role: session.active.role as MembershipRole,
    actorUserId: session.user.id,
    findingId,
    body: String(formData.get("body") ?? ""),
  });
  revalidatePath("/app/actions");
  revalidatePath(`/app/actions/${findingId}`);
  if (!result.ok) redirect(findingPath(findingId, `error=${result.error}`));
  redirect(findingPath(findingId, "commented=1"));
}

export async function transitionFindingAction(formData: FormData) {
  const session = await requirePortal();
  const findingId = String(formData.get("findingId") ?? "");
  if (!z.string().uuid().safeParse(findingId).success) redirect("/app/actions?error=not_found");
  const result = await transitionPortalFinding(getDb(), {
    organizationId: session.active.organizationId,
    role: session.active.role as MembershipRole,
    actorUserId: session.user.id,
    findingId,
    to: parseFindingStatus(String(formData.get("to") ?? "")),
  });
  revalidatePath("/app/actions");
  revalidatePath(`/app/actions/${findingId}`);
  if (!result.ok) redirect(findingPath(findingId, `error=${result.error}`));
  redirect(findingPath(findingId, `status=${result.status}`));
}

export async function attachFindingEvidenceAction(formData: FormData) {
  const session = await requirePortal();
  const findingId = String(formData.get("findingId") ?? "");
  if (!z.string().uuid().safeParse(findingId).success) redirect("/app/actions?error=not_found");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    redirect(findingPath(findingId, "error=invalid"));
  }
  if (file.size > DEFAULT_UPLOAD_POLICY.maxBytes) {
    redirect(findingPath(findingId, "error=invalid"));
  }
  const contentType = file.type || "application/octet-stream";
  const allowed = DEFAULT_UPLOAD_POLICY.allowedContentTypes as readonly string[];
  if (!allowed.includes(contentType) && contentType !== "image/png") {
    redirect(findingPath(findingId, "error=invalid"));
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await attachFindingEvidence(getDb(), createStorageAdapter(), {
    organizationId: session.active.organizationId,
    role: session.active.role as MembershipRole,
    actorUserId: session.user.id,
    findingId,
    bytes,
    contentType,
    caption: String(formData.get("caption") ?? "") || null,
  });
  revalidatePath("/app/actions");
  revalidatePath(`/app/actions/${findingId}`);
  if (!result.ok) redirect(findingPath(findingId, `error=${result.error}`));
  redirect(findingPath(findingId, "evidence=1"));
}
