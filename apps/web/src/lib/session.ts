import { cookies } from "next/headers";
import {
  IMPERSONATION_COOKIE,
  parseFeatureFlags,
  parsePlanKey,
  parseWorkspaceBranding,
  type MembershipRole,
} from "@inspectstack/domain";
import {
  getOpenImpersonation,
  getUserProfile,
  impersonationView,
  listMembershipsForUser,
} from "@inspectstack/db";
import { createSupabaseServer } from "./supabase/server";
import { getDb } from "./db";

export const ORG_COOKIE = "inspectstack-org";

export async function getSessionContext() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const db = getDb();
  const profile = await getUserProfile(db, user.id);
  const memberships = await listMembershipsForUser(db, user.id);
  const cookieStore = await cookies();
  const requested = cookieStore.get(ORG_COOKIE)?.value;
  const active =
    memberships.find((m) => m.organizationId === requested && m.status === "active") ??
    memberships.find((m) => m.status === "active") ??
    null;

  const impersonateId = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  let impersonation: {
    sessionId: string;
    reason: string;
    organizationName: string;
    targetEmail: string | null;
  } | null = null;
  let viewing = active;

  if (impersonateId && profile?.isPlatformAdmin) {
    const open = await getOpenImpersonation(db, user.id, impersonateId);
    if (open) {
      const view = await impersonationView(db, open);
      if (view) {
        viewing = {
          membershipId: view.member?.membershipId ?? `impersonate:${open.id}`,
          organizationId: view.org.id,
          role: (view.member?.role ?? "owner") as MembershipRole,
          status: "active",
          organizationName: view.org.name,
          organizationSlug: view.org.slug,
          appMode: view.org.appMode,
          branding: view.org.branding,
          timezone: view.org.timezone,
          planKey: parsePlanKey(view.org.planKey),
          featureFlags: parseFeatureFlags(view.org.featureFlags),
        };
        impersonation = {
          sessionId: open.id,
          reason: open.reason,
          organizationName: view.org.name,
          targetEmail: view.member?.email ?? null,
        };
      }
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? profile?.email ?? "",
      displayName: profile?.displayName ?? user.email ?? "",
      isPlatformAdmin: profile?.isPlatformAdmin ?? false,
    },
    memberships,
    active: viewing
      ? {
          ...viewing,
          branding: parseWorkspaceBranding(viewing.branding, viewing.organizationName),
        }
      : null,
    impersonation,
  };
}

export async function requireSession() {
  const session = await getSessionContext();
  if (!session) return { ok: false as const, reason: "unauthenticated" as const };
  const active = session.active;
  if (!active) return { ok: false as const, reason: "no_org" as const, session };
  return { ok: true as const, session: { ...session, active } };
}

export async function requirePlatformAdmin() {
  const session = await requireSession();
  if (!session.ok) return session;
  if (!session.session.user.isPlatformAdmin) {
    return { ok: false as const, reason: "denied" as const, session: session.session };
  }
  return session;
}
