export const SAFE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type SafeImageType = (typeof SAFE_IMAGE_TYPES)[number];

export const MAX_LOGO_BYTES = 512 * 1024;
export const MAX_EVIDENCE_BYTES = 12 * 1024 * 1024;

export function normalizeContentType(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().split(";")[0]!.trim();
}

export function isSafeUploadContentType(value: string | null | undefined): boolean {
  const type = normalizeContentType(value);
  if (type === "image/jpg") return true;
  return (SAFE_IMAGE_TYPES as readonly string[]).includes(type);
}

export function sniffImageType(bytes: Uint8Array): SafeImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function assertSafeImageUpload(
  bytes: Uint8Array,
  declaredType: string | null | undefined,
  maxBytes = MAX_LOGO_BYTES,
): { ok: true; contentType: SafeImageType } | { ok: false; error: "type" | "size" | "mismatch" } {
  if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) return { ok: false, error: "size" };
  const sniffed = sniffImageType(bytes);
  if (!sniffed) return { ok: false, error: "type" };
  const declared = normalizeContentType(declaredType);
  if (declared && isSafeUploadContentType(declared)) {
    const mapped = declared === "image/jpg" ? "image/jpeg" : declared;
    if (mapped !== sniffed) return { ok: false, error: "mismatch" };
  }
  return { ok: true, contentType: sniffed };
}

export function extForImageType(type: SafeImageType): "jpg" | "png" | "webp" {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}
