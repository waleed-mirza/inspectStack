import { redirect } from "next/navigation";
import { DeniedState, EmptyState, PageHeader, Panel } from "@inspectstack/ui";
import {
  canManageWorkspace,
  formatDisplayDate,
  parseWorkspaceBranding,
} from "@inspectstack/domain";
import { listOrgAudit } from "@inspectstack/db";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { SettingsNav } from "@/components/settings-nav";

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    "workspace.mode": "Mode changed",
    "workspace.branding": "Brand saved",
    "workspace.identity": "Workspace renamed",
    "workspace.logo": "Mark uploaded",
    "workspace.logo.clear": "Mark cleared",
    "workspace.invite": "Invite sent",
    "workspace.role": "Role changed",
    "workspace.suspend": "Member suspended",
    "workspace.restore": "Member restored",
    "admin.plan": "Plan changed",
    "admin.flags": "Flags changed",
    "admin.impersonation.start": "Support viewing started",
    "admin.impersonation.end": "Support viewing ended",
    "auth.sign_in": "Signed in",
    "report.share_created": "Share link created",
    "report.share_revoked": "Share link revoked",
    "report.revoked": "Report revoked",
  };
  return map[action] ?? action.replaceAll(".", " ");
}

export default async function ActivityPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canManageWorkspace(session.session.active.role)) {
    return <DeniedState>Owners and admins read workspace activity.</DeniedState>;
  }
  const branding = parseWorkspaceBranding(
    session.session.active.branding,
    session.session.active.organizationName,
  );
  const events = await listOrgAudit(
    getDb(),
    { organizationId: session.session.active.organizationId },
    50,
  );

  return (
    <section className="max-w-[36rem] space-y-8">
      <PageHeader
        title="Activity"
        description="Authentication, brand, roles, reports, and support viewing are written here."
      />
      <SettingsNav />
      {events.length === 0 ? (
        <EmptyState>No activity recorded yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id}>
              <Panel className="px-3 py-2">
                <p className="font-display text-title">{actionLabel(event.action)}</p>
                <p className="text-ui text-muted">
                  {event.actorName ?? "System"}
                  {event.actorEmail ? ` · ${event.actorEmail}` : ""}
                  {` · ${formatDisplayDate(event.createdAt, branding.formats.date)}`}
                </p>
                {typeof event.metadata?.reason === "string" ? (
                  <p className="mt-1 text-ui">{event.metadata.reason}</p>
                ) : null}
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
