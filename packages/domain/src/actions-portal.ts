import { canTransitionFinding } from "./findings";
import { canReview, type MembershipRole } from "./roles";
import { dueState, type DueState } from "./schedules";
import type { FindingStatus } from "./statuses";

export function canOpenActionsPortal(role: MembershipRole): boolean {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "reviewer" ||
    role === "inspector" ||
    role === "client_viewer"
  );
}

export function canCommentOnFinding(role: MembershipRole): boolean {
  return canOpenActionsPortal(role);
}

export function canUploadFindingEvidence(role: MembershipRole): boolean {
  return canOpenActionsPortal(role);
}

export function canVerifyFinding(role: MembershipRole): boolean {
  return canReview(role);
}

export function canReopenFinding(role: MembershipRole): boolean {
  return canReview(role);
}

/** Staff can move a finding toward review. Clients comment only. Closed/reopen stay canReview. */
export function canAdvancePortalFinding(role: MembershipRole): boolean {
  return canOpenActionsPortal(role) && role !== "client_viewer";
}

export type PortalTransitionError = "denied" | "illegal";

export type PortalTransition =
  | { ok: true; to: FindingStatus }
  | { ok: false; error: PortalTransitionError };

export function planVerifyFinding(input: {
  role: MembershipRole;
  from: FindingStatus;
}): PortalTransition {
  if (!canVerifyFinding(input.role)) return { ok: false, error: "denied" };
  if (!canTransitionFinding(input.from, "closed")) return { ok: false, error: "illegal" };
  return { ok: true, to: "closed" };
}

export function planReopenFinding(input: {
  role: MembershipRole;
  from: FindingStatus;
}): PortalTransition {
  if (!canReopenFinding(input.role)) return { ok: false, error: "denied" };
  if (!canTransitionFinding(input.from, "reopened")) return { ok: false, error: "illegal" };
  return { ok: true, to: "reopened" };
}

export function planAdvanceFinding(input: {
  role: MembershipRole;
  from: FindingStatus;
  to: FindingStatus;
}): PortalTransition {
  if (input.to === "closed") return planVerifyFinding({ role: input.role, from: input.from });
  if (input.to === "reopened") return planReopenFinding({ role: input.role, from: input.from });
  if (!canAdvancePortalFinding(input.role)) return { ok: false, error: "denied" };
  if (!canTransitionFinding(input.from, input.to)) return { ok: false, error: "illegal" };
  return { ok: true, to: input.to };
}

export function findingReminderState(
  dueAt: Date | null | undefined,
  now: Date,
  timeZone: string,
): DueState | "none" {
  if (!dueAt) return "none";
  return dueState(dueAt, now, timeZone);
}

export function portalDeniedMessage(error: PortalTransitionError): string {
  if (error === "denied") return "You cannot close or reopen this finding.";
  return "That status change is not allowed from here.";
}
