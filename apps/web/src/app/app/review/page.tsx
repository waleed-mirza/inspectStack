import { redirect } from "next/navigation";
import { DeniedState, EmptyState, PageHeader, StatusStamp } from "@inspectstack/ui";
import { TicketLink } from "@/components/action-link";
import { listReviewQueue } from "@inspectstack/db";
import { canReview } from "@inspectstack/domain";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";

export default async function ReviewPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canReview(session.session.active.role)) {
    return <DeniedState>Only reviewers, admins, and owners can open the review queue.</DeniedState>;
  }
  const queued = await listReviewQueue(getDb(), {
    organizationId: session.session.active.organizationId,
  });

  return (
    <section>
      <PageHeader
        title="Review"
        description="Submitted jobs wait here. Approve issues a snapshot and PDF. Return sends the job back to the inspector with a note."
      />
      {queued.length === 0 ? (
        <EmptyState>
          Queue is empty. Nothing is waiting for approval.
          <div className="mt-2">
            <StatusStamp tone="muted">Nothing to review</StatusStamp>
          </div>
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {queued.map((job) => (
            <li key={job.id}>
              <TicketLink
                href={`/app/review/${job.id}`}
                number={job.number}
                title={
                  job.status === "returned"
                    ? "Returned — waiting on inspector"
                    : "Ready for approval"
                }
                stamp={job.status.replaceAll("_", " ")}
                tone={job.status === "returned" ? "fail" : "queued"}
                meta={job.reviewNote ? job.reviewNote : `Revision ${job.revision}`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
