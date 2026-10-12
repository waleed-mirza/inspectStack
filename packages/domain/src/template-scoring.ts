import { listFields } from "./template-rules";
import type { TemplateSchema } from "./template-schema";

export type PassFailValue = "pass" | "fail" | "na" | null;

export type FieldResponse = {
  fieldId?: string;
  fieldKey: string;
  value: unknown;
};

function passFailOf(value: unknown): PassFailValue {
  if (value === "pass" || value === "fail" || value === "na") return value;
  if (value && typeof value === "object" && "result" in value) {
    const result = (value as { result: unknown }).result;
    if (result === "pass" || result === "fail" || result === "na") return result;
  }
  return null;
}

export function scoreTemplate(
  schema: TemplateSchema,
  responses: FieldResponse[],
): {
  mode: TemplateSchema["scoring"]["mode"];
  percentPass: number | null;
  trafficLight: "pass" | "fail" | "incomplete";
  failCount: number;
  passCount: number;
  naCount: number;
  unanswered: number;
} {
  const byKey = new Map(responses.map((row) => [row.fieldKey, row]));
  const byId = new Map(responses.filter((row) => row.fieldId).map((row) => [row.fieldId!, row]));
  const scored = listFields(schema).filter(
    (field) => field.type === "pass_fail" && field.includeInScoring !== false,
  );

  let passCount = 0;
  let failCount = 0;
  let naCount = 0;
  let unanswered = 0;
  for (const field of scored) {
    const response = byId.get(field.id) ?? byKey.get(field.key);
    const result = passFailOf(response?.value);
    if (result === "pass") passCount += 1;
    else if (result === "fail") failCount += 1;
    else if (result === "na") naCount += 1;
    else unanswered += 1;
  }

  const denom = schema.scoring.excludeNa ? passCount + failCount : passCount + failCount + naCount;
  const percentPass = denom === 0 ? null : Math.round((passCount / denom) * 100);
  const trafficLight: "pass" | "fail" | "incomplete" =
    failCount > 0 ? "fail" : unanswered > 0 ? "incomplete" : "pass";

  return {
    mode: schema.scoring.mode,
    percentPass,
    trafficLight,
    failCount,
    passCount,
    naCount,
    unanswered,
  };
}

export function fieldRequiresEvidence(
  schema: TemplateSchema,
  fieldId: string,
  value: unknown,
): boolean {
  const field = listFields(schema).find((item) => item.id === fieldId);
  if (!field) return false;
  if (field.type === "pass_fail" && field.requireEvidenceOnFail && passFailOf(value) === "fail") {
    return true;
  }
  return schema.rules.some((rule) => {
    if (rule.then.action !== "require") return false;
    if (rule.then.targetFieldId !== fieldId && field.type !== "photo_group") return false;
    const matched = rule.conditions.map((condition) => {
      if (condition.fieldId !== fieldId && condition.operator !== "is_fail") return false;
      return condition.operator === "is_fail" && passFailOf(value) === "fail";
    });
    return rule.join === "any" ? matched.some(Boolean) : matched.every(Boolean);
  });
}
