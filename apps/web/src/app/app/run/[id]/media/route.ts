import { z } from "zod";
import { DEFAULT_UPLOAD_POLICY } from "@inspectstack/domain";
import { createStorageAdapter, putInspectionMediaBytes } from "@inspectstack/db";
import { getDb } from "@/lib/db";
import { jsonError, requireInspector } from "@/lib/inspection-sync";

export const dynamic = "force-dynamic";

const mediaIdSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const inspectionId = mediaIdSchema.safeParse(id);
  if (!inspectionId.success) return jsonError("invalid");

  const access = await requireInspector();
  if (!access.ok) return jsonError(access.error);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("invalid");
  }

  const mediaIdRaw = form.get("mediaId");
  const file = form.get("file");
  const mediaId = mediaIdSchema.safeParse(typeof mediaIdRaw === "string" ? mediaIdRaw : "");
  if (!mediaId.success || !(file instanceof File)) return jsonError("invalid");
  if (file.size <= 0 || file.size > DEFAULT_UPLOAD_POLICY.maxBytes) return jsonError("invalid");

  const contentType = file.type || "application/octet-stream";
  if (
    !DEFAULT_UPLOAD_POLICY.allowedContentTypes.includes(
      contentType as (typeof DEFAULT_UPLOAD_POLICY.allowedContentTypes)[number],
    ) &&
    contentType !== "image/png"
  ) {
    return jsonError("invalid");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await putInspectionMediaBytes(
    getDb(),
    createStorageAdapter(),
    { organizationId: access.session.active.organizationId },
    {
      inspectionId: inspectionId.data,
      mediaId: mediaId.data,
      bytes,
      contentType,
    },
  );
  if (!stored.ok) {
    if (stored.error === "not_found") {
      return Response.json({ ok: false, error: "manifest_pending" }, { status: 409 });
    }
    return jsonError("invalid");
  }

  return Response.json(
    { ok: true, storageKey: stored.storageKey, mediaId: mediaId.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
