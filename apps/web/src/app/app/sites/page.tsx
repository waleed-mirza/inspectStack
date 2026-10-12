import { redirect } from "next/navigation";
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
import { listSitesTree } from "@inspectstack/db";
import { canManageSites, canViewSites, siteTreeChildren } from "@inspectstack/domain";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { createSiteAction } from "@/lib/actions/sites";
import { siteErrorMessage } from "@/lib/ops-copy";

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; archived?: string }>;
}) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canViewSites(session.session.active.role)) {
    return (
      <DeniedState>Client viewers use the actions portal. Sites stay with field staff.</DeniedState>
    );
  }
  const query = await searchParams;
  const manage = canManageSites(session.session.active.role);
  const tree = await listSitesTree(getDb(), {
    organizationId: session.session.active.organizationId,
  });
  const roots = siteTreeChildren(tree.sites, null);
  const error = siteErrorMessage(query.error);

  return (
    <section>
      <PageHeader
        title="Sites and assets"
        description="Harbour hierarchy, CSV-friendly ids, and history. QR labels print from a site desk."
        actions={
          <ActionLink href="/app/go" pendingLabel="Opening keypad…">
            Open a QR code
          </ActionLink>
        }
      />
      {error ? <Notice tone="fail">{error}</Notice> : null}
      {query.archived ? <Notice>Archived. Hidden from the tree.</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          {roots.length === 0 ? (
            <EmptyState title="No sites yet">
              Add a site to start. CSV-friendly ids are optional and unique in this workspace.
            </EmptyState>
          ) : (
            <ul className="grid gap-3">
              {roots.map((site) => (
                <SiteBranch
                  key={site.id}
                  site={site}
                  sites={tree.sites}
                  assets={tree.assets}
                  depth={0}
                />
              ))}
            </ul>
          )}
        </div>
        <aside>
          {manage ? (
            <Panel>
              <h2 className="font-display text-title">Add site</h2>
              <form action={createSiteAction} className="mt-3 space-y-3">
                <Label>
                  Name
                  <Input name="name" required placeholder="12 Harbour St" />
                </Label>
                <Label>
                  Address
                  <Input name="addressLine" placeholder="Optional" />
                </Label>
                <Label>
                  Parent
                  <Select name="parentId" defaultValue="">
                    <option value="">Top level</option>
                    {tree.sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  External id
                  <Input name="externalId" placeholder="NPG-HARBOUR" className="font-mono" />
                </Label>
                <Label>
                  Tags
                  <Input name="tags" placeholder="harbour, meters" />
                </Label>
                <SubmitButton variant="primary" className="w-full" busyLabel="Saving…">
                  Add site
                </SubmitButton>
              </form>
            </Panel>
          ) : (
            <Panel>
              <p className="text-ui text-muted">
                Inspectors can open sites and history. Adding or archiving is an admin action.
              </p>
            </Panel>
          )}
        </aside>
      </div>
    </section>
  );
}

type Tree = Awaited<ReturnType<typeof listSitesTree>>;

function SiteBranch({
  site,
  sites,
  assets,
  depth,
}: {
  site: Tree["sites"][number];
  sites: Tree["sites"];
  assets: Tree["assets"];
  depth: number;
}) {
  const children = siteTreeChildren(sites, site.id);
  const siteAssets = assets.filter((asset) => asset.siteId === site.id);
  return (
    <li style={{ marginLeft: depth ? `${depth * 12}px` : undefined }}>
      <TicketLink
        href={`/app/sites/${site.id}`}
        number={site.externalId ?? "SITE"}
        title={site.name}
        stamp={siteAssets.length === 1 ? "1 asset" : `${siteAssets.length} assets`}
        tone="ink"
        meta={
          <span className="flex flex-wrap items-center gap-2">
            {site.addressLine ? <span>{site.addressLine}</span> : <span>No address</span>}
            {site.tags.map((tag) => (
              <StatusStamp key={tag} tone="muted">
                {tag}
              </StatusStamp>
            ))}
          </span>
        }
      />
      {children.length > 0 ? (
        <ul className="mt-3 grid gap-3">
          {children.map((child) => (
            <SiteBranch
              key={child.id}
              site={child}
              sites={sites}
              assets={assets}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
