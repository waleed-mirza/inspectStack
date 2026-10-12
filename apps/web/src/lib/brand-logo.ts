import { isBrandingObjectKey, type WorkspaceBranding } from "@inspectstack/domain";
import { createStorageAdapter } from "@inspectstack/db";

export async function resolveLogoSrc(
  organizationId: string,
  branding: WorkspaceBranding | null | undefined,
): Promise<string | null> {
  const logoUrl = branding?.logoUrl;
  if (!logoUrl) return null;
  if (
    logoUrl.startsWith("https://") ||
    logoUrl.startsWith("http://") ||
    logoUrl.startsWith("data:")
  ) {
    return logoUrl;
  }
  if (!isBrandingObjectKey(logoUrl, organizationId)) return null;
  try {
    return await createStorageAdapter().signedDownloadUrl(organizationId, logoUrl, 60 * 60);
  } catch {
    return null;
  }
}

export async function loadLogoBytes(
  organizationId: string,
  branding: WorkspaceBranding | null | undefined,
): Promise<Buffer | null> {
  const src = await resolveLogoSrc(organizationId, branding);
  if (!src) return null;
  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}
