import { redirect } from "next/navigation";
import { canInspect } from "@inspectstack/domain";
import { DeniedState } from "@inspectstack/ui";
import { requireSession } from "@/lib/session";
import { RunnerApp } from "@/components/runner/runner-app";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  const { id } = await params;

  if (!canInspect(session.session.active.role)) {
    return (
      <div className="p-5">
        <DeniedState>
          Inspectors and admins capture answers. This role cannot open the field runner.
        </DeniedState>
      </div>
    );
  }

  const branding = session.session.active.branding as { logoUrl?: string | null } | null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <RunnerApp
        inspectionId={id}
        organizationId={session.session.active.organizationId}
        userId={session.session.user.id}
        organizationName={session.session.active.organizationName}
        logoUrl={branding?.logoUrl}
      />
    </div>
  );
}
