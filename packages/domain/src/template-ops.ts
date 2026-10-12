import { findCircularRuleCycle, listFields, summarizeRule } from "./template-rules";
import {
  emptyTemplateSchema,
  type TemplateField,
  type TemplateSchema,
  type TemplateSection,
} from "./template-schema";
import type { FieldType } from "./template-fields";

const UNNAMED = /^(untitled( field| section)?|new field|new section)?$/i;

export function slugifyTemplateName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "template";
}

export function newId(prefix: string): string {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const uuid = webCrypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${uuid}`;
}

function uniqueKey(existing: string[], base: string): string {
  const root = slugifyTemplateName(base).replaceAll("-", "_") || "field";
  if (!existing.includes(root)) return root;
  let n = 2;
  while (existing.includes(`${root}_${n}`)) n += 1;
  return `${root}_${n}`;
}

export function createSection(title = "Untitled section"): TemplateSection {
  const id = newId("sec");
  return {
    id,
    key: slugifyTemplateName(title).replaceAll("-", "_") || "section",
    title,
    repeatable: false,
    fields: [],
  };
}

export function createField(
  type: FieldType = "pass_fail",
  existingKeys: string[] = [],
): TemplateField {
  const id = newId("fld");
  return {
    id,
    key: uniqueKey(existingKeys, "untitled_field"),
    label: "Untitled field",
    type,
    required: false,
    options:
      type === "single_select" || type === "multi_select"
        ? [{ value: "option_1", label: "Option 1" }]
        : [],
    requireEvidenceOnFail: type === "pass_fail",
    requireCaption: false,
    allowAnnotation: type === "photo_group",
    includeInScoring: type === "pass_fail",
    min: type === "rating" ? 1 : undefined,
    max: type === "rating" ? 5 : type === "photo_group" ? 8 : undefined,
    photoMin: type === "photo_group" ? 0 : undefined,
    photoMax: type === "photo_group" ? 8 : undefined,
    computedKind: type === "computed" ? "overall_status" : undefined,
  };
}

export function createBlankSchema(): TemplateSchema {
  return emptyTemplateSchema();
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (!item) return items;
  next.splice(to, 0, item);
  return next;
}

export type PublishIssue = { path: string; message: string };

export function validateForPublish(schema: TemplateSchema): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (schema.sections.length === 0) {
    issues.push({ path: "sections", message: "Add at least one section before publishing." });
  }

  const keys = new Set<string>();
  for (const [sectionIndex, section] of schema.sections.entries()) {
    if (!section.title.trim() || UNNAMED.test(section.title.trim())) {
      issues.push({
        path: `sections.${sectionIndex}.title`,
        message: "Every section needs a name.",
      });
    }
    for (const [fieldIndex, field] of section.fields.entries()) {
      const path = `sections.${sectionIndex}.fields.${fieldIndex}`;
      if (!field.label.trim() || UNNAMED.test(field.label.trim())) {
        issues.push({ path: `${path}.label`, message: "Every field needs a name." });
      }
      if (keys.has(field.key)) {
        issues.push({ path: `${path}.key`, message: `Duplicate field key “${field.key}”.` });
      }
      keys.add(field.key);
      if (
        (field.type === "single_select" || field.type === "multi_select") &&
        field.options.filter((option) => option.label.trim() && option.value.trim()).length === 0
      ) {
        issues.push({
          path: `${path}.options`,
          message: `${field.label || "Select field"} needs at least one option.`,
        });
      }
      if (field.type === "photo_group") {
        const min = field.photoMin ?? 0;
        const max = field.photoMax ?? min;
        if (max < min) {
          issues.push({
            path: `${path}.photoMax`,
            message: "Photo maximum cannot be below the minimum.",
          });
        }
      }
      if (field.type === "rating") {
        const min = field.min ?? 1;
        const max = field.max ?? 5;
        if (max <= min) {
          issues.push({
            path: `${path}.max`,
            message: "Rating maximum must be greater than the minimum.",
          });
        }
      }
    }
  }

  for (const [index, rule] of schema.rules.entries()) {
    if (rule.conditions.length === 0) {
      issues.push({ path: `rules.${index}`, message: "Each rule needs a WHEN condition." });
    }
    if (rule.then.action === "create_finding" && !rule.then.findingTitle?.trim()) {
      issues.push({
        path: `rules.${index}.then`,
        message: "Create-finding rules need a finding title.",
      });
    }
    if (rule.then.action !== "create_finding" && !rule.then.targetFieldId) {
      issues.push({ path: `rules.${index}.then`, message: "This rule needs a target field." });
    }
  }

  const cycle = findCircularRuleCycle(schema);
  if (cycle) {
    issues.push({
      path: "rules",
      message: `Circular rule blocked: ${cycle.join(" → ")}.`,
    });
  }

  return issues;
}

export function assertDraftMutable(status: string): void {
  if (status !== "draft") {
    throw new Error("Published versions are locked. Edit a new draft instead.");
  }
}

export function exportTemplateJson(input: {
  name: string;
  packKey?: string | null;
  schema: TemplateSchema;
}): string {
  return `${JSON.stringify({ name: input.name, packKey: input.packKey ?? null, schema: input.schema }, null, 2)}\n`;
}

export { summarizeRule };
