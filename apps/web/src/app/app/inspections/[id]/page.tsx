import { notFound, redirect } from "next/navigation";
import { DeniedState, PageHeader, Panel, StatusStamp } from "@inspectstack/ui";
import { ActionLink } from "@/components/action-link";
import {
  getInspection,
  getLiveSnapshotForInspection,
  listFindingsForInspection,
} from "@inspectstack/db";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { canInspect, canReview } from "@inspectstack/domain";

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  const { id } = await params;
  const db = getDb();
  const orgId = session.session.active.organizationId;
  const job = await getInspection(db, { organizationId: orgId }, id);
  if (!job) notFound();

  const findings = await listFindingsForInspection(db, { organizationId: orgId }, job.id);
  const snapshot = await getLiveSnapshotForInspection(db, { organizationId: orgId }, job.id);
  const reviewer = canReview(session.session.active.role);

  return (
    <article>
      <PageHeader
        kicker={
          <p className="font-mono text-micro uppercase tracking-id text-muted">{job.number}</p>
        }
        title="Inspection"
        description="This is the job ticket. Capture answers in the field runner."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {canInspect(session.session.active.role) ? (
          <ActionLink href={`/app/run/${job.id}`} variant="primary" pendingLabel="Opening runner…">
            Open field runner
          </ActionLink>
        ) : null}
        {reviewer ? (
          <ActionLink href={`/app/review/${job.id}`} pendingLabel="Opening review…">
            Review desk
          </ActionLink>
        ) : null}
        {snapshot ? (
          <ActionLink href={`/app/reports/${snapshot.id}`} pendingLabel="Opening report…">
            Issued report
          </ActionLink>
        ) : null}
      </div>
      <div className="-mt-4 mb-6">
        <StatusStamp tone={job.status === "in_progress" ? "queued" : "ink"}>
          {job.status.replaceAll("_", " ")}
        </StatusStamp>
      </div>
      {!canInspect(session.session.active.role) ? (
        <div className="mb-6">
          <DeniedState>
            Inspectors and admins capture answers. You can still read this ticket.
          </DeniedState>
        </div>
      ) : null}
      <section>
        <h2 className="font-display text-title">Findings</h2>
        <ul className="mt-3 space-y-2">
          {findings.map((finding) => (
            <li key={finding.id}>
              <Panel className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong>{finding.title}</strong>
                  <StatusStamp tone="fail">{finding.severity}</StatusStamp>
                </div>
                <p className="mt-1 text-ui text-muted">{finding.notes}</p>
              </Panel>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
