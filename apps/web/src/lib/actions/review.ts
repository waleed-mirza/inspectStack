"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canOpenReviewDesk, DEFAULT_BRANDING, type MembershipRole } from "@inspectstack/domain";
import {
  approveInspection,
  attachReportPdf,
  createFinding,
  createStorageAdapter,
  getReviewDesk,
  returnInspection,
  updateFinding,
} from "@inspectstack/db";
import { renderReportPdf } from "@inspectstack/reports";
import { getDb } from "../db";
import { requireSession } from "../session";

async function requireReviewer() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canOpenReviewDesk(session.session.active.role)) redirect("/app/denied");
  return session.session;
}

function brandingOf(value: unknown) {
  if (value && typeof value === "object") {
    return { ...DEFAULT_BRANDING, ...(value as typeof DEFAULT_BRANDING) };
  }
  return DEFAULT_BRANDING;
}

export async function returnInspectionAction(formData: FormData) {
  const session = await requireReviewer();
  const inspectionId = String(formData.get("inspectionId") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!z.string().uuid().safeParse(inspectionId).success) {
    redirect("/app/review?error=invalid");
  }
  const result = await returnInspection(getDb(), {
    organizationId: session.active.organizationId,
    inspectionId,
    actorUserId: session.user.id,
    role: session.active.role as MembershipRole,
    note,
  });
  revalidatePath("/app/review");
  revalidatePath(`/app/review/${inspectionId}`);
  revalidatePath(`/app/inspections/${inspectionId}`);
  if (!result.ok) {
    redirect(`/app/review/${inspectionId}?error=${result.error}`);
  }
  redirect(`/app/review/${inspectionId}?returned=1`);
}

export async function approveInspectionAction(formData: FormData) {
  const session = await requireReviewer();
  const inspectionId = String(formData.get("inspectionId") ?? "");
  if (!z.string().uuid().safeParse(inspectionId).success) {
    redirect("/app/review?error=invalid");
  }
  const db = getDb();
  const result = await approveInspection(db, {
    organizationId: session.active.organizationId,
    inspectionId,
    actorUserId: session.user.id,
    actorName: session.user.email,
    role: session.active.role as MembershipRole,
    orgName: session.active.organizationName,
    orgTimezone: session.active.timezone,
    branding: brandingOf(session.active.branding),
  });
  if (!result.ok) {
    redirect(`/app/review/${inspectionId}?error=${result.error}`);
  }

  if (!result.duplicate || !result.snapshot.storageKey) {
    try {
      const images: Record<string, Buffer | string> = {};
      const storage = createStorageAdapter();
      const desk = await getReviewDesk(
        db,
        { organizationId: session.active.organizationId },
        inspectionId,
      );
      if (desk) {
        for (const row of desk.media) {
          if (!row.storageKey || !row.contentHash) continue;
          try {
            const url = await storage.signedDownloadUrl(
              session.active.organizationId,
              row.storageKey,
              60,
            );
            const response = await fetch(url);
            if (response.ok) {
              images[row.contentHash] = Buffer.from(await response.arrayBuffer());
              if (row.fieldKey) images[row.fieldKey] = images[row.contentHash]!;
            }
          } catch {
            /* photo stays as missing on the PDF */
          }
        }
        for (const [key, value] of Object.entries(desk.responses)) {
          const dataUrl =
            typeof value === "string" && value.startsWith("data:")
              ? value
              : value && typeof value === "object" && "dataUrl" in value
                ? String((value as { dataUrl: unknown }).dataUrl ?? "")
                : "";
          if (dataUrl.startsWith("data:")) images[key] = dataUrl;
        }
      }
      const pdf = await renderReportPdf({
        document: {
          ...result.canonical,
          envelope: {
            issuedAt: result.snapshot.issuedAt.toISOString(),
            verificationCode: result.snapshot.verificationCode,
            issuedByName: session.user.email,
          },
        },
        images,
      });
      await attachReportPdf(db, storage, {
        organizationId: session.active.organizationId,
        snapshotId: result.snapshot.id,
        pdf,
      });
    } catch (error) {
      console.error("PDF render failed after approve", error);
    }
  }

  revalidatePath("/app/review");
  revalidatePath(`/app/review/${inspectionId}`);
  revalidatePath("/app/reports");
  revalidatePath(`/app/inspections/${inspectionId}`);
  redirect(`/app/reports/${result.snapshot.id}`);
}

export async function createFindingAction(formData: FormData) {
  const session = await requireReviewer();
  const inspectionId = String(formData.get("inspectionId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const severity = String(formData.get("severity") ?? "medium");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const ownerUserId = String(formData.get("ownerUserId") ?? "") || null;
  const due = String(formData.get("dueAt") ?? "");
  if (!z.string().uuid().safeParse(inspectionId).success || !title) {
    redirect(`/app/review/${inspectionId}?error=finding`);
  }
  const result = await createFinding(getDb(), {
    organizationId: session.active.organizationId,
    inspectionId,
    actorUserId: session.user.id,
    title,
    severity,
    notes,
    fieldKey: null,
    ownerUserId:
      ownerUserId && z.string().uuid().safeParse(ownerUserId).success ? ownerUserId : null,
    dueAt: due ? new Date(`${due}T12:00:00`) : null,
  });
  revalidatePath(`/app/review/${inspectionId}`);
  if (!result.ok) redirect(`/app/review/${inspectionId}?error=finding`);
  redirect(`/app/review/${inspectionId}`);
}

export async function updateFindingAction(formData: FormData) {
  const session = await requireReviewer();
  const inspectionId = String(formData.get("inspectionId") ?? "");
  const findingId = String(formData.get("findingId") ?? "");
  const intent = String(formData.get("intent") ?? "save");
  if (!z.string().uuid().safeParse(findingId).success) {
    redirect(`/app/review/${inspectionId}?error=finding`);
  }
  const due = String(formData.get("dueAt") ?? "");
  const ownerUserId = String(formData.get("ownerUserId") ?? "");
  const result = await updateFinding(getDb(), {
    organizationId: session.active.organizationId,
    findingId,
    actorUserId: session.user.id,
    title: intent === "save" ? String(formData.get("title") ?? "") : undefined,
    severity: intent === "save" ? String(formData.get("severity") ?? "") : undefined,
    notes: intent === "save" ? String(formData.get("notes") ?? "") : undefined,
    ownerUserId:
      intent === "save"
        ? ownerUserId && z.string().uuid().safeParse(ownerUserId).success
          ? ownerUserId
          : null
        : undefined,
    dueAt: intent === "save" ? (due ? new Date(`${due}T12:00:00`) : null) : undefined,
    status: intent === "save" ? undefined : intent,
  });
  revalidatePath(`/app/review/${inspectionId}`);
  if (!result.ok) redirect(`/app/review/${inspectionId}?error=${result.error}`);
  redirect(`/app/review/${inspectionId}`);
}
