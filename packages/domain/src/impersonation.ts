export const IMPERSONATION_REASON_MIN = 8;
export const IMPERSONATION_REASON_MAX = 280;
export const IMPERSONATION_COOKIE = "inspectstack-impersonate";

export function canImpersonate(isPlatformAdmin: boolean): boolean {
  return isPlatformAdmin === true;
}

export function normalizeImpersonationReason(raw: string | null | undefined): string | null {
  const reason = (raw ?? "").trim().replace(/\s+/g, " ");
  if (reason.length < IMPERSONATION_REASON_MIN) return null;
  if (reason.length > IMPERSONATION_REASON_MAX) return null;
  return reason;
}

export function impersonationBannerCopy(input: {
  organizationName: string;
  targetEmail?: string | null;
  reason: string;
}): { title: string; detail: string } {
  const who = input.targetEmail ? ` as ${input.targetEmail}` : "";
  return {
    title: `Viewing ${input.organizationName}${who}`,
    detail: input.reason,
  };
}
