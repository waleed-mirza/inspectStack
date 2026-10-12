export const MEMBERSHIP_ROLES = [
  "owner",
  "admin",
  "template_manager",
  "inspector",
  "reviewer",
  "client_viewer",
] as const;

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const MEMBERSHIP_STATUSES = ["invited", "active", "suspended"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const APP_MODES = ["single_company", "saas"] as const;
export type AppMode = (typeof APP_MODES)[number];

export function canManageWorkspace(role: MembershipRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageTemplates(role: MembershipRole): boolean {
  return role === "owner" || role === "admin" || role === "template_manager";
}

export function canInspect(role: MembershipRole): boolean {
  return role === "owner" || role === "admin" || role === "inspector";
}

export function canReview(role: MembershipRole): boolean {
  return role === "owner" || role === "admin" || role === "reviewer";
}

export function canViewClient(role: MembershipRole): boolean {
  return role === "client_viewer" || canReview(role) || canManageWorkspace(role);
}

export function canInvite(role: MembershipRole): boolean {
  return canManageWorkspace(role);
}

export function canAccessPlatform(isPlatformAdmin: boolean): boolean {
  return isPlatformAdmin === true;
}

export function canAssignOwner(actor: MembershipRole): boolean {
  return actor === "owner";
}

export function canChangeMemberRole(input: {
  actor: MembershipRole;
  target: MembershipRole;
  next: MembershipRole;
  ownerCount: number;
}): boolean {
  if (!canManageWorkspace(input.actor)) return false;
  if (input.next === "owner" && input.actor !== "owner") return false;
  if (input.target === "owner" && input.actor !== "owner") return false;
  if (input.target === "owner" && input.next !== "owner" && input.ownerCount <= 1) return false;
  return true;
}

export function canSuspendMember(input: {
  actor: MembershipRole;
  target: MembershipRole;
  ownerCount: number;
}): boolean {
  if (!canManageWorkspace(input.actor)) return false;
  if (input.target === "owner" && input.actor !== "owner") return false;
  if (input.target === "owner" && input.ownerCount <= 1) return false;
  return true;
}
