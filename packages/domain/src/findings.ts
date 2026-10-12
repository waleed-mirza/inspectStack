import { FINDING_SEVERITIES, type FindingSeverity } from "./template-fields";
import { FINDING_STATUSES, type FindingStatus } from "./statuses";
import { fieldById, listFields, ruleMatches } from "./template-rules";
import type { TemplateSchema } from "./template-schema";

export const FINDING_TRANSITIONS: Record<FindingStatus, readonly FindingStatus[]> = {
  open: ["acknowledged", "in_progress"],
  acknowledged: ["in_progress"],
  in_progress: ["ready_for_review"],
  ready_for_review: ["closed", "in_progress"],
  closed: ["reopened"],
  reopened: ["in_progress"],
};

export function canTransitionFinding(from: FindingStatus, to: FindingStatus): boolean {
  return FINDING_TRANSITIONS[from].includes(to);
}

export function parseFindingSeverity(value: string | null | undefined): FindingSeverity {
  if (value && (FINDING_SEVERITIES as readonly string[]).includes(value)) {
    return value as FindingSeverity;
  }
  return "medium";
}

export function parseFindingStatus(value: string | null | undefined): FindingStatus {
  if (value && (FINDING_STATUSES as readonly string[]).includes(value)) {
    return value as FindingStatus;
  }
  return "open";
}

export type DerivedFinding = {
  fieldKey: string;
  title: string;
  severity: FindingSeverity;
  notes: string | null;
};

function passFailOf(value: unknown): "pass" | "fail" | "na" | null {
  if (value === "pass" || value === "fail" || value === "na") return value;
  if (value && typeof value === "object" && "result" in value) {
    const result = (value as { result: unknown }).result;
    if (result === "pass" || result === "fail" || result === "na") return result;
  }
  return null;
}

function answerForField(
  schema: TemplateSchema,
  responses: Record<string, unknown>,
  fieldId: string,
): unknown {
  if (Object.prototype.hasOwnProperty.call(responses, fieldId)) return responses[fieldId];
  const field = fieldById(schema, fieldId);
  if (field && Object.prototype.hasOwnProperty.call(responses, field.key)) {
    return responses[field.key];
  }
  return undefined;
}

/** Findings created from fail answers and `create_finding` rules. Deduped by field key + title. */
export function deriveFindingsFromAnswers(
  schema: TemplateSchema,
  responses: Record<string, unknown>,
): DerivedFinding[] {
  const byId: Record<string, unknown> = {};
  for (const field of listFields(schema)) {
    byId[field.id] = answerForField(schema, responses, field.id);
  }

  const found: DerivedFinding[] = [];
  const seen = new Set<string>();

  function push(row: DerivedFinding) {
    const key = `${row.fieldKey}::${row.title}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push(row);
  }

  for (const rule of schema.rules) {
    if (rule.then.action !== "create_finding") continue;
    if (!ruleMatches(schema, rule, byId)) continue;
    const sourceId = rule.conditions[0]?.fieldId;
    const field = sourceId ? fieldById(schema, sourceId) : undefined;
    push({
      fieldKey: field?.key ?? sourceId ?? "finding",
      title: rule.then.findingTitle ?? field?.label ?? "Finding",
      severity: rule.then.findingSeverity ?? "medium",
      notes: field ? `${field.label} failed.` : null,
    });
  }

  for (const field of listFields(schema)) {
    if (field.type !== "pass_fail") continue;
    if (passFailOf(byId[field.id]) !== "fail") continue;
    push({
      fieldKey: field.key,
      title: field.label,
      severity: field.requireEvidenceOnFail ? "high" : "medium",
      notes: `${field.label} failed.`,
    });
  }

  return found;
}
