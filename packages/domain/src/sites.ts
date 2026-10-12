import { canManageWorkspace, canReview, type MembershipRole } from "./roles";

const EXTERNAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/;
const TAG_MAX_LENGTH = 24;
const TAG_MAX_COUNT = 12;

export function canManageSites(role: MembershipRole): boolean {
  return canManageWorkspace(role);
}

/** Site tree is staff-only. Client viewers use the actions portal. */
export function canViewSites(role: MembershipRole): boolean {
  return role !== "client_viewer";
}

export function canAssignFromSite(role: MembershipRole): boolean {
  return canManageWorkspace(role) || canReview(role);
}

export function normalizeExternalId(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim().replace(/\s+/g, "-");
  if (trimmed.length === 0) return null;
  if (!EXTERNAL_ID.test(trimmed)) return null;
  return trimmed;
}

export function externalIdError(raw: string | null | undefined): string | null {
  if (raw == null || raw.trim().length === 0) return null;
  if (normalizeExternalId(raw)) return null;
  return "Use a CSV-friendly id: letters, numbers, dot, underscore, or hyphen, up to 63 characters.";
}

export function normalizeTags(raw: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const tag = item.trim().toLowerCase().slice(0, TAG_MAX_LENGTH);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= TAG_MAX_COUNT) break;
  }
  return out;
}

export function parseTagsField(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return normalizeTags(raw.split(/[,#]+/));
}

export type SiteParentRow = { id: string; parentId: string | null };

export function wouldCreateSiteCycle(
  rows: readonly SiteParentRow[],
  siteId: string,
  newParentId: string | null,
): boolean {
  if (!newParentId) return false;
  if (newParentId === siteId) return true;
  const byId = new Map(rows.map((row) => [row.id, row]));
  if (!byId.has(newParentId)) return true;
  const seen = new Set<string>([siteId]);
  let cursor: string | null = newParentId;
  while (cursor) {
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }
  return false;
}

export function siteTreeChildren<T extends SiteParentRow>(
  rows: readonly T[],
  parentId: string | null,
): T[] {
  return rows.filter((row) => row.parentId === parentId);
}
