"use server";

import { revalidatePath } from "next/cache";
import { applyInspectionOpsForInspector, downloadAssignmentForInspector } from "../inspection-sync";

export async function downloadAssignmentBundleAction(inspectionId: string) {
  return downloadAssignmentForInspector(inspectionId);
}

export async function applyInspectionOpsAction(input: {
  inspectionId: string;
  operations: unknown;
}) {
  const result = await applyInspectionOpsForInspector(input);
  if (result.ok) {
    revalidatePath("/app/inspections");
    revalidatePath(`/app/inspections/${input.inspectionId}`);
  }
  return result;
}
