import { notFound, redirect } from "next/navigation";
import {
  DeniedState,
  EmptyState,
  Input,
  Label,
  Notice,
  PageHeader,
  Panel,
  StatusStamp,
  SubmitButton,
  Textarea,
} from "@inspectstack/ui";
import { ActionLink } from "@/components/action-link";
import { createStorageAdapter, getPortalFinding } from "@inspectstack/db";
import {
  FINDING_TRANSITIONS,
  canAdvancePortalFinding,
  canOpenActionsPortal,
  canReopenFinding,
  canVerifyFinding,
  findingReminderState,
  parseFindingStatus,
} from "@inspectstack/domain";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  addFindingCommentAction,
  attachFindingEvidenceAction,
  transitionFindingAction,
} from "@/lib/actions/portal";
import { dueStamp, siteErrorMessage } from "@/lib/ops-copy";

function statusMessage(code: string | undefined) {
  if (code === "closed") return "Finding closed.";
  if (code === "reopened") return "Finding reopened.";
  if (code === "ready_for_review") return "Marked ready for review.";
  if (code === "in_progress") return "Marked in progress.";
  if (code === "acknowledged") return "Acknowledged.";
  return null;
}

export default async function ActionDeskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    commented?: string;
    evidence?: string;
    status?: string;
  }>;
}) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canOpenActionsPortal(session.session.active.role)) {
    return <DeniedState>This workspace role cannot open the actions portal.</DeniedState>;
  }
  const { id } = await params;
  const query = await searchParams;
  const db = getDb();
  const org = { organizationId: session.session.active.organizationId };
  const desk = await getPortalFinding(db, org, id);
  if (!desk) notFound();
  const role = session.session.active.role;
  const from = parseFindingStatus(desk.finding.status);
  const next = FINDING_TRANSITIONS[from];
  const reminder = findingReminderState(
    desk.finding.dueAt,
    new Date(),
    session.session.active.timezone,
  );
  const stamp = dueStamp(reminder);
  const error = siteErrorMessage(query.error);
  const storage = createStorageAdapter();
  const evidence = await Promise.all(
    desk.evidence.map(async (row) => {
      let url: string | null = null;
      try {
        url = await storage.signedDownloadUrl(org.organizationId, row.storageKey, 120);
      } catch {
        url = null;
      }
      return { ...row, url };
    }),
  );

  return (
    <article>
      <PageHeader
        kicker={
          <p className="font-mono text-micro uppercase tracking-id text-muted">
            {desk.finding.inspectionNumber}
          </p>
        }
        title={desk.finding.title}
        description={`${desk.finding.siteName ?? "No site"}${desk.finding.assetName ? ` · ${desk.finding.assetName}` : ""}`}
        actions={
          <ActionLink
            href={`/app/inspections/${desk.finding.inspectionId}`}
            pendingLabel="Opening ticket…"
          >
            Ticket
          </ActionLink>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <StatusStamp tone={from === "closed" ? "pass" : from === "reopened" ? "fail" : "queued"}>
          {from.replaceAll("_", " ")}
        </StatusStamp>
        {stamp ? <StatusStamp tone={stamp.tone}>{stamp.label}</StatusStamp> : null}
        {desk.finding.ownerName ? (
          <StatusStamp tone="muted">{desk.finding.ownerName}</StatusStamp>
        ) : null}
      </div>
      {error ? <Notice tone="fail">{error}</Notice> : null}
      {query.commented ? <Notice tone="pass">Comment saved.</Notice> : null}
      {query.evidence ? <Notice tone="pass">Evidence attached.</Notice> : null}
      {statusMessage(query.status) ? (
        <Notice tone="pass">{statusMessage(query.status)}</Notice>
      ) : null}
      {desk.finding.notes ? <Notice>Notes: {desk.finding.notes}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          <section>
            <h2 className="font-display text-title">Comments</h2>
            {desk.comments.length === 0 ? (
              <p className="mt-2 text-ui text-muted">No comments yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {desk.comments.map((comment) => (
                  <li key={comment.id}>
                    <Panel className="p-3">
                      <p className="font-mono text-micro uppercase tracking-id text-muted">
                        {comment.authorName ?? "Workspace"} ·{" "}
                        {comment.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                      </p>
                      <p className="mt-2 text-body whitespace-pre-wrap">{comment.body}</p>
                    </Panel>
                  </li>
                ))}
              </ul>
            )}
            <Panel className="mt-4">
              <form action={addFindingCommentAction} className="space-y-3">
                <input type="hidden" name="findingId" value={desk.finding.id} />
                <Label>
                  Comment
                  <Textarea name="body" required placeholder="What changed on site?" />
                </Label>
                <SubmitButton busyLabel="Saving…">Add comment</SubmitButton>
              </form>
            </Panel>
          </section>

          <section>
            <h2 className="font-display text-title">Evidence</h2>
            {evidence.length === 0 ? (
              <EmptyState title="No photos">Attach a photo from this finding.</EmptyState>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {evidence.map((row) => (
                  <li key={row.id} className="surface p-3">
                    {row.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.url}
                        alt={row.caption ?? "Finding evidence"}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <p className="text-ui text-muted">Photo unavailable.</p>
                    )}
                    {row.caption ? <p className="mt-2 text-ui">{row.caption}</p> : null}
                  </li>
                ))}
              </ul>
            )}
            <Panel className="mt-4">
              <form action={attachFindingEvidenceAction} className="space-y-3">
                <input type="hidden" name="findingId" value={desk.finding.id} />
                <Label>
                  Photo
                  <Input name="file" type="file" accept="image/*" required />
                </Label>
                <Label>
                  Caption
                  <Input name="caption" placeholder="Optional" />
                </Label>
                <SubmitButton busyLabel="Uploading…">Attach evidence</SubmitButton>
              </form>
            </Panel>
          </section>
        </div>
        <aside className="space-y-4">
          <Panel>
            <h2 className="font-display text-title">Status</h2>
            <p className="mt-2 text-ui text-muted">
              Inspectors cannot close a finding. Reviewers verify and reopen.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {next.map((status) => {
                const allowed =
                  status === "closed"
                    ? canVerifyFinding(role)
                    : status === "reopened"
                      ? canReopenFinding(role)
                      : canAdvancePortalFinding(role);
                if (!allowed) return null;
                return (
                  <form key={status} action={transitionFindingAction}>
                    <input type="hidden" name="findingId" value={desk.finding.id} />
                    <input type="hidden" name="to" value={status} />
                    <SubmitButton size="sm" busyLabel="Updating…">
                      {status.replaceAll("_", " ")}
                    </SubmitButton>
                  </form>
                );
              })}
            </div>
            {!canVerifyFinding(role) && from === "ready_for_review" ? (
              <Notice className="mt-3">You cannot close this finding.</Notice>
            ) : null}
          </Panel>
        </aside>
      </div>
    </article>
  );
}
