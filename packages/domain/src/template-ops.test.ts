import { describe, expect, it } from "vitest";
import { STARTER_PACKS } from "./packs";
import { emptyTemplateSchema, parseTemplateSchema } from "./template-schema";
import { assertDraftMutable, slugifyTemplateName, validateForPublish } from "./template-ops";
import { scoreTemplate } from "./template-scoring";

describe("template ops", () => {
  it("blocks publish of an empty draft", () => {
    const issues = validateForPublish(emptyTemplateSchema());
    expect(issues.some((issue) => /section/i.test(issue.message))).toBe(true);
  });

  it("parses every starter pack", () => {
    for (const pack of STARTER_PACKS) {
      const schema = parseTemplateSchema(pack.schema);
      expect(validateForPublish(schema), pack.key).toEqual([]);
    }
  });

  it("refuses mutation of a published version", () => {
    expect(() => assertDraftMutable("published")).toThrow(/locked/i);
    expect(() => assertDraftMutable("draft")).not.toThrow();
  });

  it("scores percent pass excluding n/a", () => {
    const schema = parseTemplateSchema({
      scoring: { mode: "percent_pass", excludeNa: true },
      sections: [
        {
          id: "s",
          key: "s",
          title: "Checks",
          fields: [
            { id: "f1", key: "a", label: "A", type: "pass_fail" },
            { id: "f2", key: "b", label: "B", type: "pass_fail" },
            { id: "f3", key: "c", label: "C", type: "pass_fail" },
          ],
        },
      ],
      rules: [],
    });
    const score = scoreTemplate(schema, [
      { fieldKey: "a", value: { result: "pass" } },
      { fieldKey: "b", value: { result: "fail" } },
      { fieldKey: "c", value: { result: "na" } },
    ]);
    expect(score.percentPass).toBe(50);
    expect(score.failCount).toBe(1);
  });

  it("slugifies template names", () => {
    expect(slugifyTemplateName("Property Condition")).toBe("property-condition");
  });
});
