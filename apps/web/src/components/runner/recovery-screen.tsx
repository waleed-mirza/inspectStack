"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  EmptyState,
  LoadingState,
  Notice,
  PageHeader,
  Panel,
  StatusStamp,
} from "@inspectstack/ui";
import { AppLink } from "@/components/action-link";
import {
  buildSupportBundle,
  downloadSupportBundle,
  estimateDeviceStorage,
  listMediaBlobs,
  listQueuedOperations,
  retryFailed,
  type MediaBlobRecord,
  type OfflineScope,
  type OperationRecord,
} from "@/lib/offline";

export function RecoveryScreen({
  inspectionId,
  scope,
}: {
  inspectionId: string;
  scope: OfflineScope;
}) {
  const [ops, setOps] = useState<OperationRecord[]>([]);
  const [media, setMedia] = useState<MediaBlobRecord[]>([]);
  const [storage, setStorage] = useState<Awaited<ReturnType<typeof estimateDeviceStorage>>>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const [nextOps, nextMedia, nextStorage] = await Promise.all([
      listQueuedOperations(scope, inspectionId),
      listMediaBlobs(scope, inspectionId),
      estimateDeviceStorage(),
    ]);
    setOps(nextOps);
    setMedia(nextMedia);
    setStorage(nextStorage);
    setReady(true);
  }, [inspectionId, scope]);

  // The initial IndexedDB read hydrates this client component after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  if (!ready) return <LoadingState label="Reading queued records…" />;

  const pending = ops.filter((row) => row.status !== "sending");
  const failedMedia = media.filter((row) => row.uploadStatus !== "synced");

  return (
    <div className="mx-auto flex min-h-full max-w-[32rem] flex-col px-5 py-4">
      <PageHeader
        title="Recovery"
        description="Queued answers stay on this phone until they sync. Retry failed items or export hashes for support."
        actions={
          <AppLink href={`/app/run/${inspectionId}`} className="text-ui underline">
            Back to runner
          </AppLink>
        }
      />
      {storage?.low ? (
        <Notice tone="fail" className="mb-4">
          This device is low on storage. Sync soon so drafts are not evicted.
        </Notice>
      ) : null}
      <Panel className="mb-4">
        <div className="flex flex-wrap gap-2">
          <StatusStamp tone="queued">{`${pending.length} queued`}</StatusStamp>
          <StatusStamp tone={failedMedia.length ? "fail" : "pass"}>
            {`${failedMedia.length} photo ${failedMedia.length === 1 ? "upload" : "uploads"}`}
          </StatusStamp>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            busy={busy}
            busyLabel="Retrying…"
            onClick={async () => {
              setBusy(true);
              try {
                await retryFailed(scope, inspectionId);
                await reload();
              } finally {
                setBusy(false);
              }
            }}
          >
            Retry failed
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={async () => {
              const bundle = await buildSupportBundle(scope, inspectionId);
              downloadSupportBundle(
                bundle,
                `inspectstack-support-${inspectionId.slice(0, 8)}.json`,
              );
            }}
          >
            Export support bundle
          </Button>
        </div>
      </Panel>
      {pending.length === 0 && failedMedia.length === 0 ? (
        <EmptyState title="Nothing queued">
          All captured records on this device have synced.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {pending.map((row) => (
            <li key={row.operationId}>
              <Panel className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-ui">{row.operation.type.replaceAll("_", " ")}</p>
                  <StatusStamp tone={row.status === "failed" ? "fail" : "queued"}>
                    {row.status}
                  </StatusStamp>
                </div>
                <p className="mt-1 font-mono text-micro text-muted">
                  {row.operation.payloadHash.slice(0, 12)}
                </p>
                {row.lastError ? (
                  <p className="mt-1 text-label text-fail">{row.lastError}</p>
                ) : null}
              </Panel>
            </li>
          ))}
          {failedMedia.map((row) => (
            <li key={row.mediaId}>
              <Panel className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-ui">Photo · {row.fieldKey}</p>
                  <StatusStamp tone={row.uploadStatus === "failed" ? "fail" : "queued"}>
                    {row.uploadStatus === "synced" ? "synced" : row.uploadStatus}
                  </StatusStamp>
                </div>
                <p className="mt-1 font-mono text-micro text-muted">
                  {row.contentHash.slice(0, 12)}
                </p>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
