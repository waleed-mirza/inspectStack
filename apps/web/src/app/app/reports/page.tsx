import { redirect } from "next/navigation";
import { EmptyState, PageHeader, StatusStamp } from "@inspectstack/ui";
import { TicketLink } from "@/components/action-link";
import { listIssuedReports } from "@inspectstack/db";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";

export default async function ReportsPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  const rows = await listIssuedReports(getDb(), {
    organizationId: session.session.active.organizationId,
  });

  return (
    <section>
      <PageHeader
        title="Reports"
        description="Only approved inspections issue snapshots. Revoked links stop exposing the report."
      />
      {rows.length === 0 ? (
        <EmptyState>
          No issued snapshots in this workspace. Approve a submitted job from Review.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {rows.map(({ snapshot, inspectionNumber }) => (
            <li key={snapshot.id}>
              <TicketLink
                href={`/app/reports/${snapshot.id}`}
                number={inspectionNumber}
                title={snapshot.revokedAt ? "Revoked snapshot" : "Issued snapshot"}
                stamp={snapshot.revokedAt ? "Revoked" : snapshot.verificationCode}
                tone={snapshot.revokedAt ? "fail" : "pass"}
                meta={
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusStamp tone="muted">{snapshot.layoutKey}</StatusStamp>
                    <span>{snapshot.issuedAt.toISOString().slice(0, 10)}</span>
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
