import type { AssignmentBundle, MediaManifest } from "./assignment-bundle";
import { sha256Hex } from "./sha256";
import { canMutateInspection, type InspectionStatus } from "./statuses";

export const OPERATION_TYPES = [
  "start_inspection",
  "set_response",
  "add_media_manifest",
  "update_media_meta",
  "remove_media",
  "submit_inspection",
] as const;

export type OperationType = (typeof OPERATION_TYPES)[number];

export type SyncOperation = {
  operationId: string;
  inspectionId: string;
  entityId: string;
  clientTimestamp: string;
  baseRevision: number;
  type: OperationType;
  payloadHash: string;
  payload: Record<string, unknown>;
};

export type InspectionProjection = {
  inspectionId: string;
  organizationId: string;
  status: InspectionStatus;
  revision: number;
  responses: Record<string, unknown>;
  media: MediaManifest[];
  appliedOperationIds: string[];
  submitRequested: boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** UUID v4. `randomUUID` is missing on HTTP LAN; `getRandomValues` is not. */
export function newOperationId(): string {
  const webCrypto = globalThis.crypto as
    | { randomUUID?: () => string; getRandomValues?: (bytes: Uint8Array) => Uint8Array }
    | undefined;
  if (webCrypto?.randomUUID) return webCrypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (webCrypto?.getRandomValues) webCrypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  const version = bytes[6] ?? 0;
  const variant = bytes[8] ?? 0;
  bytes[6] = (version & 0x0f) | 0x40;
  bytes[8] = (variant & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Deterministic JSON so the same payload hashes the same regardless of key order. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

export async function hashPayload(payload: unknown): Promise<string> {
  const Encoder = (
    globalThis as { TextEncoder?: new () => { encode: (input: string) => Uint8Array } }
  ).TextEncoder;
  if (!Encoder) {
    throw new Error("SHA-256 is not available in this runtime");
  }
  return sha256Hex(new Encoder().encode(stableStringify(payload)));
}

export async function createOperation(input: {
  inspectionId: string;
  entityId: string;
  type: OperationType;
  payload: Record<string, unknown>;
  baseRevision: number;
  operationId?: string;
  clientTimestamp?: string;
}): Promise<SyncOperation> {
  return {
    operationId: input.operationId ?? newOperationId(),
    inspectionId: input.inspectionId,
    entityId: input.entityId,
    clientTimestamp: input.clientTimestamp ?? new Date().toISOString(),
    baseRevision: input.baseRevision,
    type: input.type,
    payloadHash: await hashPayload(input.payload),
    payload: input.payload,
  };
}

export async function payloadHashMatches(operation: SyncOperation): Promise<boolean> {
  return (await hashPayload(operation.payload)) === operation.payloadHash;
}

export function projectionFromBundle(bundle: AssignmentBundle): InspectionProjection {
  const responses: Record<string, unknown> = {};
  for (const row of bundle.responses) {
    responses[row.fieldKey] = row.value;
  }
  return {
    inspectionId: bundle.inspection.id,
    organizationId: bundle.organization.id,
    status: bundle.inspection.status,
    revision: bundle.inspection.revision,
    responses,
    media: bundle.media.map((item) => ({ ...item })),
    appliedOperationIds: [],
    submitRequested: false,
  };
}

function cloneProjection(projection: InspectionProjection): InspectionProjection {
  return {
    ...projection,
    responses: { ...projection.responses },
    media: projection.media.map((item) => ({ ...item })),
    appliedOperationIds: [...projection.appliedOperationIds],
  };
}

function asMediaManifest(payload: Record<string, unknown>, fallbackId: string): MediaManifest {
  const mediaId =
    typeof payload.mediaId === "string" && payload.mediaId ? payload.mediaId : fallbackId;
  const fieldKey = typeof payload.fieldKey === "string" ? payload.fieldKey : "";
  const contentHash = typeof payload.contentHash === "string" ? payload.contentHash : "";
  const contentType =
    typeof payload.contentType === "string" ? payload.contentType : "application/octet-stream";
  const byteSize = typeof payload.byteSize === "number" ? payload.byteSize : 0;
  return {
    mediaId,
    fieldKey,
    contentHash,
    contentType,
    byteSize,
    caption: typeof payload.caption === "string" ? payload.caption : undefined,
    capturedAt: typeof payload.capturedAt === "string" ? payload.capturedAt : undefined,
    latitude: typeof payload.latitude === "number" ? payload.latitude : undefined,
    longitude: typeof payload.longitude === "number" ? payload.longitude : undefined,
    annotation: payload.annotation,
    storageKey: typeof payload.storageKey === "string" ? payload.storageKey : undefined,
  };
}

/** Last-accepted-write conflict: server changed since the client based this op. */
export function responseConflicts(baseRevision: number, serverRevision: number): boolean {
  return serverRevision > baseRevision;
}

export function applyOperation(
  projection: InspectionProjection,
  operation: SyncOperation,
): InspectionProjection {
  if (operation.inspectionId !== projection.inspectionId) {
    throw new Error("Operation inspection does not match local projection");
  }
  if (projection.appliedOperationIds.includes(operation.operationId)) {
    return projection;
  }

  const next = cloneProjection(projection);
  next.appliedOperationIds.push(operation.operationId);

  switch (operation.type) {
    case "start_inspection": {
      if (next.status === "draft" || next.status === "assigned") {
        next.status = "in_progress";
      }
      break;
    }
    case "set_response": {
      const fieldKey =
        (typeof operation.payload.fieldKey === "string" && operation.payload.fieldKey) ||
        operation.entityId;
      next.responses[fieldKey] = operation.payload.value;
      break;
    }
    case "add_media_manifest": {
      const item = asMediaManifest(operation.payload, operation.entityId);
      if (!next.media.some((row) => row.mediaId === item.mediaId)) {
        next.media.push(item);
      }
      break;
    }
    case "update_media_meta": {
      const mediaId =
        (typeof operation.payload.mediaId === "string" && operation.payload.mediaId) ||
        operation.entityId;
      next.media = next.media.map((row) => {
        if (row.mediaId !== mediaId) return row;
        return {
          ...row,
          caption:
            typeof operation.payload.caption === "string" ? operation.payload.caption : row.caption,
          annotation:
            operation.payload.annotation === undefined
              ? row.annotation
              : operation.payload.annotation,
        };
      });
      break;
    }
    case "remove_media": {
      const mediaId =
        (typeof operation.payload.mediaId === "string" && operation.payload.mediaId) ||
        operation.entityId;
      next.media = next.media.filter((row) => row.mediaId !== mediaId);
      break;
    }
    case "submit_inspection": {
      next.submitRequested = true;
      break;
    }
    default:
      break;
  }

  return next;
}

export function applyOperations(
  projection: InspectionProjection,
  operations: SyncOperation[],
): InspectionProjection {
  return operations.reduce((current, operation) => applyOperation(current, operation), projection);
}

export function projectionAllowsWrites(projection: InspectionProjection): boolean {
  return canMutateInspection(projection.status) && !projection.submitRequested;
}
