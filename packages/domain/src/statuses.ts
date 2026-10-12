export const INSPECTION_STATUSES = [
  "draft",
  "assigned",
  "in_progress",
  "submitted",
  "approved",
  "returned",
  "archived",
] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export const FINDING_STATUSES = [
  "open",
  "acknowledged",
  "in_progress",
  "ready_for_review",
  "closed",
  "reopened",
] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const TEMPLATE_VERSION_STATUSES = ["draft", "published", "retired"] as const;
export type TemplateVersionStatus = (typeof TEMPLATE_VERSION_STATUSES)[number];

export const SYNC_STATUSES = ["queued", "sending", "applied", "conflict", "failed"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const RUNNER_SYNC_STATES = ["offline", "queued", "syncing", "failed", "synced"] as const;
export type RunnerSyncState = (typeof RUNNER_SYNC_STATES)[number];

export function canIssueFinalReport(status: InspectionStatus): boolean {
  return status === "approved";
}

/** Field answers may change only while the job is still with the inspector. */
export function canMutateInspection(status: InspectionStatus): boolean {
  return (
    status === "draft" || status === "assigned" || status === "in_progress" || status === "returned"
  );
}
