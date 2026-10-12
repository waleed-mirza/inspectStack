import { redirect } from "next/navigation";
import { canInspect } from "@inspectstack/domain";
import { DeniedState } from "@inspectstack/ui";
import { requireSession } from "@/lib/session";
import { RecoveryScreen } from "@/components/runner/recovery-screen";

export default async function RecoveryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  const { id } = await params;

  if (!canInspect(session.session.active.role)) {
    return (
      <div className="p-5">
        <DeniedState>This role cannot export or retry field records.</DeniedState>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <RecoveryScreen
        inspectionId={id}
        scope={{
          organizationId: session.session.active.organizationId,
          userId: session.session.user.id,
        }}
      />
    </div>
  );
}
