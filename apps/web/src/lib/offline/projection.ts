import {
  applyOperations,
  projectionFromBundle,
  type AssignmentBundle,
  type InspectionProjection,
} from "@inspectstack/domain";
import {
  assertScope,
  assignmentRecordId,
  getOfflineDb,
  partitionKey,
  type AssignmentRecord,
  type OfflineScope,
  type OperationRecord,
} from "./db";

function pendingOps(rows: OperationRecord[]): OperationRecord[] {
  return [...rows].sort((a, b) => a.enqueuedAt.localeCompare(b.enqueuedAt));
}

export async function persistAssignmentBundle(
  scope: OfflineScope,
  bundle: AssignmentBundle,
): Promise<InspectionProjection> {
  if (bundle.organization.id !== scope.organizationId) {
    throw new Error("Assignment bundle organization does not match the offline partition");
  }
  const db = getOfflineDb();
  const key = partitionKey(scope.organizationId, scope.userId);
  const inspectionId = bundle.inspection.id;
  const queued = await db.operations
    .where("[partitionKey+inspectionId]")
    .equals([key, inspectionId])
    .toArray();
  const projection = applyOperations(
    projectionFromBundle(bundle),
    pendingOps(queued).map((row) => row.operation),
  );
  const record: AssignmentRecord = {
    id: assignmentRecordId(key, inspectionId),
    partitionKey: key,
    organizationId: scope.organizationId,
    userId: scope.userId,
    inspectionId,
    bundle,
    projection,
    updatedAt: new Date().toISOString(),
  };
  await db.assignments.put(record);
  return projection;
}

export async function getLocalAssignment(
  scope: OfflineScope,
  inspectionId: string,
): Promise<AssignmentRecord | null> {
  const db = getOfflineDb();
  const key = partitionKey(scope.organizationId, scope.userId);
  const row = await db.assignments.get(assignmentRecordId(key, inspectionId));
  if (!row) return null;
  assertScope(scope, row);
  return row;
}

export async function listLocalAssignments(scope: OfflineScope): Promise<AssignmentRecord[]> {
  const db = getOfflineDb();
  const key = partitionKey(scope.organizationId, scope.userId);
  const rows = await db.assignments.where("partitionKey").equals(key).toArray();
  return rows.filter((row) => {
    assertScope(scope, row);
    return true;
  });
}

export async function saveLocalProjection(
  scope: OfflineScope,
  inspectionId: string,
  projection: InspectionProjection,
): Promise<void> {
  const current = await getLocalAssignment(scope, inspectionId);
  if (!current) throw new Error("No assignment downloaded.");
  if (projection.inspectionId !== inspectionId) {
    throw new Error("Projection inspection does not match");
  }
  if (projection.organizationId !== scope.organizationId) {
    throw new Error("Projection organization does not match the offline partition");
  }
  await getOfflineDb().assignments.put({
    ...current,
    projection,
    updatedAt: new Date().toISOString(),
  });
}
