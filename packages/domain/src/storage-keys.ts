const SAFE_EXT = /^[a-z0-9]{1,8}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const EVIDENCE_BUCKET = "evidence";

export function evidenceObjectKey(input: {
  organizationId: string;
  inspectionId: string;
  mediaId: string;
  random: string;
  ext: string;
}): string {
  const ext = input.ext.replace(/^\./, "").toLowerCase();
  if (!UUID.test(input.organizationId)) {
    throw new Error("Storage key requires a uuid organization id");
  }
  if (!UUID.test(input.inspectionId) || !UUID.test(input.mediaId)) {
    throw new Error("Storage key requires uuid inspection and media ids");
  }
  if (!SAFE_EXT.test(ext)) {
    throw new Error("Storage key extension is not allowed");
  }
  if (!/^[a-z0-9_-]{8,64}$/i.test(input.random)) {
    throw new Error("Storage key random segment is invalid");
  }
  return `${input.organizationId}/${input.inspectionId}/${input.mediaId}/${input.random}.${ext}`;
}

export function reportObjectKey(input: {
  organizationId: string;
  inspectionId: string;
  snapshotId: string;
}): string {
  if (
    !UUID.test(input.organizationId) ||
    !UUID.test(input.inspectionId) ||
    !UUID.test(input.snapshotId)
  ) {
    throw new Error("Report storage key requires uuid organization, inspection, and snapshot ids");
  }
  return `${input.organizationId}/reports/${input.inspectionId}/${input.snapshotId}/report.pdf`;
}

export function brandingObjectKey(input: { organizationId: string; ext: string }): string {
  const ext = input.ext.replace(/^\./, "").toLowerCase();
  if (!UUID.test(input.organizationId)) {
    throw new Error("Storage key requires a uuid organization id");
  }
  if (!SAFE_EXT.test(ext)) {
    throw new Error("Storage key extension is not allowed");
  }
  return `${input.organizationId}/branding/logo.${ext}`;
}

/** Rejects keys that are not prefixed by the resolved organization. */
export function assertOrgPrefixedKey(organizationId: string, key: string): void {
  const prefix = `${organizationId}/`;
  if (!key.startsWith(prefix) || key.includes("..") || key.startsWith("/")) {
    throw new Error("Storage key is not owned by this organization");
  }
}
