import { describe, expect, it } from "vitest";
import { propertyConditionPack } from "./packs/property-condition";
import { findCircularRuleCycle, summarizeRule } from "./template-rules";
import { validateForPublish } from "./template-ops";
import { parseTemplateSchema, type TemplateSchema } from "./template-schema";

describe("template rules", () => {
  it("parses the property pack and allows publish", () => {
    const schema = parseTemplateSchema(propertyConditionPack.schema);
    expect(validateForPublish(schema)).toEqual([]);
  });

  it("writes a readable WHEN/THEN summary", () => {
    const schema = parseTemplateSchema(propertyConditionPack.schema);
    const rule = schema.rules[0]!;
    expect(summarizeRule(schema, rule)).toMatch(/WHEN Smoke alarm is fail THEN create finding/i);
  });

  it("blocks a circular show/hide pair", () => {
    const schema: TemplateSchema = {
      scoring: { mode: "percent_pass", excludeNa: true },
      sections: [
        {
          id: "s1",
          key: "s1",
          title: "Checks",
          repeatable: false,
          fields: [
            {
              id: "a",
              key: "a",
              label: "Alarm",
              type: "pass_fail",
              required: false,
              options: [],
              requireEvidenceOnFail: false,
              requireCaption: false,
              allowAnnotation: false,
              includeInScoring: true,
            },
            {
              id: "b",
              key: "b",
              label: "Photo",
              type: "photo_group",
              required: false,
              options: [],
              requireEvidenceOnFail: false,
              requireCaption: false,
              allowAnnotation: false,
              includeInScoring: true,
            },
          ],
        },
      ],
      rules: [
        {
          id: "r1",
          join: "all",
          conditions: [{ fieldId: "a", operator: "is_fail" }],
          then: { action: "show", targetFieldId: "b" },
        },
        {
          id: "r2",
          join: "all",
          conditions: [{ fieldId: "b", operator: "eq", value: "1" }],
          then: { action: "hide", targetFieldId: "a" },
        },
      ],
    };
    const cycle = findCircularRuleCycle(schema);
    expect(cycle).not.toBeNull();
    expect(validateForPublish(schema).some((issue) => /circular/i.test(issue.message))).toBe(true);
  });
});
