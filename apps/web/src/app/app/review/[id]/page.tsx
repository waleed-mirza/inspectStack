import { notFound, redirect } from "next/navigation";
import {
  DeniedState,
  Input,
  Label,
  Notice,
  PageHeader,
  Panel,
  Select,
  StatusStamp,
  SubmitButton,
  Textarea,
} from "@inspectstack/ui";
import { ActionLink } from "@/components/action-link";
import { getReviewDesk } from "@inspectstack/db";
import {
  FINDING_SEVERITIES,
  FINDING_TRANSITIONS,
  canReview,
  formatAnswerDisplay,
  listFields,
} from "@inspectstack/domain";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  approveInspectionAction,
  createFindingAction,
  returnInspectionAction,
  updateFindingAction,
} from "@/lib/actions/review";

function errorMessage(code: string | undefined) {
  if (code === "denied") return "Inspectors cannot approve their own work.";
  if (code === "incomplete")
    return "Required evidence is still missing. Return the job or wait for a resubmit.";
  if (code === "not_submitted") return "Only submitted inspections can be approved or returned.";
  if (code === "already_approved") return "Already approved. The issued report was not duplicated.";
  if (code === "invalid_transition") return "That finding status change is not allowed.";
  if (code === "finding") return "Finding could not be saved.";
  return null;
}

export default async function ReviewDeskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; returned?: string }>;
}) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canReview(session.session.active.role)) {
    return <DeniedState>Only reviewers, admins, and owners can open the review desk.</DeniedState>;
  }
  const { id } = await params;
  const query = await searchParams;
  const desk = await getReviewDesk(
    getDb(),
    { organizationId: session.session.active.organizationId },
    id,
  );
  if (!desk) notFound();

  const job = desk.inspection;
  const error = errorMessage(query.error);
  const canDecide = job.status === "submitted";

  return (
    <article>
      <PageHeader
        kicker={
          <p className="font-mono text-micro uppercase tracking-id text-muted">{job.number}</p>
        }
        title={desk.siteName ?? "Review desk"}
        description={`${desk.templateName} v${desk.templateVersion}${desk.inspectorName ? ` · Inspector ${desk.inspectorName}` : ""}`}
        actions={
          <ActionLink href={`/app/inspections/${job.id}`} pendingLabel="Opening ticket…">
            Ticket
          </ActionLink>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <StatusStamp
          tone={job.status === "returned" ? "fail" : job.status === "approved" ? "pass" : "queued"}
        >
          {job.status.replaceAll("_", " ")}
        </StatusStamp>
        {desk.issues.length > 0 ? (
          <StatusStamp tone="fail">{`${desk.issues.length} incomplete`}</StatusStamp>
        ) : (
          <StatusStamp tone="pass">Complete</StatusStamp>
        )}
      </div>
      {error ? <Notice tone="fail">{error}</Notice> : null}
      {query.returned ? (
        <Notice tone="pass">Returned to the inspector with your note.</Notice>
      ) : null}
      {job.reviewNote ? <Notice className="mb-4">Return note: {job.reviewNote}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          <section>
            <h2 className="font-display text-title">Exceptions</h2>
            {desk.issues.length === 0 ? (
              <p className="mt-2 text-ui text-muted">Required answers and evidence are present.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {desk.issues.map((issue) => (
                  <li key={`${issue.fieldId}-${issue.code}`}>
                    <Panel className="border-fail p-3 text-ui">{issue.message}</Panel>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-display text-title">Answers</h2>
            {desk.schema.sections.map((section) => (
              <Panel key={section.id} className="mt-3">
                <h3 className="font-display text-title">{section.title}</h3>
                <dl className="mt-2 space-y-1">
                  {section.fields
                    .filter((field) => field.type !== "computed")
                    .map((field) => (
                      <div key={field.id} className="grid grid-cols-2 gap-2 text-ui">
                        <dt className="text-muted">{field.label}</dt>
                        <dd>
                          {formatAnswerDisplay(
                            field,
                            desk.responses[field.key] ?? desk.responses[field.id],
                          )}
                        </dd>
                      </div>
                    ))}
                </dl>
              </Panel>
            ))}
          </section>

          <section>
            <h2 className="font-display text-title">Findings</h2>
            {desk.findings.length === 0 ? (
              <p className="mt-2 text-ui text-muted">
                No findings yet. Add one if the answers missed a defect.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {desk.findings.map((finding) => {
                  const next = FINDING_TRANSITIONS[finding.status];
                  return (
                    <li key={finding.id}>
                      <Panel>
                        <form action={updateFindingAction} className="space-y-3">
                          <input type="hidden" name="inspectionId" value={job.id} />
                          <input type="hidden" name="findingId" value={finding.id} />
                          <input type="hidden" name="intent" value="save" />
                          <div className="flex items-center justify-between gap-2">
                            <Label className="mt-0">
                              Title
                              <Input name="title" defaultValue={finding.title} className="mt-1" />
                            </Label>
                            <StatusStamp tone={finding.severity === "high" ? "fail" : "ink"}>
                              {finding.status.replaceAll("_", " ")}
                            </StatusStamp>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Label>
                              Severity
                              <Select name="severity" defaultValue={finding.severity}>
                                {FINDING_SEVERITIES.map((value) => (
                                  <option key={value} value={value}>
                                    {value}
                                  </option>
                                ))}
                              </Select>
                            </Label>
                            <Label>
                              Owner
                              <Select name="ownerUserId" defaultValue={finding.ownerUserId ?? ""}>
                                <option value="">Unassigned</option>
                                {desk.members.map((member) => (
                                  <option key={member.userId} value={member.userId}>
                                    {member.displayName}
                                  </option>
                                ))}
                              </Select>
                            </Label>
                            <Label>
                              Due
                              <Input
                                type="date"
                                name="dueAt"
                                defaultValue={
                                  finding.dueAt ? finding.dueAt.toISOString().slice(0, 10) : ""
                                }
                              />
                            </Label>
                          </div>
                          <Label>
                            Notes
                            <Textarea name="notes" defaultValue={finding.notes ?? ""} />
                          </Label>
                          <SubmitButton size="sm" busyLabel="Saving…">
                            Save finding
                          </SubmitButton>
                        </form>
                        {next.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {next.map((status) => (
                              <form key={status} action={updateFindingAction}>
                                <input type="hidden" name="inspectionId" value={job.id} />
                                <input type="hidden" name="findingId" value={finding.id} />
                                <input type="hidden" name="intent" value={status} />
                                <SubmitButton size="sm" busyLabel="Updating…">
                                  {status.replaceAll("_", " ")}
                                </SubmitButton>
                              </form>
                            ))}
                          </div>
                        ) : null}
                      </Panel>
                    </li>
                  );
                })}
              </ul>
            )}
            <Panel className="mt-4">
              <h3 className="font-display text-title">Add finding</h3>
              <form action={createFindingAction} className="mt-3 space-y-3">
                <input type="hidden" name="inspectionId" value={job.id} />
                <Label>
                  Title
                  <Input name="title" required />
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Label>
                    Severity
                    <Select name="severity" defaultValue="medium">
                      {FINDING_SEVERITIES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </Select>
                  </Label>
                  <Label>
                    Owner
                    <Select name="ownerUserId" defaultValue="">
                      <option value="">Unassigned</option>
                      {desk.members.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.displayName}
                        </option>
                      ))}
                    </Select>
                  </Label>
                  <Label>
                    Due
                    <Input type="date" name="dueAt" />
                  </Label>
                </div>
                <Label>
                  Notes
                  <Textarea name="notes" />
                </Label>
                <SubmitButton size="sm" busyLabel="Adding…">
                  Add finding
                </SubmitButton>
              </form>
            </Panel>
          </section>
        </div>

        <aside className="space-y-4">
          {canDecide ? (
            <>
              <Panel>
                <h2 className="font-display text-title">Approve</h2>
                <p className="mt-2 text-ui text-muted">
                  Issues the snapshot and branded PDF. Inspectors cannot approve their own work.
                </p>
                <form action={approveInspectionAction} className="mt-3">
                  <input type="hidden" name="inspectionId" value={job.id} />
                  <SubmitButton variant="primary" className="w-full" busyLabel="Issuing report…">
                    Approve and issue report
                  </SubmitButton>
                </form>
              </Panel>
              <Panel>
                <h2 className="font-display text-title">Return</h2>
                <form action={returnInspectionAction} className="mt-3 space-y-3">
                  <input type="hidden" name="inspectionId" value={job.id} />
                  <Label>
                    Note to inspector
                    <Textarea name="note" required placeholder="What needs to be corrected?" />
                  </Label>
                  <SubmitButton className="w-full" busyLabel="Returning…">
                    Return to inspector
                  </SubmitButton>
                </form>
              </Panel>
            </>
          ) : (
            <Panel>
              <p className="text-ui text-muted">
                {job.status === "approved"
                  ? "Approved. Open Reports for the issued snapshot."
                  : "Waiting on the inspector. Approve is available after the next submit."}
              </p>
              {desk.liveSnapshot ? (
                <ActionLink
                  href={`/app/reports/${desk.liveSnapshot.id}`}
                  variant="primary"
                  className="mt-3 w-full"
                  pendingLabel="Opening report…"
                >
                  Open issued report
                </ActionLink>
              ) : null}
            </Panel>
          )}
          <Panel>
            <h2 className="font-display text-title">Audit</h2>
            {desk.audit.length === 0 ? (
              <p className="mt-2 text-ui text-muted">No events yet.</p>
            ) : (
              <ol className="mt-2 space-y-2 text-ui">
                {desk.audit.map((event) => (
                  <li key={event.id}>
                    <span className="font-mono text-micro uppercase tracking-id text-muted">
                      {event.createdAt.toISOString().slice(11, 16)}
                    </span>{" "}
                    {event.actorName ?? "System"} · {event.action.replaceAll(".", " ")}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          <p className="text-ui text-muted">
            Template fields: {listFields(desk.schema).length}. Evidence photos: {desk.media.length}.
          </p>
        </aside>
      </div>
    </article>
  );
}
