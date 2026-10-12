"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import {
  APP_MODES,
  DATE_FORMATS,
  MEMBERSHIP_ROLES,
  PAPER_SIZES,
  assertSafeImageUpload,
  brandingObjectKey,
  canChangeMemberRole,
  canInvite,
  canManageWorkspace,
  canSuspendMember,
  extForImageType,
  normalizeBrandColor,
  normalizeInspectionPrefix,
  parseWorkspaceBranding,
  type AppMode,
  type MembershipRole,
} from "@inspectstack/domain";
import {
  countOwners,
  createInvitation,
  createStorageAdapter,
  getWorkspaceUsage,
  listOrgMembers,
  recordAudit,
  updateMemberRole,
  updateMemberStatus,
  updateOrganizationBranding,
  updateOrganizationIdentity,
  updateOrganizationMode,
} from "@inspectstack/db";
import { requireSession } from "../session";
import { getDb } from "../db";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { readServerEnv } from "@inspectstack/config";
import { authRedirectOrigin } from "../auth-origin";

async function requireManager() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canManageWorkspace(session.session.active.role)) redirect("/app/denied");
  return session.session;
}

function revalidateWorkspace() {
  revalidatePath("/", "layout");
  revalidatePath("/app/settings");
  revalidatePath("/app/settings/team");
  revalidatePath("/app/settings/usage");
  revalidatePath("/app/settings/activity");
}

export async function setWorkspaceMode(formData: FormData) {
  const session = await requireManager();
  const mode = z.enum(APP_MODES).safeParse(formData.get("appMode"));
  if (!mode.success) redirect("/app/settings?error=mode");

  await updateOrganizationMode(
    getDb(),
    { organizationId: session.active.organizationId },
    mode.data as AppMode,
  );
  await recordAudit(getDb(), {
    organizationId: session.active.organizationId,
    actorUserId: session.user.id,
    action: "workspace.mode",
    entityType: "organization",
    entityId: session.active.organizationId,
    metadata: { appMode: mode.data },
  });
  revalidateWorkspace();
  redirect("/app/settings");
}

export async function saveWorkspaceIdentity(formData: FormData) {
  const session = await requireManager();
  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, 80);
  const timezone = String(formData.get("timezone") ?? "").trim() || session.active.timezone;
  if (name.length < 2) redirect("/app/settings?error=name");
  await updateOrganizationIdentity(
    getDb(),
    { organizationId: session.active.organizationId },
    {
      name,
      timezone,
    },
  );
  await recordAudit(getDb(), {
    organizationId: session.active.organizationId,
    actorUserId: session.user.id,
    action: "workspace.identity",
    entityType: "organization",
    entityId: session.active.organizationId,
    metadata: { name, timezone },
  });
  revalidateWorkspace();
  redirect("/app/settings");
}

export async function saveWorkspaceBranding(formData: FormData) {
  const session = await requireManager();
  const current = parseWorkspaceBranding(session.active.branding, session.active.organizationName);
  const date = z.enum(DATE_FORMATS).safeParse(formData.get("dateFormat"));
  const paper = z.enum(PAPER_SIZES).safeParse(formData.get("paperSize"));
  const branding = parseWorkspaceBranding(
    {
      ...current,
      primaryColor: normalizeBrandColor(String(formData.get("primaryColor") ?? "")),
      legalFooter: String(formData.get("legalFooter") ?? ""),
      terminology: {
        inspection: String(formData.get("termInspection") ?? current.terminology.inspection),
        site: String(formData.get("termSite") ?? current.terminology.site),
        asset: String(formData.get("termAsset") ?? current.terminology.asset),
        finding: String(formData.get("termFinding") ?? current.terminology.finding),
      },
      reportIdentity: {
        fromName: String(formData.get("reportFromName") ?? ""),
        documentTitle: String(formData.get("documentTitle") ?? ""),
      },
      emailIdentity: {
        fromName: String(formData.get("emailFromName") ?? ""),
        replyTo: String(formData.get("emailReplyTo") ?? ""),
      },
      formats: {
        date: date.success ? date.data : current.formats.date,
        paper: paper.success ? paper.data : current.formats.paper,
        inspectionPrefix: normalizeInspectionPrefix(String(formData.get("inspectionPrefix") ?? "")),
      },
    },
    session.active.organizationName,
  );
  await updateOrganizationBranding(
    getDb(),
    { organizationId: session.active.organizationId },
    branding,
  );
  await recordAudit(getDb(), {
    organizationId: session.active.organizationId,
    actorUserId: session.user.id,
    action: "workspace.branding",
    entityType: "organization",
    entityId: session.active.organizationId,
  });
  revalidateWorkspace();
  redirect("/app/settings?saved=1");
}

export async function uploadWorkspaceLogo(formData: FormData) {
  const session = await requireManager();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) redirect("/app/settings?error=logo");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = assertSafeImageUpload(bytes, file.type);
  if (!checked.ok) redirect(`/app/settings?error=logo_${checked.error}`);
  const ext = extForImageType(checked.contentType);
  const key = brandingObjectKey({
    organizationId: session.active.organizationId,
    ext,
  });
  const storage = createStorageAdapter();
  await storage.put(session.active.organizationId, key, Buffer.from(bytes), checked.contentType);
  const current = parseWorkspaceBranding(session.active.branding, session.active.organizationName);
  await updateOrganizationBranding(
    getDb(),
    { organizationId: session.active.organizationId },
    { ...current, logoUrl: key },
  );
  await recordAudit(getDb(), {
    organizationId: session.active.organizationId,
    actorUserId: session.user.id,
    action: "workspace.logo",
    entityType: "organization",
    entityId: session.active.organizationId,
  });
  revalidateWorkspace();
  redirect("/app/settings?saved=1");
}

export async function clearWorkspaceLogo() {
  const session = await requireManager();
  const current = parseWorkspaceBranding(session.active.branding, session.active.organizationName);
  await updateOrganizationBranding(
    getDb(),
    { organizationId: session.active.organizationId },
    { ...current, logoUrl: null },
  );
  await recordAudit(getDb(), {
    organizationId: session.active.organizationId,
    actorUserId: session.user.id,
    action: "workspace.logo.clear",
    entityType: "organization",
    entityId: session.active.organizationId,
  });
  revalidateWorkspace();
  redirect("/app/settings?saved=1");
}

export async function inviteMember(formData: FormData) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canInvite(session.session.active.role)) redirect("/app/denied");

  const usage = await getWorkspaceUsage(getDb(), {
    organizationId: session.session.active.organizationId,
  });
  if (usage?.meters.members.over) redirect("/app/settings/team?error=limit");

  const parsed = z
    .object({
      email: z.string().email(),
      role: z.enum(MEMBERSHIP_ROLES),
    })
    .safeParse({
      email: formData.get("email"),
      role: formData.get("role"),
    });
  if (!parsed.success) redirect("/app/settings/team?error=invalid");
  if (parsed.data.role === "owner" && session.session.active.role !== "owner") {
    redirect("/app/settings/team?error=role");
  }

  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await createInvitation(getDb(), {
    organizationId: session.session.active.organizationId,
    email: parsed.data.email,
    role: parsed.data.role as MembershipRole,
    tokenHash,
    expiresAt,
    invitedByUserId: session.session.user.id,
  });

  const env = readServerEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const origin = authRedirectOrigin((await headers()).get("origin") ?? env.NEXT_PUBLIC_APP_URL);
  const branding = parseWorkspaceBranding(
    session.session.active.branding,
    session.session.active.organizationName,
  );
  await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback`,
    data: {
      invited_organization_id: session.session.active.organizationId,
      invited_role: parsed.data.role,
      invited_from_name: branding.emailIdentity.fromName,
      invited_reply_to: branding.emailIdentity.replyTo,
    },
  });

  await recordAudit(getDb(), {
    organizationId: session.session.active.organizationId,
    actorUserId: session.session.user.id,
    action: "workspace.invite",
    entityType: "invitation",
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath("/app/settings/team");
  redirect("/app/settings/team?sent=1");
}

export async function changeMemberRoleAction(formData: FormData) {
  const session = await requireManager();
  const userId = String(formData.get("userId") ?? "");
  const role = z.enum(MEMBERSHIP_ROLES).safeParse(formData.get("role"));
  if (!z.string().uuid().safeParse(userId).success || !role.success) {
    redirect("/app/settings/team?error=invalid");
  }
  const db = getDb();
  const list = await listOrgMembers(db, { organizationId: session.active.organizationId });
  const target = list.find((row) => row.userId === userId);
  if (!target) redirect("/app/settings/team?error=not_found");
  const ownerCount = await countOwners(db, { organizationId: session.active.organizationId });
  if (
    !canChangeMemberRole({
      actor: session.active.role,
      target: target.role,
      next: role.data,
      ownerCount,
    })
  ) {
    redirect("/app/settings/team?error=role");
  }
  await updateMemberRole(
    db,
    { organizationId: session.active.organizationId },
    {
      userId,
      role: role.data,
    },
  );
  await recordAudit(db, {
    organizationId: session.active.organizationId,
    actorUserId: session.user.id,
    action: "workspace.role",
    entityType: "user",
    entityId: userId,
    metadata: { role: role.data },
  });
  revalidatePath("/app/settings/team");
  redirect("/app/settings/team");
}

export async function setMemberStatusAction(formData: FormData) {
  const session = await requireManager();
  const userId = String(formData.get("userId") ?? "");
  const nextStatus = formData.get("status") === "suspended" ? "suspended" : "active";
  if (!z.string().uuid().safeParse(userId).success) redirect("/app/settings/team?error=invalid");
  const db = getDb();
  const list = await listOrgMembers(db, { organizationId: session.active.organizationId });
  const target = list.find((row) => row.userId === userId);
  if (!target) redirect("/app/settings/team?error=not_found");
  const ownerCount = await countOwners(db, { organizationId: session.active.organizationId });
  if (nextStatus === "suspended") {
    if (
      !canSuspendMember({
        actor: session.active.role,
        target: target.role,
        ownerCount,
      })
    ) {
      redirect("/app/settings/team?error=role");
    }
  }
  await updateMemberStatus(
    db,
    { organizationId: session.active.organizationId },
    {
      userId,
      status: nextStatus,
    },
  );
  await recordAudit(db, {
    organizationId: session.active.organizationId,
    actorUserId: session.user.id,
    action: nextStatus === "suspended" ? "workspace.suspend" : "workspace.restore",
    entityType: "user",
    entityId: userId,
  });
  revalidatePath("/app/settings/team");
  redirect("/app/settings/team");
}
