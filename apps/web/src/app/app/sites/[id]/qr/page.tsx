import { notFound, redirect } from "next/navigation";
import { DeniedState, EmptyState, PageHeader, StatusStamp } from "@inspectstack/ui";
import { ActionLink } from "@/components/action-link";
import { PrintButton } from "@/components/print-button";
import { getSiteDesk } from "@inspectstack/db";
import { canViewSites, qrLaunchPath } from "@inspectstack/domain";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { qrDataUrl } from "@/lib/qr-image";
import { readPublicEnv } from "@inspectstack/config";

export default async function SiteQrSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canViewSites(session.session.active.role)) {
    return <DeniedState>QR labels stay with field staff.</DeniedState>;
  }
  const { id } = await params;
  const desk = await getSiteDesk(
    getDb(),
    { organizationId: session.session.active.organizationId },
    id,
  );
  if (!desk) notFound();
  const origin = readPublicEnv().NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
  const labels = await Promise.all(
    desk.assets
      .filter((asset) => asset.qrToken && !asset.archivedAt)
      .map(async (asset) => {
        const path = qrLaunchPath(asset.qrToken!);
        const url = `${origin.replace(/\/$/, "")}${path}`;
        return {
          asset,
          url,
          image: await qrDataUrl(url),
        };
      }),
  );

  return (
    <article>
      <PageHeader
        kicker={
          <p className="font-mono text-micro uppercase tracking-id text-muted">
            {desk.site.externalId ?? "SITE"}
          </p>
        }
        title={`QR labels · ${desk.site.name}`}
        description="Print and stick. Scanning opens the matching asset in this workspace. Another workspace sees nothing."
        actions={
          <span className="flex flex-wrap gap-2 no-print">
            <PrintButton />
            <ActionLink href={`/app/sites/${desk.site.id}`} pendingLabel="Opening site…">
              Site desk
            </ActionLink>
          </span>
        }
        className="no-print"
      />
      {labels.length === 0 ? (
        <EmptyState title="No labels">Add an asset on this site to print a QR sheet.</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {labels.map(({ asset, url, image }) => (
            <li key={asset.id} className="surface ticket-rail break-inside-avoid p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-micro uppercase tracking-id text-muted">
                  {asset.externalId ?? "ASSET"}
                </p>
                <StatusStamp tone="ink">{asset.qrToken ?? ""}</StatusStamp>
              </div>
              <h2 className="mt-2 font-display text-title">{asset.name}</h2>
              <p className="text-ui text-muted">{desk.site.name}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={`QR for ${asset.name}`}
                className="mx-auto my-3 h-40 w-40"
                width={160}
                height={160}
              />
              <p className="font-mono text-micro break-all text-muted">{url}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
