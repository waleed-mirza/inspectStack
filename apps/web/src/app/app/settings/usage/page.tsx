import { redirect } from "next/navigation";
import { DeniedState, PageHeader, Panel, StatusStamp } from "@inspectstack/ui";
import { canManageWorkspace, limitsForPlan } from "@inspectstack/domain";
import { getWorkspaceUsage } from "@inspectstack/db";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { SettingsNav } from "@/components/settings-nav";

function Meter({
  label,
  used,
  limit,
  over,
}: {
  label: string;
  used: number;
  limit: number;
  over: boolean;
}) {
  const width = `${Math.round(Math.min(1, limit === 0 ? 1 : used / limit) * 100)}%`;
  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-title">{label}</p>
        <StatusStamp tone={over ? "fail" : "ink"}>{`${used} / ${limit}`}</StatusStamp>
      </div>
      <div className="mt-3 h-2 bg-fill">
        <div className="h-2 bg-[var(--org-brand,#215C45)]" style={{ width }} />
      </div>
    </Panel>
  );
}

export default async function UsagePage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canManageWorkspace(session.session.active.role)) {
    return <DeniedState>Owners and admins read plan usage.</DeniedState>;
  }
  const usage = await getWorkspaceUsage(getDb(), {
    organizationId: session.session.active.organizationId,
  });
  if (!usage) redirect("/app/settings");
  const limits = limitsForPlan(usage.workspace.planKey);
  const flags = usage.workspace.featureFlags;

  return (
    <section className="max-w-[36rem] space-y-8">
      <PageHeader
        title="Plan"
        description={`This workspace is on the ${usage.workspace.planKey} plan. Caps are not a bill — they keep a demo from overflowing.`}
      />
      <SettingsNav />
      <div className="grid gap-3">
        <Meter label="People" {...usage.meters.members} />
        <Meter label="Jobs this month" {...usage.meters.inspections} />
        <Meter label="Sites" {...usage.meters.sites} />
        <Meter label="Templates" {...usage.meters.templates} />
        <Meter label="Storage (MB)" {...usage.meters.storage} />
      </div>
      <Panel>
        <p className="font-display text-title">Included on this plan</p>
        <ul className="mt-2 space-y-1 text-ui">
          <li>People cap {limits.members}</li>
          <li>Jobs / month {limits.inspectionsPerMonth}</li>
          <li>Schedules {flags.schedules ? "on" : "off"}</li>
          <li>QR launch {flags.qrLaunch ? "on" : "off"}</li>
          <li>Corrective actions {flags.correctivePortal ? "on" : "off"}</li>
          <li>Share links {flags.shareLinks ? "on" : "off"}</li>
        </ul>
      </Panel>
    </section>
  );
}
