import { redirect } from "next/navigation";
import { DeniedState, EmptyState, PageHeader, StatusStamp } from "@inspectstack/ui";
import { TicketLink } from "@/components/action-link";
import { listPortalQueue } from "@inspectstack/db";
import { canOpenActionsPortal, findingReminderState, isFeatureEnabled } from "@inspectstack/domain";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { dueStamp } from "@/lib/ops-copy";

export default async function ActionsQueuePage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!isFeatureEnabled(session.session.active.featureFlags, "correctivePortal")) {
    return <DeniedState>Corrective actions are off for this workspace.</DeniedState>;
  }
  if (!canOpenActionsPortal(session.session.active.role)) {
    return <DeniedState>This workspace role cannot open the actions portal.</DeniedState>;
  }
  const rows = await listPortalQueue(getDb(), {
    organizationId: session.session.active.organizationId,
  });
  const tz = session.session.active.timezone;
  const now = new Date();

  return (
    <section>
      <PageHeader
        title="Actions"
        description="Open findings stay here until a reviewer closes them. Comments and evidence are visible to the workspace, including client viewers."
      />
      {rows.length === 0 ? (
        <EmptyState title="Queue is empty">
          No open findings. Approved reports still keep their history.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {rows.map((row) => {
            const reminder = findingReminderState(row.dueAt, now, tz);
            const stamp = dueStamp(reminder);
            return (
              <li key={row.id}>
                <TicketLink
                  href={`/app/actions/${row.id}`}
                  number={row.inspectionNumber}
                  title={row.title}
                  stamp={row.status.replaceAll("_", " ")}
                  tone={
                    stamp?.tone === "fail"
                      ? "fail"
                      : row.status === "ready_for_review"
                        ? "queued"
                        : "ink"
                  }
                  meta={
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{row.siteName ?? "No site"}</span>
                      {row.ownerName ? <span>· {row.ownerName}</span> : null}
                      {stamp ? <StatusStamp tone={stamp.tone}>{stamp.label}</StatusStamp> : null}
                    </span>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
