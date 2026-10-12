import { redirect } from "next/navigation";
import { EmptyState, PageHeader } from "@inspectstack/ui";
import { TicketLink } from "@/components/action-link";
import { listInspections } from "@inspectstack/db";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";

export default async function InspectionsPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  const jobs = await listInspections(getDb(), {
    organizationId: session.session.active.organizationId,
  });

  return (
    <section>
      <PageHeader
        title="Inspections"
        description="Tenant-scoped. IDs from another org never appear here."
      />
      {jobs.length === 0 ? (
        <EmptyState>
          No inspections in this workspace yet. Create one from a site, a schedule, or a QR launch.
        </EmptyState>
      ) : (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <TicketLink
              key={job.id}
              href={`/app/inspections/${job.id}`}
              number={job.number}
              title={job.status.replaceAll("_", " ")}
              stamp={job.status.replaceAll("_", " ")}
              tone={job.status === "in_progress" ? "queued" : "ink"}
              meta={`Revision ${job.revision}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
