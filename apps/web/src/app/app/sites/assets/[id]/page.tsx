import { notFound, redirect } from "next/navigation";
import {
  DeniedState,
  EmptyState,
  Input,
  Label,
  Notice,
  PageHeader,
  Panel,
  Select,
  StatusStamp,
  SubmitButton,
} from "@inspectstack/ui";
import { ActionLink, TicketLink } from "@/components/action-link";
import { getAssetDesk, listOrgMembers, listPublishedTemplateVersions } from "@inspectstack/db";
import { canAssignFromSite, canInspect, canManageSites, canViewSites } from "@inspectstack/domain";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { archiveAssetAction, assignInspectionAction, updateAssetAction } from "@/lib/actions/sites";
import { siteErrorMessage } from "@/lib/ops-copy";

export default async function AssetDeskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canViewSites(session.session.active.role)) {
    return <DeniedState>Client viewers use the actions portal.</DeniedState>;
  }
  const { id } = await params;
  const query = await searchParams;
  const db = getDb();
  const org = { organizationId: session.session.active.organizationId };
  const desk = await getAssetDesk(db, org, id);
  if (!desk) notFound();
  const manage = canManageSites(session.session.active.role);
  const assign = canAssignFromSite(session.session.active.role);
  const [members, templates] = await Promise.all([
    listOrgMembers(db, org),
    listPublishedTemplateVersions(db, org),
  ]);
  const inspectors = members.filter((member) => canInspect(member.role));
  const error = siteErrorMessage(query.error);

  return (
    <article>
      <PageHeader
        kicker={
          <p className="font-mono text-micro uppercase tracking-id text-muted">
            {desk.asset.qrToken ?? desk.asset.externalId ?? "ASSET"}
          </p>
        }
        title={desk.asset.name}
        description={`${desk.site.name}${desk.site.addressLine ? ` · ${desk.site.addressLine}` : ""}`}
        actions={
          <ActionLink href={`/app/sites/${desk.site.id}`} pendingLabel="Opening site…">
            Site desk
          </ActionLink>
        }
      />
      {error ? <Notice tone="fail">{error}</Notice> : null}
      {query.saved ? <Notice tone="pass">Asset saved.</Notice> : null}
      <div className="mb-6 flex flex-wrap gap-2">
        {desk.asset.tags.map((tag) => (
          <StatusStamp key={tag} tone="muted">
            {tag}
          </StatusStamp>
        ))}
        {desk.asset.archivedAt ? <StatusStamp tone="fail">Archived</StatusStamp> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section>
            <h2 className="font-display text-title">History</h2>
            {desk.history.length === 0 ? (
              <EmptyState title="No inspections">
                Assign a job from this desk to start history.
              </EmptyState>
            ) : (
              <ul className="mt-3 grid gap-3">
                {desk.history.map((job) => (
                  <li key={job.id}>
                    <TicketLink
                      href={`/app/inspections/${job.id}`}
                      number={job.number}
                      title={job.status.replaceAll("_", " ")}
                      stamp={job.status.replaceAll("_", " ")}
                      tone={
                        job.status === "approved"
                          ? "pass"
                          : job.status === "returned"
                            ? "fail"
                            : "queued"
                      }
                      meta={
                        job.inspectorName
                          ? `${job.inspectorName}${job.dueAt ? ` · due ${job.dueAt.toISOString().slice(0, 10)}` : ""}`
                          : "Unassigned"
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className="space-y-4">
          {assign && !desk.asset.archivedAt ? (
            <Panel>
              <h2 className="font-display text-title">Assign inspection</h2>
              <form action={assignInspectionAction} className="mt-3 space-y-3">
                <input type="hidden" name="siteId" value={desk.site.id} />
                <input type="hidden" name="assetId" value={desk.asset.id} />
                <input type="hidden" name="returnTo" value={`/app/sites/assets/${desk.asset.id}`} />
                <Label>
                  Template
                  <Select
                    name="templateVersionId"
                    required
                    defaultValue={templates[0]?.versionId ?? ""}
                  >
                    {templates.map((row) => (
                      <option key={row.versionId} value={row.versionId}>
                        {row.templateName} v{row.version}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  Inspector
                  <Select name="assignedToUserId" defaultValue="">
                    <option value="">Unassigned</option>
                    {inspectors.map((member) => (
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
                <SubmitButton variant="primary" className="w-full" busyLabel="Assigning…">
                  Assign
                </SubmitButton>
              </form>
            </Panel>
          ) : null}
          {manage ? (
            <Panel>
              <h2 className="font-display text-title">Asset details</h2>
              <form action={updateAssetAction} className="mt-3 space-y-3">
                <input type="hidden" name="assetId" value={desk.asset.id} />
                <input type="hidden" name="siteId" value={desk.site.id} />
                <Label>
                  Name
                  <Input name="name" required defaultValue={desk.asset.name} />
                </Label>
                <Label>
                  External id
                  <Input
                    name="externalId"
                    className="font-mono"
                    defaultValue={desk.asset.externalId ?? ""}
                  />
                </Label>
                <Label>
                  Tags
                  <Input name="tags" defaultValue={desk.asset.tags.join(", ")} />
                </Label>
                <SubmitButton className="w-full" busyLabel="Saving…">
                  Save asset
                </SubmitButton>
              </form>
              <form action={archiveAssetAction} className="mt-3">
                <input type="hidden" name="assetId" value={desk.asset.id} />
                <input type="hidden" name="siteId" value={desk.site.id} />
                <SubmitButton variant="danger" className="w-full" busyLabel="Archiving…">
                  Archive asset
                </SubmitButton>
              </form>
            </Panel>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
