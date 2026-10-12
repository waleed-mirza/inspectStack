const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOKEN_PREFIX = "ISQ-";

export type QrLaunchError = "unauthenticated" | "denied" | "archived" | "not_found";

export type QrLaunchResult = { ok: true; assetId: string } | { ok: false; error: QrLaunchError };

export type QrLaunchAsset = {
  id: string;
  organizationId: string;
  archivedAt: string | Date | null;
};

export function newQrToken(bytes: Uint8Array): string {
  let out = TOKEN_PREFIX;
  for (let i = 0; i < 8; i += 1) {
    out += CODE_ALPHABET[(bytes[i] ?? 0) % CODE_ALPHABET.length];
  }
  return out;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const g = globalThis as unknown as {
    crypto?: { getRandomValues?: (buffer: Uint8Array) => Uint8Array };
  };
  if (g.crypto?.getRandomValues) g.crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

export function mintQrToken(): string {
  return newQrToken(randomBytes(8));
}

/** Keypad entry: strip spaces, uppercase, keep a single hyphen after ISQ. */
export function normalizeQrToken(raw: string): string {
  const compact = raw.trim().toUpperCase().replace(/[\s_]/g, "");
  if (compact.startsWith("ISQ") && !compact.startsWith(TOKEN_PREFIX)) {
    return `ISQ-${compact.slice(3).replace(/-/g, "")}`;
  }
  if (compact.startsWith(TOKEN_PREFIX)) {
    return `${TOKEN_PREFIX}${compact.slice(TOKEN_PREFIX.length).replace(/-/g, "")}`;
  }
  return compact.replace(/-/g, "");
}

export function qrLaunchPath(token: string): string {
  return `/app/go/${encodeURIComponent(normalizeQrToken(token))}`;
}

/**
 * Wrong-org membership is denied, not a leaked asset. Callers must use
 * `qrLaunchDeniedMessage` so not_found and denied render the same copy.
 */
export function planQrLaunch(input: {
  authenticated: boolean;
  membershipOrgId: string | null | undefined;
  asset: QrLaunchAsset | null;
}): QrLaunchResult {
  if (!input.authenticated) return { ok: false, error: "unauthenticated" };
  if (!input.asset) return { ok: false, error: "not_found" };
  if (!input.membershipOrgId || input.membershipOrgId !== input.asset.organizationId) {
    return { ok: false, error: "denied" };
  }
  if (input.asset.archivedAt) return { ok: false, error: "archived" };
  return { ok: true, assetId: input.asset.id };
}

export function qrLaunchDeniedMessage(error: QrLaunchError): string {
  switch (error) {
    case "unauthenticated":
      return "Sign in to open this QR code.";
    case "archived":
      return "This asset is archived and cannot start an inspection.";
    case "denied":
    case "not_found":
      return "This QR does not match a site in your workspace.";
    default:
      return "This QR does not match a site in your workspace.";
  }
}
