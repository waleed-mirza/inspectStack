import { redirect } from "next/navigation";
import { LogoPlate, Select, StatusStamp, SubmitButton } from "@inspectstack/ui";
import { navLabel, parseWorkspaceBranding, type MembershipRole } from "@inspectstack/domain";
import { switchOrganization } from "@/lib/actions/auth";
import { AppNav } from "@/components/app-nav";
import { AppShell } from "@/components/app-shell";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { SignOutButton } from "@/components/sign-out-button";
import { requireSession } from "@/lib/session";
import { resolveLogoSrc } from "@/lib/brand-logo";

/** Session shell needs cookies + env; skip static prerender so placeholder env builds. */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (!session.ok && session.reason === "unauthenticated") redirect("/login");
  if (!session.ok && session.reason === "no_org") redirect("/onboarding");
  if (!session.ok) redirect("/login");

  const { active, memberships, user, impersonation } = session.session;
  const branding = parseWorkspaceBranding(active.branding, active.organizationName);
  const brand = branding.primaryColor;
  const logoSrc = await resolveLogoSrc(active.organizationId, branding);

  return (
    <AppShell
      brand={brand}
      banner={
        impersonation ? (
          <ImpersonationBanner
            organizationName={impersonation.organizationName}
            targetEmail={impersonation.targetEmail}
            reason={impersonation.reason}
          />
        ) : null
      }
      header={
        <header className="sticky top-0 z-20 border-b border-ink bg-paper">
          <div className="page-shell flex flex-wrap items-center gap-3 py-3">
            <LogoPlate name={active.organizationName} logoUrl={logoSrc} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-title leading-tight">
                {active.organizationName}
              </p>
              <p className="font-mono text-micro uppercase tracking-id text-muted">
                {active.appMode.replace("_", " ")} · {active.role.replaceAll("_", " ")}
              </p>
            </div>
            {memberships.length > 1 && !impersonation ? (
              <form action={switchOrganization} className="flex items-center gap-2">
                <label htmlFor="organizationId" className="sr-only">
                  Workspace
                </label>
                <Select
                  id="organizationId"
                  name="organizationId"
                  defaultValue={active.organizationId}
                  className="mt-0 h-8 w-auto min-w-40"
                >
                  {memberships.map((m) => (
                    <option key={m.organizationId} value={m.organizationId}>
                      {m.organizationName}
                    </option>
                  ))}
                </Select>
                <SubmitButton size="sm" busyLabel="Switching…">
                  Switch
                </SubmitButton>
              </form>
            ) : null}
            <SignOutButton />
          </div>
          <AppNav
            role={active.role as MembershipRole}
            inspectionsLabel={navLabel(branding.terminology.inspection)}
            sitesLabel={navLabel(branding.terminology.site)}
            showAdmin={user.isPlatformAdmin}
          />
        </header>
      }
      status={
        <div className="page-shell flex gap-3 py-3 text-label text-muted">
          <StatusStamp tone="muted">{user.email}</StatusStamp>
          <StatusStamp tone="ink">Online</StatusStamp>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
