import { redirect } from "next/navigation";
import {
  DeniedState,
  EmptyState,
  Input,
  Notice,
  PageHeader,
  Panel,
  StatusStamp,
  SubmitButton,
} from "@inspectstack/ui";
import { AppLink, TicketLink } from "@/components/action-link";
import { STARTER_PACKS, canManageTemplates } from "@inspectstack/domain";
import { listTemplateLibrary } from "@inspectstack/db";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  clonePackAction,
  cloneTemplateAction,
  createBlankTemplateAction,
  retireTemplateAction,
} from "@/lib/actions/templates";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; retired?: string }>;
}) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canManageTemplates(session.session.active.role)) {
    return <DeniedState>Template managers, admins, and owners can open the library.</DeniedState>;
  }
  const params = await searchParams;
  const rows = await listTemplateLibrary(getDb(), {
    organizationId: session.session.active.organizationId,
  });
  const active = rows.filter((row) => !row.archivedAt);
  const retired = rows.filter((row) => row.archivedAt);

  const error =
    params.error === "name"
      ? "Name the template before creating it."
      : params.error === "pack"
        ? "That starter pack is not available."
        : params.error === "clone"
          ? "Could not clone that template in this workspace."
          : params.error === "retire"
            ? "Could not retire that template."
            : params.error === "draft"
              ? "Could not open a draft."
              : null;

  return (
    <section>
      <PageHeader
        title="Templates"
        description="Clone a starter pack or start blank. Published versions stay locked for jobs already in the field."
      />
      {error ? <Notice tone="fail">{error}</Notice> : null}
      {params.retired ? (
        <Notice tone="ink">Template retired. Existing inspections keep their version.</Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <form
            action={createBlankTemplateAction}
            className="surface flex flex-wrap items-end gap-3 p-4"
          >
            <div className="min-w-48 flex-1">
              <label
                htmlFor="name"
                className="block text-label font-medium tracking-label text-muted"
              >
                New blank template
              </label>
              <Input id="name" name="name" required placeholder="e.g. Bedroom snag list" />
            </div>
            <SubmitButton variant="primary" busyLabel="Creating…">
              Create draft
            </SubmitButton>
          </form>

          {active.length === 0 ? (
            <EmptyState title="No templates yet">
              Clone a starter pack or add a section after creating a blank draft.
            </EmptyState>
          ) : (
            <ul className="grid gap-3">
              {active.map((row) => {
                const stamp = row.latestStatus?.replaceAll("_", " ") ?? "empty";
                const tone =
                  row.latestStatus === "published"
                    ? "pass"
                    : row.latestStatus === "draft"
                      ? "queued"
                      : "muted";
                return (
                  <li key={row.id}>
                    <TicketLink
                      href={`/app/templates/${row.id}`}
                      number={row.packKey ?? row.slug}
                      title={row.name}
                      stamp={stamp}
                      tone={tone}
                      meta={
                        <>
                          v{row.latestVersion ?? 0}
                          {row.inspectionCount > 0
                            ? ` · ${row.inspectionCount} job${row.inspectionCount === 1 ? " uses" : "s use"} this`
                            : " · not used by a job yet"}
                        </>
                      }
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action={cloneTemplateAction}>
                        <input type="hidden" name="templateId" value={row.id} />
                        <SubmitButton size="sm" busyLabel="Cloning…">
                          Clone
                        </SubmitButton>
                      </form>
                      <form action={retireTemplateAction}>
                        <input type="hidden" name="templateId" value={row.id} />
                        <SubmitButton size="sm" variant="danger" busyLabel="Retiring…">
                          Retire
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {retired.length > 0 ? (
            <div>
              <h2 className="font-display text-title">Retired</h2>
              <ul className="mt-3 grid gap-3">
                {retired.map((row) => (
                  <li key={row.id}>
                    <Panel className="ticket-rail">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-title">{row.name}</h3>
                        <StatusStamp tone="muted">retired</StatusStamp>
                      </div>
                      <p className="mt-1 text-ui text-muted">
                        Historical jobs keep the published version they used.
                      </p>
                      <AppLink className="mt-2 text-ui underline" href={`/app/templates/${row.id}`}>
                        Open read-only
                      </AppLink>
                    </Panel>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="space-y-3">
          <h2 className="font-display text-title">Starter packs</h2>
          {STARTER_PACKS.map((pack) => (
            <Panel key={pack.key} className="ticket-rail">
              <p className="font-mono text-micro uppercase tracking-id text-muted">{pack.key}</p>
              <h3 className="mt-1 font-display text-title">{pack.name}</h3>
              <p className="mt-1 text-ui text-muted">{pack.description}</p>
              <form action={clonePackAction} className="mt-3">
                <input type="hidden" name="packKey" value={pack.key} />
                <SubmitButton variant="primary" size="sm" busyLabel="Cloning pack…">
                  Clone pack
                </SubmitButton>
              </form>
            </Panel>
          ))}
        </aside>
      </div>
    </section>
  );
}
