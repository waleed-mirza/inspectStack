import { notFound, redirect } from "next/navigation";
import { DeniedState, PageHeader, StatusStamp } from "@inspectstack/ui";
import { ActionLink } from "@/components/action-link";
import { canInspect, canManageTemplates, parseTemplateSchema } from "@inspectstack/domain";
import { getTemplate, listTemplateVersions } from "@inspectstack/db";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { PreviewForm } from "@/components/builder/preview-form";

export default async function TemplatePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  const role = session.session.active.role;
  if (!canManageTemplates(role) && !canInspect(role)) {
    return <DeniedState>You can view issued reports, not template previews.</DeniedState>;
  }

  const { id } = await params;
  const db = getDb();
  const org = { organizationId: session.session.active.organizationId };
  const template = await getTemplate(db, org, id);
  if (!template) notFound();
  const versions = await listTemplateVersions(db, org, template.id);
  const latest = versions[0];
  if (!latest) notFound();
  const schema = parseTemplateSchema(latest.schema);

  return (
    <article className="mx-auto max-w-[36rem] space-y-4">
      <PageHeader
        kicker={
          <p className="font-mono text-micro uppercase tracking-id text-muted">
            Preview · v{latest.version}
          </p>
        }
        title={template.name}
        description="Answers stay on this screen. Offline capture happens in the field runner."
        actions={
          canManageTemplates(role) ? (
            <ActionLink href={`/app/templates/${template.id}`} size="sm">
              Back to builder
            </ActionLink>
          ) : null
        }
      />
      <StatusStamp tone={latest.status === "published" ? "pass" : "queued"}>
        {latest.status}
      </StatusStamp>
      <PreviewForm schema={schema} title="Inspector view" />
    </article>
  );
}
