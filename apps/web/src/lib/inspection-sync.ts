import { z } from "zod";
import {
  OPERATION_TYPES,
  canInspect,
  type AssignmentBundle,
  type SyncOperation,
} from "@inspectstack/domain";
import {
  applySyncOperations,
  getAssignmentBundle,
  recordAudit,
  type ApplySyncResult,
} from "@inspectstack/db";
import { getDb } from "./db";
import { requireSession } from "./session";

export const syncOperationSchema = z.object({
  operationId: z.string().min(1).max(80),
  inspectionId: z.string().uuid(),
  entityId: z.string().min(1).max(200),
  clientTimestamp: z.string().min(1).max(64),
  baseRevision: z.number().int().nonnegative(),
  type: z.enum(OPERATION_TYPES),
  payloadHash: z.string().min(1).max(128),
  payload: z.record(z.string(), z.unknown()),
});

export const applyOpsBodySchema = z.object({
  operations: z.array(syncOperationSchema).max(200),
});

export type InspectorDenied = {
  ok: false;
  error: "unauthenticated" | "denied";
};

export type InspectorSession = Exclude<
  Awaited<ReturnType<typeof requireSession>>,
  { ok: false }
>["session"];

export async function requireInspector(): Promise<
  { ok: true; session: InspectorSession } | InspectorDenied
> {
  const session = await requireSession();
  if (!session.ok) return { ok: false, error: "unauthenticated" };
  if (!canInspect(session.session.active.role)) return { ok: false, error: "denied" };
  return { ok: true, session: session.session };
}

export async function downloadAssignmentForInspector(
  inspectionId: string,
): Promise<
  | { ok: true; bundle: AssignmentBundle }
  | InspectorDenied
  | { ok: false; error: "not_found" | "invalid" }
> {
  const parsedId = z.string().uuid().safeParse(inspectionId);
  if (!parsedId.success) return { ok: false, error: "invalid" };

  const access = await requireInspector();
  if (!access.ok) return access;

  const bundle = await getAssignmentBundle(
    getDb(),
    { organizationId: access.session.active.organizationId },
    parsedId.data,
  );
  if (!bundle) return { ok: false, error: "not_found" };
  return { ok: true, bundle };
}

export async function applyInspectionOpsForInspector(input: {
  inspectionId: string;
  operations: unknown;
}): Promise<
  (ApplySyncResult & { ok: true }) | InspectorDenied | { ok: false; error: "not_found" | "invalid" }
> {
  const parsedId = z.string().uuid().safeParse(input.inspectionId);
  if (!parsedId.success) return { ok: false, error: "invalid" };

  const parsedBody = applyOpsBodySchema.safeParse(
    Array.isArray(input.operations) ? { operations: input.operations } : input.operations,
  );
  if (!parsedBody.success) return { ok: false, error: "invalid" };

  const operations = parsedBody.data.operations as SyncOperation[];
  if (operations.some((op) => op.inspectionId !== parsedId.data)) {
    return { ok: false, error: "invalid" };
  }

  const access = await requireInspector();
  if (!access.ok) return access;

  const orgId = access.session.active.organizationId;
  const applied = await applySyncOperations(getDb(), {
    organizationId: orgId,
    inspectionId: parsedId.data,
    operations,
  });
  if (!applied.ok) return applied;

  const appliedById = new Map(applied.operations.map((row) => [row.operationId, row]));
  for (const operation of operations) {
    const row = appliedById.get(operation.operationId);
    if (!row || row.duplicate || row.status !== "applied") continue;
    if (operation.type === "start_inspection") {
      await recordAudit(getDb(), {
        organizationId: orgId,
        actorUserId: access.session.user.id,
        action: "inspection.start",
        entityType: "inspection",
        entityId: parsedId.data,
      });
    }
    if (operation.type === "submit_inspection") {
      await recordAudit(getDb(), {
        organizationId: orgId,
        actorUserId: access.session.user.id,
        action: "inspection.submit",
        entityType: "inspection",
        entityId: parsedId.data,
      });
    }
  }

  return applied;
}

export function jsonError(error: "unauthenticated" | "denied" | "not_found" | "invalid"): Response {
  const status =
    error === "unauthenticated"
      ? 401
      : error === "denied"
        ? 403
        : error === "not_found"
          ? 404
          : 400;
  return Response.json({ ok: false, error }, { status });
}
