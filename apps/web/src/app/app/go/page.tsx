import { redirect } from "next/navigation";
import {
  DeniedState,
  Input,
  Label,
  Notice,
  PageHeader,
  Panel,
  SubmitButton,
} from "@inspectstack/ui";
import { QrScan } from "@/components/qr-scan";
import { isFeatureEnabled } from "@inspectstack/domain";
import { requireSession } from "@/lib/session";
import { submitQrCodeAction } from "@/lib/actions/go";

export default async function GoKeypadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!isFeatureEnabled(session.session.active.featureFlags, "qrLaunch")) {
    return <DeniedState>QR launch is off for this workspace.</DeniedState>;
  }
  const query = await searchParams;

  return (
    <section>
      <PageHeader
        title="Open a QR code"
        description="Type the code on the sticker, or scan it with the camera if this device allows."
      />
      {query.error === "empty" ? (
        <Notice tone="fail">Enter the code from the sticker.</Notice>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-title">Type the code</h2>
          <form action={submitQrCodeAction} className="mt-3 space-y-3">
            <Label>
              Sticker code
              <Input
                name="token"
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="ISQ-N4HRBR24"
                className="font-mono uppercase"
              />
            </Label>
            <SubmitButton variant="primary" className="w-full" busyLabel="Opening…">
              Open
            </SubmitButton>
          </form>
        </Panel>
        <Panel>
          <h2 className="font-display text-title">Camera</h2>
          <div className="mt-3">
            <QrScan />
          </div>
        </Panel>
      </div>
    </section>
  );
}
