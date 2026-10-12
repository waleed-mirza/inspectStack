import { StatusStamp, SubmitButton } from "@inspectstack/ui";
import { impersonationBannerCopy } from "@inspectstack/domain";
import { stopImpersonationAction } from "@/lib/actions/admin";

export function ImpersonationBanner(props: {
  organizationName: string;
  targetEmail?: string | null;
  reason: string;
}) {
  const copy = impersonationBannerCopy(props);
  return (
    <div className="border-b border-ink bg-ticket">
      <div className="page-shell flex flex-wrap items-center gap-3 py-2">
        <StatusStamp tone="queued">Viewing</StatusStamp>
        <p className="min-w-0 flex-1 text-ui">
          <span className="font-medium text-ink">{copy.title}</span>
          <span className="text-muted"> — {copy.detail}</span>
        </p>
        <form action={stopImpersonationAction}>
          <SubmitButton size="sm" busyLabel="Stopping…">
            Stop viewing
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
