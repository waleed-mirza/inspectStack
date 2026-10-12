import { EmptyState, StatusStamp, PageHeader, Panel } from "@inspectstack/ui";
import { TicketLink } from "@/components/action-link";
import { listFindings, listInspections } from "@inspectstack/db";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";

function stampFor(status: string): { stamp: string; tone: "fail" | "queued" | "pass" | "ink" } {
  if (status === "approved") return { stamp: "Approved", tone: "pass" };
  if (status === "in_progress") return { stamp: "In field", tone: "queued" };
  if (status === "submitted") return { stamp: "Review", tone: "ink" };
  if (status === "returned") return { stamp: "Returned", tone: "fail" };
  return { stamp: status.replaceAll("_", " "), tone: "ink" };
}

export default async function DashboardPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  const orgId = session.session.active.organizationId;
  const db = getDb();
  const [jobs, findings] = await Promise.all([
    listInspections(db, { organizationId: orgId }),
    listFindings(db, { organizationId: orgId }),
  ]);

  const openFindings = findings.filter((f) => f.status !== "closed");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_17.5rem]">
      <section>
        <PageHeader title="Job tickets" />
        {jobs.length === 0 ? (
          <EmptyState>
            No inspections in this workspace yet. Seed demo data with{" "}
            <code className="font-mono">pnpm db:reset</code>.
          </EmptyState>
        ) : (
          <div className="grid gap-3">
            {jobs.map((job) => {
              const { stamp, tone } = stampFor(job.status);
              return (
                <TicketLink
                  key={job.id}
                  href={`/app/inspections/${job.id}`}
                  number={job.number}
                  title={`${job.number} · ${job.status.replaceAll("_", " ")}`}
                  stamp={stamp}
                  tone={tone}
                  meta={job.dueAt ? `Due ${job.dueAt.toLocaleDateString()}` : "No due date"}
                />
              );
            })}
          </div>
        )}
      </section>
      <aside className="space-y-4">
        <Panel>
          <p className="font-mono text-micro uppercase tracking-id text-muted">Open findings</p>
          <p className="mt-2 font-display text-page">{openFindings.length}</p>
        </Panel>
        <Panel>
          <p className="font-mono text-micro uppercase tracking-id text-muted">Sync</p>
          <div className="mt-2">
            <StatusStamp tone="pass">Synced</StatusStamp>
          </div>
          <p className="mt-2 text-ui text-muted">
            Open a ticket and use the field runner. Offline / queued / syncing / failed / synced
            live on the device.
          </p>
        </Panel>
      </aside>
    </div>
  );
}
