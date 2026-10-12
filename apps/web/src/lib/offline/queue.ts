import {
  applyOperation,
  createOperation,
  projectionAllowsWrites,
  type InspectionProjection,
  type OperationType,
  type SyncOperation,
} from "@inspectstack/domain";
import {
  assertScope,
  getOfflineDb,
  partitionKey,
  type LocalQueueStatus,
  type OfflineScope,
  type OperationRecord,
} from "./db";
import { getLocalAssignment, saveLocalProjection } from "./projection";

export async function listQueuedOperations(
  scope: OfflineScope,
  inspectionId?: string,
): Promise<OperationRecord[]> {
  const db = getOfflineDb();
  const key = partitionKey(scope.organizationId, scope.userId);
  const rows = inspectionId
    ? await db.operations.where("[partitionKey+inspectionId]").equals([key, inspectionId]).toArray()
    : await db.operations.where("partitionKey").equals(key).toArray();
  return rows
    .filter((row) => {
      assertScope(scope, row);
      return true;
    })
    .sort((a, b) => a.enqueuedAt.localeCompare(b.enqueuedAt));
}

export async function enqueueLocalOperation(
  scope: OfflineScope,
  input: {
    inspectionId: string;
    type: OperationType;
    entityId: string;
    payload: Record<string, unknown>;
    operationId?: string;
  },
): Promise<{ operation: SyncOperation; projection: InspectionProjection }> {
  const assignment = await getLocalAssignment(scope, input.inspectionId);
  if (!assignment) throw new Error("No assignment downloaded.");
  if (!projectionAllowsWrites(assignment.projection)) {
    throw new Error("This inspection is locked on the device.");
  }

  const operation = await createOperation({
    inspectionId: input.inspectionId,
    entityId: input.entityId,
    type: input.type,
    payload: input.payload,
    baseRevision: assignment.projection.revision,
    operationId: input.operationId,
  });

  const db = getOfflineDb();
  const existing = await db.operations.get(operation.operationId);
  if (existing) {
    assertScope(scope, existing);
    return { operation: existing.operation, projection: assignment.projection };
  }

  const projection = applyOperation(assignment.projection, operation);
  const key = partitionKey(scope.organizationId, scope.userId);
  const record: OperationRecord = {
    operationId: operation.operationId,
    partitionKey: key,
    organizationId: scope.organizationId,
    userId: scope.userId,
    inspectionId: input.inspectionId,
    operation,
    status: "queued",
    enqueuedAt: operation.clientTimestamp,
  };

  await db.transaction("rw", db.assignments, db.operations, async () => {
    await db.operations.put(record);
    await saveLocalProjection(scope, input.inspectionId, projection);
  });

  return { operation, projection };
}

export async function setQueuedOperationStatus(
  scope: OfflineScope,
  operationId: string,
  status: LocalQueueStatus,
  lastError?: string,
): Promise<void> {
  const db = getOfflineDb();
  const row = await db.operations.get(operationId);
  if (!row) return;
  assertScope(scope, row);
  await db.operations.update(operationId, { status, lastError });
}

export async function removeLocalOperation(
  scope: OfflineScope,
  operationId: string,
): Promise<void> {
  const db = getOfflineDb();
  const row = await db.operations.get(operationId);
  if (!row) return;
  assertScope(scope, row);
  await db.operations.delete(operationId);
}
