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
import {
  getSiteDesk,
  listOrgMembers,
  listPublishedTemplateVersions,
  listSitesTree,
} from "@inspectstack/db";
import { canAssignFromSite, canInspect, canManageSites, canViewSites } from "@inspectstack/domain";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  archiveSiteAction,
  assignInspectionAction,
  createAssetAction,
  updateSiteAction,
} from "@/lib/actions/sites";
import { siteErrorMessage } from "@/lib/ops-copy";

export default async function SiteDeskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; archived?: string }>;
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
  const desk = await getSiteDesk(db, org, id);
  if (!desk) notFound();
  const manage = canManageSites(session.session.active.role);
  const assign = canAssignFromSite(session.session.active.role);
  const [members, templates, tree] = await Promise.all([
    listOrgMembers(db, org),
    listPublishedTemplateVersions(db, org),
    listSitesTree(db, org),
  ]);
  const inspectors = members.filter((member) => canInspect(member.role));
  const error = siteErrorMessage(query.error);
  const crumb = [...desk.ancestors.map((row) => row.name), desk.site.name].join(" / ");

  return (
    <article>
      <PageHeader
        kicker={
          <p className="font-mono text-micro uppercase tracking-id text-muted">
            {desk.site.externalId ?? "SITE"}
          </p>
        }
        title={desk.site.name}
        description={crumb}
        actions={
          <ActionLink href={`/app/sites/${desk.site.id}/qr`} pendingLabel="Opening labels…">
            Print QR sheet
          </ActionLink>
        }
      />
      {error ? <Notice tone="fail">{error}</Notice> : null}
      {query.saved ? <Notice tone="pass">Site saved.</Notice> : null}
      {query.archived ? <Notice>Archived item hidden from the tree.</Notice> : null}
      <div className="mb-6 flex flex-wrap gap-2">
        {desk.site.tags.map((tag) => (
          <StatusStamp key={tag} tone="muted">
            {tag}
          </StatusStamp>
        ))}
        {desk.site.archivedAt ? <StatusStamp tone="fail">Archived</StatusStamp> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section>
            <h2 className="font-display text-title">Assets</h2>
            {desk.assets.length === 0 ? (
              <EmptyState title="No assets">Add an asset or print ids from this desk.</EmptyState>
            ) : (
              <ul className="mt-3 grid gap-3">
                {desk.assets.map((asset) => (
                  <li key={asset.id}>
                    <TicketLink
                      href={`/app/sites/assets/${asset.id}`}
                      number={asset.externalId ?? asset.qrToken ?? "ASSET"}
                      title={asset.name}
                      stamp={asset.qrToken ?? "No QR"}
                      tone="ink"
                      meta={asset.tags.join(", ") || "No tags"}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {desk.children.length > 0 ? (
            <section>
              <h2 className="font-display text-title">Child sites</h2>
              <ul className="mt-3 grid gap-3">
                {desk.children.map((child) => (
                  <li key={child.id}>
                    <TicketLink
                      href={`/app/sites/${child.id}`}
                      number={child.externalId ?? "SITE"}
                      title={child.name}
                      stamp="Child"
                      tone="muted"
                      meta={child.addressLine ?? "No address"}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="font-display text-title">History</h2>
            {desk.history.length === 0 ? (
              <p className="mt-2 text-ui text-muted">No inspections on this site yet.</p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {desk.history.map((job) => (
                  <li key={job.id}>
                    <TicketLink
                      href={`/app/inspections/${job.id}`}
                      number={job.number}
                      title={job.assetName ?? desk.site.name}
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
          {assign ? (
            <Panel>
              <h2 className="font-display text-title">Assign inspection</h2>
              <form action={assignInspectionAction} className="mt-3 space-y-3">
                <input type="hidden" name="siteId" value={desk.site.id} />
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
                  Asset
                  <Select name="assetId" defaultValue="">
                    <option value="">Whole site</option>
                    {desk.assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name}
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
            <>
              <Panel>
                <h2 className="font-display text-title">Add asset</h2>
                <form action={createAssetAction} className="mt-3 space-y-3">
                  <input type="hidden" name="siteId" value={desk.site.id} />
                  <Label>
                    Name
                    <Input name="name" required placeholder="Living smoke alarm" />
                  </Label>
                  <Label>
                    External id
                    <Input name="externalId" className="font-mono" placeholder="smoke-living" />
                  </Label>
                  <Label>
                    Tags
                    <Input name="tags" placeholder="life-safety" />
                  </Label>
                  <SubmitButton className="w-full" busyLabel="Saving…">
                    Add asset
                  </SubmitButton>
                </form>
              </Panel>
              <Panel>
                <h2 className="font-display text-title">Site details</h2>
                <form action={updateSiteAction} className="mt-3 space-y-3">
                  <input type="hidden" name="siteId" value={desk.site.id} />
                  <Label>
                    Name
                    <Input name="name" required defaultValue={desk.site.name} />
                  </Label>
                  <Label>
                    Address
                    <Input name="addressLine" defaultValue={desk.site.addressLine ?? ""} />
                  </Label>
                  <Label>
                    Parent
                    <Select name="parentId" defaultValue={desk.site.parentId ?? ""}>
                      <option value="">Top level</option>
                      {tree.sites
                        .filter((row) => row.id !== desk.site.id)
                        .map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.name}
                          </option>
                        ))}
                    </Select>
                  </Label>
                  <Label>
                    External id
                    <Input
                      name="externalId"
                      className="font-mono"
                      defaultValue={desk.site.externalId ?? ""}
                    />
                  </Label>
                  <Label>
                    Tags
                    <Input name="tags" defaultValue={desk.site.tags.join(", ")} />
                  </Label>
                  <SubmitButton className="w-full" busyLabel="Saving…">
                    Save site
                  </SubmitButton>
                </form>
                <form action={archiveSiteAction} className="mt-3">
                  <input type="hidden" name="siteId" value={desk.site.id} />
                  <SubmitButton variant="danger" className="w-full" busyLabel="Archiving…">
                    Archive site
                  </SubmitButton>
                </form>
              </Panel>
            </>
          ) : (
            <Panel>
              <p className="text-ui text-muted">
                Inspectors can open history. Adding sites or assets is an admin action.
              </p>
            </Panel>
          )}
        </aside>
      </div>
    </article>
  );
}
