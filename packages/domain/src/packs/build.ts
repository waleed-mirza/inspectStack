import type { FieldType, FindingSeverity, RuleAction, RuleOperator } from "../template-fields";
import type {
  TemplateField,
  TemplateRule,
  TemplateSchema,
  TemplateSection,
} from "../template-schema";

export type StarterPack = {
  key: string;
  name: string;
  description: string;
  schema: TemplateSchema;
};

export function field(
  id: string,
  label: string,
  type: FieldType,
  extra: Partial<Omit<TemplateField, "id" | "label" | "type">> = {},
): TemplateField {
  return {
    id,
    key: extra.key ?? id.replace(/^fld_/, ""),
    label,
    type,
    required: extra.required ?? false,
    helpText: extra.helpText,
    options: extra.options ?? [],
    min: extra.min,
    max: extra.max,
    unit: extra.unit,
    requireEvidenceOnFail: extra.requireEvidenceOnFail ?? type === "pass_fail",
    requireCaption: extra.requireCaption ?? false,
    allowAnnotation: extra.allowAnnotation ?? type === "photo_group",
    photoMin: extra.photoMin ?? (type === "photo_group" ? 0 : undefined),
    photoMax: extra.photoMax ?? (type === "photo_group" ? 8 : undefined),
    includeInScoring: extra.includeInScoring ?? type === "pass_fail",
    computedKind: extra.computedKind,
    computedSectionId: extra.computedSectionId,
    acknowledgmentBody: extra.acknowledgmentBody,
  };
}

export function section(
  id: string,
  title: string,
  fields: TemplateField[],
  extra: Partial<Pick<TemplateSection, "repeatable" | "key">> = {},
): TemplateSection {
  return {
    id,
    key: extra.key ?? id.replace(/^sec_/, ""),
    title,
    repeatable: extra.repeatable ?? false,
    fields,
  };
}

export function whenThen(
  id: string,
  fieldId: string,
  operator: RuleOperator,
  action: RuleAction,
  extra: {
    value?: string | number | boolean;
    targetFieldId?: string;
    findingTitle?: string;
    findingSeverity?: FindingSeverity;
    join?: "all" | "any";
  } = {},
): TemplateRule {
  return {
    id,
    join: extra.join ?? "all",
    conditions: [{ fieldId, operator, value: extra.value }],
    then: {
      action,
      targetFieldId: extra.targetFieldId,
      findingTitle: extra.findingTitle,
      findingSeverity: extra.findingSeverity,
    },
  };
}

export function packSchema(
  scoring: TemplateSchema["scoring"],
  sections: TemplateSection[],
  rules: TemplateRule[],
): TemplateSchema {
  return { scoring, sections, rules };
}
