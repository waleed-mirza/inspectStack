"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canManageTemplates, parseTemplateSchema, STARTER_PACKS } from "@inspectstack/domain";
import {
  cloneStarterPack,
  cloneTemplate,
  createBlankTemplate,
  ensureDraft,
  publishTemplateVersion,
  recordAudit,
  renameTemplate,
  retireTemplate,
  saveDraftSchema,
} from "@inspectstack/db";
import { requireSession } from "../session";
import { getDb } from "../db";

async function requireTemplateManager() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canManageTemplates(session.session.active.role)) redirect("/app/denied");
  return session.session;
}

export async function createBlankTemplateAction(formData: FormData) {
  const session = await requireTemplateManager();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/app/templates?error=name");
  const created = await createBlankTemplate(getDb(), {
    organizationId: session.active.organizationId,
    name,
    createdByUserId: session.user.id,
  });
  await recordAudit(getDb(), {
    organizationId: session.active.organizationId,
    actorUserId: session.user.id,
    action: "template.create",
    entityType: "template",
    entityId: created.template.id,
  });
  revalidatePath("/app/templates");
  redirect(`/app/templates/${created.template.id}`);
}

export async function clonePackAction(formData: FormData) {
  const session = await requireTemplateManager();
  const packKey = String(formData.get("packKey") ?? "");
  if (!STARTER_PACKS.some((pack) => pack.key === packKey)) {
    redirect("/app/templates?error=pack");
  }
  const created = await cloneStarterPack(getDb(), {
    organizationId: session.active.organizationId,
    packKey,
    createdByUserId: session.user.id,
  });
  await recordAudit(getDb(), {
    organizationId: session.active.organizationId,
    actorUserId: session.user.id,
    action: "template.clone_pack",
    entityType: "template",
    entityId: created.template.id,
    metadata: { packKey },
  });
  revalidatePath("/app/templates");
  redirect(`/app/templates/${created.template.id}`);
}

export async function cloneTemplateAction(formData: FormData) {
  const session = await requireTemplateManager();
  const templateId = String(formData.get("templateId") ?? "");
  const cloned = await cloneTemplate(getDb(), {
    organizationId: session.active.organizationId,
    templateId,
    createdByUserId: session.user.id,
  });
  if (!cloned) redirect("/app/templates?error=clone");
  await recordAudit(getDb(), {
    organizationId: session.active.organizationId,
    actorUserId: session.user.id,
    action: "template.clone",
    entityType: "template",
    entityId: cloned.template.id,
    metadata: { sourceTemplateId: templateId },
  });
  revalidatePath("/app/templates");
  redirect(`/app/templates/${cloned.template.id}`);
}

export async function retireTemplateAction(formData: FormData) {
  const session = await requireTemplateManager();
  const templateId = String(formData.get("templateId") ?? "");
  const row = await retireTemplate(
    getDb(),
    { organizationId: session.active.organizationId },
    templateId,
  );
  if (!row) redirect("/app/templates?error=retire");
  await recordAudit(getDb(), {
    organizationId: session.active.organizationId,
    actorUserId: session.user.id,
    action: "template.retire",
    entityType: "template",
    entityId: templateId,
  });
  revalidatePath("/app/templates");
  redirect("/app/templates?retired=1");
}

export async function renameTemplateAction(formData: FormData) {
  const session = await requireTemplateManager();
  const templateId = String(formData.get("templateId") ?? "");
  const name = String(formData.get("name") ?? "");
  try {
    const row = await renameTemplate(
      getDb(),
      { organizationId: session.active.organizationId },
      templateId,
      name,
    );
    if (!row) redirect(`/app/templates/${templateId}?error=rename`);
  } catch {
    redirect(`/app/templates/${templateId}?error=rename`);
  }
  revalidatePath(`/app/templates/${templateId}`);
  redirect(`/app/templates/${templateId}`);
}

export async function saveDraftAction(input: { versionId: string; schema: unknown }) {
  const session = await requireTemplateManager();
  const parsed = z
    .object({
      versionId: z.string().uuid(),
      schema: z.unknown(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Draft payload was not valid." };
  try {
    parseTemplateSchema(parsed.data.schema);
  } catch {
    return { ok: false as const, error: "That draft schema is not valid." };
  }
  const result = await saveDraftSchema(getDb(), {
    organizationId: session.active.organizationId,
    versionId: parsed.data.versionId,
    schema: parsed.data.schema,
  });
  if (result.ok) {
    revalidatePath("/app/templates");
  }
  return result;
}

export async function openDraftAction(formData: FormData) {
  const session = await requireTemplateManager();
  const templateId = String(formData.get("templateId") ?? "");
  const opened = await ensureDraft(getDb(), {
    organizationId: session.active.organizationId,
    templateId,
    createdByUserId: session.user.id,
  });
  if (!opened) redirect("/app/templates?error=draft");
  if (opened.created) {
    await recordAudit(getDb(), {
      organizationId: session.active.organizationId,
      actorUserId: session.user.id,
      action: "template.draft",
      entityType: "template_version",
      entityId: opened.version.id,
      metadata: { templateId, version: opened.version.version },
    });
  }
  revalidatePath(`/app/templates/${templateId}`);
  redirect(`/app/templates/${templateId}`);
}

export async function publishTemplateAction(formData: FormData) {
  const session = await requireTemplateManager();
  const templateId = String(formData.get("templateId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  const result = await publishTemplateVersion(getDb(), {
    organizationId: session.active.organizationId,
    versionId,
  });
  if (!result.ok) {
    redirect(
      `/app/templates/${templateId}?error=publish&reason=${encodeURIComponent(result.error)}`,
    );
  }
  await recordAudit(getDb(), {
    organizationId: session.active.organizationId,
    actorUserId: session.user.id,
    action: "template.publish",
    entityType: "template_version",
    entityId: versionId,
    metadata: { templateId },
  });
  revalidatePath(`/app/templates/${templateId}`);
  redirect(`/app/templates/${templateId}?published=1`);
}
