import { notFound, redirect } from "next/navigation";
import { DeniedState } from "@inspectstack/ui";
import { canManageTemplates, parseTemplateSchema } from "@inspectstack/domain";
import {
  countInspectionsForVersion,
  getTemplate,
  listTemplateLibrary,
  listTemplateVersions,
} from "@inspectstack/db";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { TemplateBuilder } from "@/components/builder/template-builder";

export default async function TemplateBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; reason?: string; published?: string }>;
}) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canManageTemplates(session.session.active.role)) {
    return <DeniedState>Inspectors see a read-only preview, not this chrome.</DeniedState>;
  }

  const { id } = await params;
  const query = await searchParams;
  const db = getDb();
  const org = { organizationId: session.session.active.organizationId };
  const template = await getTemplate(db, org, id);
  if (!template) notFound();

  const versions = await listTemplateVersions(db, org, template.id);
  const latest = versions[0];
  if (!latest) notFound();

  const library = await listTemplateLibrary(db, org);
  const row = library.find((item) => item.id === template.id);
  const versionInspectionCount = await countInspectionsForVersion(db, org, latest.id);

  const publishError =
    query.error === "publish"
      ? query.reason
        ? decodeURIComponent(query.reason)
        : "Could not publish this draft."
      : query.error === "rename"
        ? "Template needs a name."
        : null;

  return (
    <TemplateBuilder
      template={{
        id: template.id,
        name: template.name,
        packKey: template.packKey,
        archivedAt: template.archivedAt,
      }}
      version={{
        id: latest.id,
        version: latest.version,
        status: latest.status,
        schema: parseTemplateSchema(latest.schema),
      }}
      inspectionCount={row?.inspectionCount ?? 0}
      versionInspectionCount={versionInspectionCount}
      versions={versions.map((item) => ({
        id: item.id,
        version: item.version,
        status: item.status,
      }))}
      publishError={publishError}
      published={query.published === "1"}
    />
  );
}
