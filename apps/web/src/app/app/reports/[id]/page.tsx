import { notFound, redirect } from "next/navigation";
import {
  Label,
  Notice,
  PageHeader,
  Panel,
  Select,
  StatusStamp,
  SubmitButton,
} from "@inspectstack/ui";
import { ActionLink } from "@/components/action-link";
import { PublicReportView } from "@/components/report/public-report";
import { getReportSnapshot, listShareLinks } from "@inspectstack/db";
import { canReview, parseReportCanonical } from "@inspectstack/domain";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  createShareLinkAction,
  revokeShareLinkAction,
  revokeSnapshotAction,
} from "@/lib/actions/reports";

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ share?: string; revoked?: string; error?: string }>;
}) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  const { id } = await params;
  const query = await searchParams;
  const snapshot = await getReportSnapshot(
    getDb(),
    { organizationId: session.session.active.organizationId },
    id,
  );
  if (!snapshot) notFound();

  let canonical = null;
  try {
    canonical = parseReportCanonical(snapshot.snapshot);
  } catch {
    canonical = null;
  }
  const links = await listShareLinks(
    getDb(),
    { organizationId: session.session.active.organizationId },
    snapshot.id,
  );
  const reviewer = canReview(session.session.active.role);

  return (
    <article>
      <PageHeader
        kicker={
          <p className="font-mono text-micro uppercase tracking-id text-muted">
            {snapshot.verificationCode}
          </p>
        }
        title="Issued report"
        description="Snapshot hash is of the canonical JSON. Revoking hides the public page and every share link."
        actions={
          <ActionLink href={`/app/review/${snapshot.inspectionId}`} pendingLabel="Opening review…">
            Review desk
          </ActionLink>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <StatusStamp tone={snapshot.revokedAt ? "fail" : "pass"}>
          {snapshot.revokedAt ? "Revoked" : "Issued"}
        </StatusStamp>
        <StatusStamp tone="muted">{snapshot.layoutKey}</StatusStamp>
        <StatusStamp tone="ink">{snapshot.contentHash.slice(0, 12)}</StatusStamp>
      </div>
      {query.revoked ? (
        <Notice tone="fail">Public links no longer expose this report.</Notice>
      ) : null}
      {query.error === "revoked" ? (
        <Notice tone="fail">This snapshot is already revoked.</Notice>
      ) : null}
      {query.share ? (
        <Notice tone="pass">
          Share link created. Copy it now — the token is not stored in plain text.
          <span className="mt-2 block font-mono text-micro">/share/{query.share}</span>
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          {canonical ? (
            <PublicReportView
              canonical={canonical}
              verificationCode={snapshot.verificationCode}
              issuedAt={snapshot.issuedAt.toISOString()}
              downloadHref={`/verify/${snapshot.verificationCode}/pdf`}
            />
          ) : (
            <Panel>Snapshot JSON could not be read. Re-issue after revoke if needed.</Panel>
          )}
        </div>
        {reviewer ? (
          <aside className="space-y-4">
            <Panel>
              <h2 className="font-display text-title">Verification</h2>
              <p className="mt-2 font-mono text-ui">{snapshot.verificationCode}</p>
              <ActionLink
                href={`/verify/${snapshot.verificationCode}`}
                className="mt-3 w-full"
                pendingLabel="Opening…"
              >
                Open public page
              </ActionLink>
            </Panel>
            <Panel>
              <h2 className="font-display text-title">Share link</h2>
              <form action={createShareLinkAction} className="mt-3 space-y-3">
                <input type="hidden" name="snapshotId" value={snapshot.id} />
                <Label>
                  Expires in
                  <Select name="days" defaultValue="14">
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="0">No expiry</option>
                  </Select>
                </Label>
                <SubmitButton
                  className="w-full"
                  busyLabel="Creating link…"
                  disabled={Boolean(snapshot.revokedAt)}
                >
                  Create share link
                </SubmitButton>
              </form>
              {links.length > 0 ? (
                <ul className="mt-4 space-y-2 text-ui">
                  {links.map((link) => (
                    <li key={link.id} className="flex items-center justify-between gap-2">
                      <span className="text-muted">
                        {link.revokedAt
                          ? "Revoked"
                          : link.expiresAt
                            ? `Until ${link.expiresAt.toISOString().slice(0, 10)}`
                            : "Open"}
                      </span>
                      {!link.revokedAt ? (
                        <form action={revokeShareLinkAction}>
                          <input type="hidden" name="snapshotId" value={snapshot.id} />
                          <input type="hidden" name="shareLinkId" value={link.id} />
                          <SubmitButton size="sm" busyLabel="Revoking…">
                            Revoke
                          </SubmitButton>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </Panel>
            <Panel>
              <h2 className="font-display text-title">Revoke report</h2>
              <p className="mt-2 text-ui text-muted">
                The verification page will show nothing about the inspection.
              </p>
              <form action={revokeSnapshotAction} className="mt-3">
                <input type="hidden" name="snapshotId" value={snapshot.id} />
                <SubmitButton
                  variant="danger"
                  className="w-full"
                  busyLabel="Revoking…"
                  disabled={Boolean(snapshot.revokedAt)}
                >
                  Revoke all links
                </SubmitButton>
              </form>
            </Panel>
          </aside>
        ) : null}
      </div>
    </article>
  );
}
