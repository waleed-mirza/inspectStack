import { z } from "zod";
import {
  COMPUTED_KINDS,
  FIELD_TYPES,
  FINDING_SEVERITIES,
  RULE_ACTIONS,
  RULE_OPERATORS,
  SCORING_MODES,
} from "./template-fields";

const selectOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

export const templateFieldSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  label: z.string(),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().default(false),
  helpText: z.string().optional(),
  options: z.array(selectOptionSchema).default([]),
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string().optional(),
  requireEvidenceOnFail: z.boolean().default(false),
  requireCaption: z.boolean().default(false),
  allowAnnotation: z.boolean().default(false),
  photoMin: z.number().int().min(0).optional(),
  photoMax: z.number().int().min(0).optional(),
  includeInScoring: z.boolean().default(true),
  computedKind: z.enum(COMPUTED_KINDS).optional(),
  computedSectionId: z.string().optional(),
  acknowledgmentBody: z.string().optional(),
});

export const templateSectionSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  title: z.string(),
  repeatable: z.boolean().default(false),
  fields: z.array(templateFieldSchema).default([]),
});

export const ruleConditionSchema = z.object({
  fieldId: z.string().min(1),
  operator: z.enum(RULE_OPERATORS),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const ruleThenSchema = z.object({
  action: z.enum(RULE_ACTIONS),
  targetFieldId: z.string().optional(),
  findingTitle: z.string().optional(),
  findingSeverity: z.enum(FINDING_SEVERITIES).optional(),
});

export const templateRuleSchema = z.object({
  id: z.string().min(1),
  join: z.enum(["all", "any"]).default("all"),
  conditions: z.array(ruleConditionSchema).default([]),
  then: ruleThenSchema,
});

export const scoringSchema = z.object({
  mode: z.enum(SCORING_MODES).default("percent_pass"),
  excludeNa: z.boolean().default(true),
});

export const templateSchema = z.object({
  scoring: scoringSchema.default({ mode: "percent_pass", excludeNa: true }),
  sections: z.array(templateSectionSchema).default([]),
  rules: z.array(templateRuleSchema).default([]),
});

export type TemplateField = z.infer<typeof templateFieldSchema>;
export type TemplateSection = z.infer<typeof templateSectionSchema>;
export type TemplateRule = z.infer<typeof templateRuleSchema>;
export type RuleCondition = z.infer<typeof ruleConditionSchema>;
export type RuleThen = z.infer<typeof ruleThenSchema>;
export type ScoringConfig = z.infer<typeof scoringSchema>;
export type TemplateSchema = z.infer<typeof templateSchema>;

export function emptyTemplateSchema(): TemplateSchema {
  return {
    scoring: { mode: "percent_pass", excludeNa: true },
    sections: [],
    rules: [],
  };
}

function coerceRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hydrateIds(input: unknown): unknown {
  const raw = coerceRecord(input);
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  return {
    scoring: raw.scoring,
    rules: Array.isArray(raw.rules) ? raw.rules : [],
    sections: sections.map((section, sectionIndex) => {
      const row = coerceRecord(section);
      const fields = Array.isArray(row.fields) ? row.fields : [];
      return {
        ...row,
        id: typeof row.id === "string" && row.id ? row.id : `sec_${sectionIndex}`,
        key: typeof row.key === "string" && row.key ? row.key : `section_${sectionIndex}`,
        title: typeof row.title === "string" ? row.title : "",
        fields: fields.map((field, fieldIndex) => {
          const item = coerceRecord(field);
          return {
            ...item,
            id:
              typeof item.id === "string" && item.id
                ? item.id
                : `fld_${sectionIndex}_${fieldIndex}`,
            key:
              typeof item.key === "string" && item.key
                ? item.key
                : `field_${sectionIndex}_${fieldIndex}`,
            label: typeof item.label === "string" ? item.label : "",
          };
        }),
      };
    }),
  };
}

export function parseTemplateSchema(input: unknown): TemplateSchema {
  return templateSchema.parse(hydrateIds(input ?? emptyTemplateSchema()));
}

export function safeParseTemplateSchema(input: unknown) {
  return templateSchema.safeParse(input ?? emptyTemplateSchema());
}
