import { evaluateFieldState, listFields } from "./template-rules";
import { scoreTemplate } from "./template-scoring";
import type { TemplateField, TemplateSchema } from "./template-schema";
import type { MediaManifest } from "./assignment-bundle";

export type InspectionIssue = {
  fieldId: string;
  fieldKey: string;
  code: "required" | "evidence" | "photo_min" | "signature";
  message: string;
};

export type RunnerProgress = {
  total: number;
  answered: number;
  percent: number;
  score: ReturnType<typeof scoreTemplate>;
};

function scalarResult(value: unknown): unknown {
  if (value && typeof value === "object" && "result" in value) {
    return (value as { result: unknown }).result;
  }
  return value;
}

export function answersByFieldId(
  schema: TemplateSchema,
  responses: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of listFields(schema)) {
    if (Object.prototype.hasOwnProperty.call(responses, field.id)) {
      out[field.id] = responses[field.id];
    } else if (Object.prototype.hasOwnProperty.call(responses, field.key)) {
      out[field.id] = responses[field.key];
    }
  }
  return out;
}

function mediaForField(field: TemplateField, media: MediaManifest[]): MediaManifest[] {
  return media.filter((item) => item.fieldKey === field.key || item.fieldKey === field.id);
}

function photoIdsFromValue(value: unknown): string[] {
  if (value && typeof value === "object" && "mediaIds" in value) {
    const ids = (value as { mediaIds: unknown }).mediaIds;
    if (Array.isArray(ids)) return ids.filter((id): id is string => typeof id === "string");
  }
  return [];
}

export function isFieldAnswered(
  field: TemplateField,
  value: unknown,
  media: MediaManifest[],
): boolean {
  if (field.type === "computed") return true;
  if (field.type === "photo_group") {
    return mediaForField(field, media).length > 0 || photoIdsFromValue(value).length > 0;
  }
  if (field.type === "signature" || field.type === "initials") {
    if (typeof value === "string") return value.trim().length > 0;
    if (value && typeof value === "object" && "dataUrl" in value) {
      return String((value as { dataUrl: unknown }).dataUrl ?? "").length > 0;
    }
    return mediaForField(field, media).length > 0;
  }
  if (field.type === "gps") {
    if (!value || typeof value !== "object") return false;
    const row = value as { latitude?: unknown; longitude?: unknown };
    return Number.isFinite(row.latitude) && Number.isFinite(row.longitude);
  }
  if (field.type === "acknowledgment") {
    return (
      value === true ||
      value === "acknowledged" ||
      (typeof value === "string" && value.trim().length > 0)
    );
  }
  if (field.type === "boolean") return value === true || value === false;
  if (field.type === "pass_fail") {
    const result = scalarResult(value);
    return result === "pass" || result === "fail" || result === "na";
  }
  if (field.type === "multi_select") return Array.isArray(value) && value.length > 0;
  if (
    field.type === "numeric" ||
    field.type === "currency" ||
    field.type === "temperature" ||
    field.type === "rating"
  ) {
    return typeof value === "number" && Number.isFinite(value);
  }
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null && value !== "";
}

export function validateForSubmit(
  schema: TemplateSchema,
  responses: Record<string, unknown>,
  media: MediaManifest[] = [],
): InspectionIssue[] {
  const byId = answersByFieldId(schema, responses);
  const state = evaluateFieldState(schema, byId);
  const issues: InspectionIssue[] = [];

  for (const field of listFields(schema)) {
    if (field.type === "computed") continue;
    if (state.hidden.has(field.id)) continue;

    const value = byId[field.id];
    const photos = mediaForField(field, media);
    const required = state.required.has(field.id);
    const answered = isFieldAnswered(field, value, media);

    if (required && !answered) {
      const isEvidence =
        field.type === "photo_group" ||
        field.type === "signature" ||
        field.requireEvidenceOnFail === true;
      issues.push({
        fieldId: field.id,
        fieldKey: field.key,
        code: field.type === "signature" ? "signature" : isEvidence ? "evidence" : "required",
        message:
          field.type === "signature"
            ? `${field.label} is required before submit.`
            : isEvidence
              ? `${field.label} needs evidence before submit.`
              : `${field.label} is required.`,
      });
    }

    if (field.type === "photo_group") {
      const min = field.photoMin ?? (required ? 1 : 0);
      if (photos.length + photoIdsFromValue(value).length < min) {
        if (!issues.some((issue) => issue.fieldId === field.id && issue.code === "evidence")) {
          issues.push({
            fieldId: field.id,
            fieldKey: field.key,
            code: "photo_min",
            message: `${field.label} needs at least ${min} photo${min === 1 ? "" : "s"}.`,
          });
        }
      }
    }
  }

  return issues;
}

export function runnerProgress(
  schema: TemplateSchema,
  responses: Record<string, unknown>,
  media: MediaManifest[] = [],
): RunnerProgress {
  const byId = answersByFieldId(schema, responses);
  const state = evaluateFieldState(schema, byId);
  const visible = listFields(schema).filter(
    (field) => field.type !== "computed" && !state.hidden.has(field.id),
  );
  const answered = visible.filter((field) => isFieldAnswered(field, byId[field.id], media));
  const total = visible.length;
  const score = scoreTemplate(
    schema,
    Object.entries(responses).map(([fieldKey, value]) => ({ fieldKey, value })),
  );
  return {
    total,
    answered: answered.length,
    percent: total === 0 ? 0 : Math.round((answered.length / total) * 100),
    score,
  };
}

export function submitBlockedReason(issues: InspectionIssue[]): string | null {
  if (issues.length === 0) return null;
  const evidence = issues.filter(
    (issue) => issue.code === "evidence" || issue.code === "photo_min",
  );
  if (evidence.length > 0) {
    return "Required evidence is missing. Finish those items before submit.";
  }
  if (issues.some((issue) => issue.code === "signature")) {
    return "A required signature is missing.";
  }
  return `${issues.length} required ${issues.length === 1 ? "answer is" : "answers are"} missing.`;
}
