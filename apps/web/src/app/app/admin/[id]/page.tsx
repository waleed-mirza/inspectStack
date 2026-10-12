import { redirect } from "next/navigation";
import {
  DeniedState,
  EmptyState,
  Label,
  Notice,
  PageHeader,
  Panel,
  Select,
  StatusStamp,
  SubmitButton,
  Textarea,
} from "@inspectstack/ui";
import { PLAN_KEYS, canAccessPlatform, formatDisplayDate } from "@inspectstack/domain";
import { getTenantDesk } from "@inspectstack/db";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  impersonateTenantAction,
  setTenantFlagsAction,
  setTenantPlanAction,
} from "@/lib/actions/admin";
import { AppLink } from "@/components/action-link";

export default async function AdminTenantDeskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canAccessPlatform(session.session.user.isPlatformAdmin)) {
    return <DeniedState>Only the platform operator can open tenants.</DeniedState>;
  }
  const { id } = await params;
  const query = await searchParams;
  const desk = await getTenantDesk(getDb(), session.session.user.isPlatformAdmin, id);
  if (!desk) return <DeniedState>That workspace is not on this project.</DeniedState>;

  const error =
    query.error === "reason"
      ? "Write a reason of at least 8 characters before viewing a workspace."
      : query.error === "denied"
        ? "That action is not allowed."
        : query.error === "member"
          ? "That person is not an active member of this workspace."
          : query.error
            ? "Check the fields and try again."
            : null;

  return (
    <section className="max-w-[40rem] space-y-8">
      <PageHeader
        title={desk.workspace.name}
        description={`${desk.workspace.slug} · ${desk.workspace.timezone}`}
        kicker={
          <p className="font-mono text-micro uppercase tracking-id text-muted">
            {desk.workspace.planKey}
          </p>
        }
        actions={
          <AppLink href="/app/admin" className="underline">
            All tenants
          </AppLink>
        }
      />
      {error ? <Notice tone="fail">{error}</Notice> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Panel>
          <p className="font-display text-title">People</p>
          <p className="font-mono text-micro text-muted">
            {desk.meters.members.used} / {desk.meters.members.limit}
          </p>
        </Panel>
        <Panel>
          <p className="font-display text-title">Jobs this month</p>
          <p className="font-mono text-micro text-muted">
            {desk.meters.inspections.used} / {desk.meters.inspections.limit}
          </p>
        </Panel>
        <Panel>
          <p className="font-display text-title">Sites</p>
          <p className="font-mono text-micro text-muted">
            {desk.meters.sites.used} / {desk.meters.sites.limit}
          </p>
        </Panel>
        <Panel>
          <p className="font-display text-title">Storage</p>
          <p className="font-mono text-micro text-muted">
            {desk.meters.storage.used} / {desk.meters.storage.limit} MB
          </p>
        </Panel>
      </div>

      <form action={setTenantPlanAction} className="surface space-y-3 p-4">
        <input type="hidden" name="organizationId" value={desk.workspace.id} />
        <Label htmlFor="planKey">Plan</Label>
        <Select id="planKey" name="planKey" defaultValue={desk.workspace.planKey}>
          {PLAN_KEYS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </Select>
        <SubmitButton variant="primary" busyLabel="Saving plan…">
          Save plan
        </SubmitButton>
      </form>

      <form action={setTenantFlagsAction} className="surface space-y-3 p-4">
        <input type="hidden" name="organizationId" value={desk.workspace.id} />
        <p className="font-display text-title">Flags</p>
        {(
          [
            ["schedules", "Schedules"],
            ["qrLaunch", "QR launch"],
            ["correctivePortal", "Corrective actions"],
            ["shareLinks", "Share links"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-ui">
            <input
              type="checkbox"
              name={key}
              defaultChecked={desk.workspace.featureFlags[key]}
              className="h-4 w-4 accent-[var(--org-brand,#215C45)]"
            />
            {label}
          </label>
        ))}
        <SubmitButton variant="primary" busyLabel="Saving flags…">
          Save flags
        </SubmitButton>
      </form>

      <form action={impersonateTenantAction} className="surface space-y-3 p-4">
        <p className="font-display text-title">View as this workspace</p>
        <p className="text-ui text-muted">
          Write why. The reason is stored on the activity ticket and shown on the banner.
        </p>
        <input type="hidden" name="organizationId" value={desk.workspace.id} />
        <div>
          <Label htmlFor="targetUserId">Member</Label>
          <Select id="targetUserId" name="targetUserId" defaultValue="">
            <option value="">Owner (default)</option>
            {desk.members
              .filter((member) => member.status === "active")
              .map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName} · {member.role.replaceAll("_", " ")}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="reason">Reason</Label>
          <Textarea id="reason" name="reason" required minLength={8} rows={3} />
        </div>
        <SubmitButton variant="primary" busyLabel="Opening workspace…">
          Start viewing
        </SubmitButton>
      </form>

      <div>
        <h2 className="font-display text-title">Support viewing</h2>
        {desk.impersonations.length === 0 ? (
          <div className="mt-3">
            <EmptyState>No support viewing recorded.</EmptyState>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {desk.impersonations.map((row) => (
              <li key={row.id}>
                <Panel className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-ui">{row.reason}</p>
                    <StatusStamp tone={row.endedAt ? "muted" : "queued"}>
                      {row.endedAt ? "Ended" : "Open"}
                    </StatusStamp>
                  </div>
                  <p className="font-mono text-micro text-muted">
                    {row.actorEmail ?? "operator"} · {formatDisplayDate(row.startedAt)}
                  </p>
                </Panel>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
