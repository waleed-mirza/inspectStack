import { canReview, type MembershipRole } from "./roles";
import type { InspectionIssue } from "./inspection-validation";
import { canIssueFinalReport, type InspectionStatus } from "./statuses";

export const REVIEW_QUEUE_STATUSES = ["submitted", "returned"] as const;
export type ReviewQueueStatus = (typeof REVIEW_QUEUE_STATUSES)[number];

export function inReviewQueue(status: InspectionStatus): boolean {
  return status === "submitted" || status === "returned";
}

export function canOpenReviewDesk(role: MembershipRole): boolean {
  return canReview(role);
}

/**
 * Inspectors never approve. A reviewer who is also the assigned inspector
 * cannot approve their own work. Owner/admin may approve even if assigned.
 */
export function canApproveInspection(input: {
  role: MembershipRole;
  actorUserId: string;
  assignedToUserId: string | null | undefined;
}): boolean {
  if (!canReview(input.role)) return false;
  if (input.role === "inspector") return false;
  if (input.role === "reviewer" && input.assignedToUserId === input.actorUserId) {
    return false;
  }
  return true;
}

export function canReturnInspection(role: MembershipRole): boolean {
  return canReview(role);
}

export type ReviewTransition =
  | { ok: true; to: Extract<InspectionStatus, "approved" | "returned"> }
  | { ok: false; error: "not_submitted" | "already_approved" | "denied" | "incomplete" };

export function planApprove(input: {
  status: InspectionStatus;
  role: MembershipRole;
  actorUserId: string;
  assignedToUserId: string | null | undefined;
  issues: InspectionIssue[];
}): ReviewTransition {
  if (!canApproveInspection(input)) return { ok: false, error: "denied" };
  if (input.status === "approved" || canIssueFinalReport(input.status)) {
    return { ok: false, error: "already_approved" };
  }
  if (input.status !== "submitted") return { ok: false, error: "not_submitted" };
  if (input.issues.length > 0) return { ok: false, error: "incomplete" };
  return { ok: true, to: "approved" };
}

export function planReturn(input: {
  status: InspectionStatus;
  role: MembershipRole;
  note: string;
}): ReviewTransition {
  if (!canReturnInspection(input.role)) return { ok: false, error: "denied" };
  if (input.status === "approved") return { ok: false, error: "already_approved" };
  if (input.status !== "submitted") return { ok: false, error: "not_submitted" };
  if (input.note.trim().length === 0) return { ok: false, error: "incomplete" };
  return { ok: true, to: "returned" };
}

export function reviewDeniedMessage(
  error: "not_submitted" | "already_approved" | "denied" | "incomplete",
): string {
  switch (error) {
    case "denied":
      return "You cannot approve this inspection. Inspectors cannot approve their own work.";
    case "not_submitted":
      return "Only submitted inspections can be approved or returned.";
    case "already_approved":
      return "This inspection is already approved. The issued report was not duplicated.";
    case "incomplete":
      return "Required evidence or a return note is still missing.";
    default:
      return "Review could not be completed.";
  }
}
