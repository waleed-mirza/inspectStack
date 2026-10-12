import imageCompression from "browser-image-compression";
import { newOperationId, sha256Hex } from "@inspectstack/domain";
import {
  assertScope,
  getOfflineDb,
  partitionKey,
  type MediaBlobRecord,
  type MediaUploadStatus,
  type OfflineScope,
} from "./db";

export async function hashBlob(blob: Blob): Promise<string> {
  return sha256Hex(new Uint8Array(await blob.arrayBuffer()));
}

export async function compressEvidenceFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  try {
    return await imageCompression(file, {
      maxSizeMB: 1.2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: file.type === "image/png" ? "image/png" : "image/jpeg",
    });
  } catch {
    return file;
  }
}

export async function putMediaBlob(
  scope: OfflineScope,
  record: Omit<MediaBlobRecord, "partitionKey" | "organizationId" | "userId">,
): Promise<MediaBlobRecord> {
  const db = getOfflineDb();
  const row: MediaBlobRecord = {
    ...record,
    partitionKey: partitionKey(scope.organizationId, scope.userId),
    organizationId: scope.organizationId,
    userId: scope.userId,
  };
  await db.mediaBlobs.put(row);
  return row;
}

export async function getMediaBlob(
  scope: OfflineScope,
  mediaId: string,
): Promise<MediaBlobRecord | null> {
  const db = getOfflineDb();
  const row = await db.mediaBlobs.get(mediaId);
  if (!row) return null;
  assertScope(scope, row);
  return row;
}

export async function listMediaBlobs(
  scope: OfflineScope,
  inspectionId?: string,
): Promise<MediaBlobRecord[]> {
  const db = getOfflineDb();
  const key = partitionKey(scope.organizationId, scope.userId);
  const rows = inspectionId
    ? await db.mediaBlobs.where("[partitionKey+inspectionId]").equals([key, inspectionId]).toArray()
    : await db.mediaBlobs.where("partitionKey").equals(key).toArray();
  return rows.filter((row) => {
    assertScope(scope, row);
    return true;
  });
}

export async function setMediaUploadStatus(
  scope: OfflineScope,
  mediaId: string,
  uploadStatus: MediaUploadStatus,
  lastError?: string,
): Promise<void> {
  const row = await getMediaBlob(scope, mediaId);
  if (!row) return;
  await getOfflineDb().mediaBlobs.update(mediaId, { uploadStatus, lastError });
}

export async function removeMediaBlob(scope: OfflineScope, mediaId: string): Promise<void> {
  const row = await getMediaBlob(scope, mediaId);
  if (!row) return;
  await getOfflineDb().mediaBlobs.delete(mediaId);
}

export async function captureGps(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

export async function prepareEvidenceBlob(input: {
  file: File;
  fieldKey: string;
  inspectionId: string;
  mediaId?: string;
}): Promise<{
  mediaId: string;
  fieldKey: string;
  contentHash: string;
  contentType: string;
  byteSize: number;
  capturedAt: string;
  blob: Blob;
}> {
  const compressed = await compressEvidenceFile(input.file);
  const contentHash = await hashBlob(compressed);
  return {
    mediaId: input.mediaId ?? newOperationId(),
    fieldKey: input.fieldKey,
    contentHash,
    contentType: compressed.type || input.file.type || "image/jpeg",
    byteSize: compressed.size,
    capturedAt: new Date().toISOString(),
    blob: compressed,
  };
}

export async function estimateDeviceStorage(): Promise<{
  usage: number;
  quota: number;
  ratio: number;
  low: boolean;
} | null> {
  const estimate =
    navigator.storage && "estimate" in navigator.storage
      ? await navigator.storage.estimate()
      : null;
  if (!estimate?.quota) return null;
  const usage = estimate.usage ?? 0;
  const ratio = usage / estimate.quota;
  return { usage, quota: estimate.quota, ratio, low: ratio >= 0.8 };
}
