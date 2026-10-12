import { redirect } from "next/navigation";
import { DeniedState, Notice, PageHeader, Panel, StatusStamp } from "@inspectstack/ui";
import { ActionLink } from "@/components/action-link";
import { getAssetByQrToken, getAssetDesk } from "@inspectstack/db";
import {
  canViewSites,
  isFeatureEnabled,
  normalizeQrToken,
  planQrLaunch,
  qrLaunchDeniedMessage,
} from "@inspectstack/domain";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";

export default async function GoTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!isFeatureEnabled(session.session.active.featureFlags, "qrLaunch")) {
    return <DeniedState>QR launch is off for this workspace.</DeniedState>;
  }
  const { token: raw } = await params;
  const token = normalizeQrToken(decodeURIComponent(raw));
  const db = getDb();
  const asset = token ? await getAssetByQrToken(db, token) : null;
  const planned = planQrLaunch({
    authenticated: true,
    membershipOrgId: session.session.active.organizationId,
    asset,
  });

  if (!planned.ok) {
    return (
      <section>
        <PageHeader title="QR code" description="Scan results stay inside your workspace." />
        <DeniedState>{qrLaunchDeniedMessage(planned.error)}</DeniedState>
      </section>
    );
  }

  const desk = await getAssetDesk(
    db,
    { organizationId: session.session.active.organizationId },
    planned.assetId,
  );
  if (!desk) {
    return <DeniedState>{qrLaunchDeniedMessage("not_found")}</DeniedState>;
  }

  const canOpenTree = canViewSites(session.session.active.role);

  return (
    <section>
      <PageHeader
        kicker={
          <p className="font-mono text-micro uppercase tracking-id text-muted">
            {desk.asset.qrToken}
          </p>
        }
        title={desk.asset.name}
        description={`${desk.site.name}${desk.site.addressLine ? ` · ${desk.site.addressLine}` : ""}`}
      />
      <Notice tone="pass">This QR matches an asset in your workspace.</Notice>
      <Panel className="mt-4">
        <div className="flex flex-wrap gap-2">
          <StatusStamp tone="ink">{desk.asset.externalId ?? "asset"}</StatusStamp>
          {desk.asset.tags.map((tag) => (
            <StatusStamp key={tag} tone="muted">
              {tag}
            </StatusStamp>
          ))}
        </div>
        {canOpenTree ? (
          <ActionLink
            href={`/app/sites/assets/${desk.asset.id}`}
            variant="primary"
            className="mt-4"
            pendingLabel="Opening asset…"
          >
            Open asset
          </ActionLink>
        ) : (
          <p className="mt-4 text-ui text-muted">
            Ask field staff to assign an inspection from this asset.
          </p>
        )}
      </Panel>
    </section>
  );
}
