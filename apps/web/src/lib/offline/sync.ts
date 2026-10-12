import type { AssignmentBundle, RunnerSyncState, SyncOperation } from "@inspectstack/domain";
import { assignmentBundleSchema, isUuid, newOperationId } from "@inspectstack/domain";
import { persistAssignmentBundle, saveLocalProjection, getLocalAssignment } from "./projection";
import {
  enqueueLocalOperation,
  listQueuedOperations,
  removeLocalOperation,
  setQueuedOperationStatus,
} from "./queue";
import {
  getMediaBlob,
  listMediaBlobs,
  putMediaBlob,
  removeMediaBlob,
  setMediaUploadStatus,
} from "./media";
import type { OfflineScope, OperationRecord } from "./db";

export type DrainResult = {
  revision?: number;
  applied: number;
  conflicts: Array<{ operationId: string; fieldKey?: string }>;
  failed: Array<{ operationId: string; error?: string }>;
  mediaUploaded: number;
  mediaFailed: number;
};

export function deriveRunnerSyncState(input: {
  online: boolean;
  sending: boolean;
  queued: number;
  failed: number;
}): RunnerSyncState {
  if (!input.online) return "offline";
  if (input.failed > 0) return "failed";
  if (input.sending) return "syncing";
  if (input.queued > 0) return "queued";
  return "synced";
}

function isRetryableTransportError(error: string) {
  const lower = error.toLowerCase();
  return (
    error === "network" ||
    error === "upload_failed" ||
    error === "manifest_pending" ||
    error === "http_429" ||
    /^http_5\d\d$/.test(error) ||
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("offline")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function parseBundleResponse(payload: unknown): Promise<AssignmentBundle | null> {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { bundle?: unknown };
  const parsed = assignmentBundleSchema.safeParse(record.bundle);
  return parsed.success ? parsed.data : null;
}

async function refreshBundle(scope: OfflineScope, inspectionId: string): Promise<void> {
  const response = await fetch(`/app/run/${inspectionId}/bundle`, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) return;
  const bundle = await parseBundleResponse(await response.json());
  if (bundle) await persistAssignmentBundle(scope, bundle);
}

async function markPendingFailed(
  pending: OperationRecord[],
  scope: OfflineScope,
  result: DrainResult,
  error: string,
) {
  const retryable = isRetryableTransportError(error);
  for (const row of pending) {
    await setQueuedOperationStatus(scope, row.operationId, retryable ? "queued" : "failed", error);
    if (!retryable) result.failed.push({ operationId: row.operationId, error });
  }
}

async function remintInvalidMediaIds(scope: OfflineScope, inspectionId: string) {
  const rows = await listQueuedOperations(scope, inspectionId);
  for (const row of rows) {
    if (row.operation.type !== "add_media_manifest") continue;
    const oldId =
      (typeof row.operation.payload.mediaId === "string" && row.operation.payload.mediaId) ||
      row.operation.entityId;
    if (isUuid(oldId)) continue;
    const nextId = newOperationId();
    const blob = await getMediaBlob(scope, oldId);
    await removeLocalOperation(scope, row.operationId);
    if (!blob) continue;
    await removeMediaBlob(scope, oldId);
    await putMediaBlob(scope, {
      mediaId: nextId,
      inspectionId: blob.inspectionId,
      fieldKey: blob.fieldKey,
      blob: blob.blob,
      contentType: blob.contentType,
      contentHash: blob.contentHash,
      byteSize: blob.byteSize,
      uploadStatus: "queued",
      capturedAt: blob.capturedAt,
    });
    const assignment = await getLocalAssignment(scope, inspectionId);
    if (assignment) {
      await saveLocalProjection(scope, inspectionId, {
        ...assignment.projection,
        media: assignment.projection.media.map((item) =>
          item.mediaId === oldId ? { ...item, mediaId: nextId } : item,
        ),
      });
    }
    await enqueueLocalOperation(scope, {
      inspectionId,
      type: "add_media_manifest",
      entityId: nextId,
      payload: { ...row.operation.payload, mediaId: nextId },
    });
  }
}

async function reclaimSending(scope: OfflineScope, inspectionId: string) {
  const [ops, blobs] = await Promise.all([
    listQueuedOperations(scope, inspectionId),
    listMediaBlobs(scope, inspectionId),
  ]);
  for (const row of ops.filter((item) => item.status === "sending")) {
    await setQueuedOperationStatus(scope, row.operationId, "queued");
  }
  for (const blob of blobs.filter((item) => item.uploadStatus === "sending")) {
    await setMediaUploadStatus(scope, blob.mediaId, "queued");
  }
}

async function drainOperations(
  scope: OfflineScope,
  inspectionId: string,
  pending: OperationRecord[],
): Promise<DrainResult> {
  const result: DrainResult = {
    applied: 0,
    conflicts: [],
    failed: [],
    mediaUploaded: 0,
    mediaFailed: 0,
  };
  if (pending.length === 0) return result;

  for (const row of pending) {
    await setQueuedOperationStatus(scope, row.operationId, "sending");
  }

  let response: Response;
  try {
    response = await fetch(`/app/run/${inspectionId}/bundle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operations: pending.map((row) => row.operation) }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network";
    await markPendingFailed(pending, scope, result, message);
    return result;
  }

  if (!response.ok) {
    const error = response.status === 403 ? "denied" : `http_${response.status}`;
    await markPendingFailed(pending, scope, result, error);
    return result;
  }

  const body = (await response.json()) as {
    ok?: boolean;
    revision?: number;
    operations?: Array<{
      operationId: string;
      status: string;
      duplicate?: boolean;
      error?: string;
      result?: Record<string, unknown> | null;
    }>;
  };
  result.revision = body.revision;

  for (const row of body.operations ?? []) {
    if (row.status === "conflict") {
      const fieldKey = typeof row.result?.fieldKey === "string" ? row.result.fieldKey : undefined;
      await setQueuedOperationStatus(scope, row.operationId, "failed", "conflict");
      result.conflicts.push({ operationId: row.operationId, fieldKey });
      continue;
    }
    if (row.status === "applied" || (row.duplicate && row.status !== "failed")) {
      await removeLocalOperation(scope, row.operationId);
      result.applied += 1;
      continue;
    }
    const error = row.error ?? "failed";
    await setQueuedOperationStatus(scope, row.operationId, "failed", error);
    result.failed.push({ operationId: row.operationId, error });
  }

  if (typeof body.revision === "number") {
    const assignment = await getLocalAssignment(scope, inspectionId);
    if (assignment) {
      await saveLocalProjection(scope, inspectionId, {
        ...assignment.projection,
        revision: body.revision,
      });
    }
  }

  try {
    await refreshBundle(scope, inspectionId);
  } catch {
    // Local projection already has the writes; revision was bumped above.
  }

  return result;
}

async function drainMedia(scope: OfflineScope, inspectionId: string, result: DrainResult) {
  const pending = (await listMediaBlobs(scope, inspectionId)).filter(
    (row) => row.uploadStatus !== "synced",
  );
  for (const row of pending) {
    await setMediaUploadStatus(scope, row.mediaId, "sending");
    const form = new FormData();
    form.append("mediaId", row.mediaId);
    form.append("file", row.blob, `${row.mediaId}`);
    try {
      const response = await fetch(`/app/run/${inspectionId}/media`, {
        method: "POST",
        body: form,
      });
      if (response.status === 409) {
        await setMediaUploadStatus(scope, row.mediaId, "queued", "manifest_pending");
        continue;
      }
      if (!response.ok) {
        const error = `http_${response.status}`;
        const retryable = isRetryableTransportError(error);
        await setMediaUploadStatus(scope, row.mediaId, retryable ? "queued" : "failed", error);
        if (!retryable) result.mediaFailed += 1;
        continue;
      }
      await setMediaUploadStatus(scope, row.mediaId, "synced");
      result.mediaUploaded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "upload_failed";
      await setMediaUploadStatus(scope, row.mediaId, "queued", message);
    }
  }
}

export async function drainInspectionQueue(
  scope: OfflineScope,
  inspectionId: string,
): Promise<DrainResult> {
  const empty: DrainResult = {
    applied: 0,
    conflicts: [],
    failed: [],
    mediaUploaded: 0,
    mediaFailed: 0,
  };
  if (typeof navigator !== "undefined" && !navigator.onLine) return empty;

  await reclaimSending(scope, inspectionId);
  await remintInvalidMediaIds(scope, inspectionId);

  const parked = await listQueuedOperations(scope, inspectionId);
  for (const row of parked) {
    if (row.status === "failed" && isRetryableTransportError(row.lastError ?? "")) {
      await setQueuedOperationStatus(scope, row.operationId, "queued");
    }
  }
  const parkedBlobs = await listMediaBlobs(scope, inspectionId);
  for (const blob of parkedBlobs) {
    if (blob.uploadStatus === "failed" && isRetryableTransportError(blob.lastError ?? "")) {
      await setMediaUploadStatus(scope, blob.mediaId, "queued");
    }
  }

  let result = empty;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await wait(1200);
    const pending = (await listQueuedOperations(scope, inspectionId)).filter(
      (row) => row.status === "queued",
    );
    result = pending.length > 0 ? await drainOperations(scope, inspectionId, pending) : empty;
    await drainMedia(scope, inspectionId, result);
    const stillQueued = (await listQueuedOperations(scope, inspectionId)).some(
      (row) => row.status === "queued",
    );
    const stillMedia = (await listMediaBlobs(scope, inspectionId)).some(
      (row) => row.uploadStatus === "queued" || row.uploadStatus === "sending",
    );
    if (!stillQueued && !stillMedia) break;
    if (typeof navigator !== "undefined" && !navigator.onLine) break;
  }
  return result;
}

export async function retryFailed(
  scope: OfflineScope,
  inspectionId: string,
  operationIds?: string[],
): Promise<DrainResult> {
  try {
    await refreshBundle(scope, inspectionId);
  } catch {
    // Keep local projection; retry still re-queues with the latest known revision.
  }
  const rows = await listQueuedOperations(scope, inspectionId);
  const selected = operationIds
    ? rows.filter((row) => operationIds.includes(row.operationId))
    : rows.filter((row) => row.status === "failed");
  for (const row of selected) {
    if (row.lastError === "conflict") {
      await removeLocalOperation(scope, row.operationId);
      await enqueueLocalOperation(scope, {
        inspectionId,
        type: row.operation.type,
        entityId: row.operation.entityId,
        payload: row.operation.payload,
      });
    } else {
      await setQueuedOperationStatus(scope, row.operationId, "queued");
    }
  }
  if (!operationIds) {
    const blobs = await listMediaBlobs(scope, inspectionId);
    for (const blob of blobs.filter((item) => item.uploadStatus === "failed")) {
      await setMediaUploadStatus(scope, blob.mediaId, "queued");
    }
  }
  return drainInspectionQueue(scope, inspectionId);
}

export function operationsFromRecords(rows: OperationRecord[]): SyncOperation[] {
  return rows.map((row) => row.operation);
}
