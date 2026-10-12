import { APP_VERSION } from "@inspectstack/domain";
import { OFFLINE_SCHEMA_VERSION } from "./db";
import { estimateDeviceStorage, listMediaBlobs } from "./media";
import { listQueuedOperations } from "./queue";
import { getLocalAssignment } from "./projection";
import type { OfflineScope } from "./db";

export type SupportBundle = {
  exportedAt: string;
  productVersion: string;
  schemaVersion: number;
  inspection: {
    id: string;
    number: string;
    status: string;
    revision: number;
  } | null;
  operations: Array<{
    operationId: string;
    type: string;
    payloadHash: string;
    status: string;
    lastError?: string;
    clientTimestamp: string;
    baseRevision: number;
  }>;
  media: Array<{
    mediaId: string;
    fieldKey: string;
    contentHash: string;
    byteSize: number;
    contentType: string;
    uploadStatus: string;
  }>;
  responses: Record<string, unknown>;
  storage: { usage: number; quota: number; ratio: number; low: boolean } | null;
};

export async function buildSupportBundle(
  scope: OfflineScope,
  inspectionId: string,
): Promise<SupportBundle> {
  const assignment = await getLocalAssignment(scope, inspectionId);
  const operations = await listQueuedOperations(scope, inspectionId);
  const media = await listMediaBlobs(scope, inspectionId);
  return {
    exportedAt: new Date().toISOString(),
    productVersion: APP_VERSION,
    schemaVersion: OFFLINE_SCHEMA_VERSION,
    inspection: assignment
      ? {
          id: assignment.bundle.inspection.id,
          number: assignment.bundle.inspection.number,
          status: assignment.projection.status,
          revision: assignment.projection.revision,
        }
      : { id: inspectionId, number: "", status: "", revision: 0 },
    operations: operations.map((row) => ({
      operationId: row.operationId,
      type: row.operation.type,
      payloadHash: row.operation.payloadHash,
      status: row.status,
      lastError: row.lastError,
      clientTimestamp: row.operation.clientTimestamp,
      baseRevision: row.operation.baseRevision,
    })),
    media: media.map((row) => ({
      mediaId: row.mediaId,
      fieldKey: row.fieldKey,
      contentHash: row.contentHash,
      byteSize: row.byteSize,
      contentType: row.contentType,
      uploadStatus: row.uploadStatus,
    })),
    responses: assignment?.projection.responses ?? {},
    storage: await estimateDeviceStorage(),
  };
}

export function downloadSupportBundle(bundle: SupportBundle, fileName: string) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
