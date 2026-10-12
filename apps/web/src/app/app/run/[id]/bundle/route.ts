import { revalidatePath } from "next/cache";
import {
  applyInspectionOpsForInspector,
  downloadAssignmentForInspector,
  jsonError,
} from "@/lib/inspection-sync";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await downloadAssignmentForInspector(id);
  if (!result.ok) return jsonError(result.error);
  return Response.json(
    { ok: true, bundle: result.bundle },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid");
  }

  const result = await applyInspectionOpsForInspector({
    inspectionId: id,
    operations: body,
  });
  if (!result.ok) return jsonError(result.error);

  revalidatePath("/app/inspections");
  revalidatePath(`/app/inspections/${id}`);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
