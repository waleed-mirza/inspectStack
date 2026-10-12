import Dexie, { type EntityTable } from "dexie";
import type {
  AssignmentBundle,
  InspectionProjection,
  SyncOperation,
  SyncStatus,
} from "@inspectstack/domain";

export const OFFLINE_DB_NAME = "inspectstack";
/** IndexedDB schema version. Independent of assignment bundle version. */
export const OFFLINE_SCHEMA_VERSION = 2;

export type OfflineScope = {
  organizationId: string;
  userId: string;
};

export type LocalQueueStatus = Extract<SyncStatus, "queued" | "sending" | "failed">;
export type MediaUploadStatus = LocalQueueStatus | "synced";

export type AssignmentRecord = {
  id: string;
  partitionKey: string;
  organizationId: string;
  userId: string;
  inspectionId: string;
  bundle: AssignmentBundle;
  projection: InspectionProjection;
  updatedAt: string;
};

export type OperationRecord = {
  operationId: string;
  partitionKey: string;
  organizationId: string;
  userId: string;
  inspectionId: string;
  operation: SyncOperation;
  status: LocalQueueStatus;
  enqueuedAt: string;
  lastError?: string;
};

export type MediaBlobRecord = {
  mediaId: string;
  partitionKey: string;
  organizationId: string;
  userId: string;
  inspectionId: string;
  fieldKey: string;
  blob: Blob;
  contentType: string;
  contentHash: string;
  byteSize: number;
  uploadStatus: MediaUploadStatus;
  capturedAt: string;
  lastError?: string;
};

export function partitionKey(organizationId: string, userId: string): string {
  return `${organizationId}:${userId}`;
}

export function assignmentRecordId(scopeKey: string, inspectionId: string): string {
  return `${scopeKey}:${inspectionId}`;
}

export function assertScope(scope: OfflineScope, row: { organizationId: string; userId: string }) {
  if (row.organizationId !== scope.organizationId || row.userId !== scope.userId) {
    throw new Error("Offline record is not in this workspace partition");
  }
}

class InspectStackOfflineDb extends Dexie {
  assignments!: EntityTable<AssignmentRecord, "id">;
  operations!: EntityTable<OperationRecord, "operationId">;
  mediaBlobs!: EntityTable<MediaBlobRecord, "mediaId">;

  constructor() {
    super(OFFLINE_DB_NAME);
    this.version(1).stores({
      assignments: "id, partitionKey, inspectionId, [partitionKey+inspectionId]",
      operations:
        "operationId, partitionKey, inspectionId, status, [partitionKey+inspectionId], [partitionKey+status]",
    });
    this.version(OFFLINE_SCHEMA_VERSION).stores({
      assignments: "id, partitionKey, inspectionId, [partitionKey+inspectionId]",
      operations:
        "operationId, partitionKey, inspectionId, status, [partitionKey+inspectionId], [partitionKey+status]",
      mediaBlobs: "mediaId, partitionKey, inspectionId, uploadStatus, [partitionKey+inspectionId]",
    });
  }
}

let instance: InspectStackOfflineDb | null = null;

export function offlineDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

export function getOfflineDb(): InspectStackOfflineDb {
  if (!offlineDbAvailable()) {
    throw new Error("IndexedDB is not available");
  }
  if (!instance) instance = new InspectStackOfflineDb();
  return instance;
}

export async function purgePartition(organizationId: string, userId: string): Promise<void> {
  if (!offlineDbAvailable()) return;
  const db = getOfflineDb();
  const key = partitionKey(organizationId, userId);
  await db.transaction("rw", db.assignments, db.operations, db.mediaBlobs, async () => {
    await db.assignments.where("partitionKey").equals(key).delete();
    await db.operations.where("partitionKey").equals(key).delete();
    await db.mediaBlobs.where("partitionKey").equals(key).delete();
  });
}

/** Clears every partition on this device. Call on sign-out so the next user cannot read drafts. */
export async function purgeAllOfflineData(): Promise<void> {
  if (!offlineDbAvailable()) return;
  if (instance) {
    instance.close();
    instance = null;
  }
  await Dexie.delete(OFFLINE_DB_NAME);
}

export async function purgeOnSignOut(): Promise<void> {
  await purgeAllOfflineData();
}

/** Defined for workspace switch; does not run automatically (offline integrity). */
export async function purgeOnWorkspaceSwitch(
  organizationId: string,
  userId: string,
): Promise<void> {
  await purgePartition(organizationId, userId);
}
