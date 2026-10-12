import { RULE_ACTION_LABELS, RULE_OPERATOR_LABELS, type RuleOperator } from "./template-fields";
import type { TemplateField, TemplateRule, TemplateSchema } from "./template-schema";

export function listFields(schema: TemplateSchema): TemplateField[] {
  return schema.sections.flatMap((section) => section.fields);
}

export function fieldById(schema: TemplateSchema, fieldId: string): TemplateField | undefined {
  return listFields(schema).find((field) => field.id === fieldId);
}

function conditionNeedsValue(operator: RuleOperator): boolean {
  return (
    operator === "eq" ||
    operator === "neq" ||
    operator === "lt" ||
    operator === "lte" ||
    operator === "gt" ||
    operator === "gte" ||
    operator === "contains"
  );
}

function scalar(value: unknown): unknown {
  if (value && typeof value === "object" && "result" in value) {
    return (value as { result: unknown }).result;
  }
  return value;
}

export function conditionMet(
  condition: { fieldId: string; operator: RuleOperator; value?: unknown },
  value: unknown,
): boolean {
  const actual = scalar(value);
  switch (condition.operator) {
    case "is_fail":
      return actual === "fail";
    case "is_pass":
      return actual === "pass";
    case "is_na":
      return actual === "na";
    case "is_true":
      return actual === true || actual === "yes" || actual === "true";
    case "is_false":
      return actual === false || actual === "no" || actual === "false";
    case "eq":
      return String(actual ?? "") === String(condition.value ?? "");
    case "neq":
      return String(actual ?? "") !== String(condition.value ?? "");
    case "contains":
      return String(actual ?? "")
        .toLowerCase()
        .includes(String(condition.value ?? "").toLowerCase());
    case "lt":
      return Number(actual) < Number(condition.value);
    case "lte":
      return Number(actual) <= Number(condition.value);
    case "gt":
      return Number(actual) > Number(condition.value);
    case "gte":
      return Number(actual) >= Number(condition.value);
    default:
      return false;
  }
}

export function ruleMatches(
  schema: TemplateSchema,
  rule: TemplateRule,
  answers: Record<string, unknown>,
): boolean {
  if (rule.conditions.length === 0) return false;
  const results = rule.conditions.map((condition) =>
    conditionMet(condition, answers[condition.fieldId]),
  );
  return rule.join === "any" ? results.some(Boolean) : results.every(Boolean);
}

export function evaluateFieldState(
  schema: TemplateSchema,
  answers: Record<string, unknown>,
): {
  hidden: Set<string>;
  required: Set<string>;
  findings: Array<{ title: string; severity: string; fieldId: string }>;
} {
  const hidden = new Set<string>();
  const required = new Set<string>();
  const findings: Array<{ title: string; severity: string; fieldId: string }> = [];

  for (const field of listFields(schema)) {
    if (field.required) required.add(field.id);
  }

  const showTargets = new Set(
    schema.rules
      .filter((rule) => rule.then.action === "show" && rule.then.targetFieldId)
      .map((rule) => rule.then.targetFieldId!),
  );
  for (const id of showTargets) hidden.add(id);

  for (const rule of schema.rules) {
    if (!ruleMatches(schema, rule, answers)) continue;
    const target = rule.then.targetFieldId;
    if (rule.then.action === "hide" && target) hidden.add(target);
    if (rule.then.action === "show" && target) hidden.delete(target);
    if (rule.then.action === "require" && target) required.add(target);
    if (rule.then.action === "optional" && target) required.delete(target);
    if (rule.then.action === "create_finding") {
      findings.push({
        title: rule.then.findingTitle?.trim() || "Finding",
        severity: rule.then.findingSeverity ?? "medium",
        fieldId: rule.conditions[0]?.fieldId ?? "",
      });
    }
  }

  return { hidden, required, findings };
}

export function summarizeRule(schema: TemplateSchema, rule: TemplateRule): string {
  const join = rule.join === "any" ? " OR " : " AND ";
  const when =
    rule.conditions.length === 0
      ? "WHEN (no condition)"
      : `WHEN ${rule.conditions
          .map((condition) => {
            const field = fieldById(schema, condition.fieldId);
            const name = field?.label.trim() || field?.key || "unknown field";
            const op = RULE_OPERATOR_LABELS[condition.operator];
            if (!conditionNeedsValue(condition.operator)) return `${name} ${op}`;
            const value =
              condition.value === undefined || condition.value === ""
                ? "…"
                : String(condition.value);
            return `${name} ${op} ${value}`;
          })
          .join(join)}`;
  const action = RULE_ACTION_LABELS[rule.then.action];
  if (rule.then.action === "create_finding") {
    const title = rule.then.findingTitle?.trim() || "a finding";
    const severity = rule.then.findingSeverity ?? "medium";
    return `${when} THEN ${action} “${title}” (${severity}).`;
  }
  const target = rule.then.targetFieldId ? fieldById(schema, rule.then.targetFieldId) : undefined;
  const targetName = target?.label.trim() || target?.key || "a field";
  return `${when} THEN ${action} ${targetName}.`;
}

function ruleEdges(rule: TemplateRule): Array<[string, string]> {
  const target = rule.then.targetFieldId;
  if (!target || rule.then.action === "create_finding") return [];
  return rule.conditions
    .map((condition) => [condition.fieldId, target] as [string, string])
    .filter(([from, to]) => from && to);
}

/** Returns a readable cycle, or null if the rule graph is acyclic. */
export function findCircularRuleCycle(schema: TemplateSchema): string[] | null {
  const adj = new Map<string, Set<string>>();
  for (const field of listFields(schema)) adj.set(field.id, adj.get(field.id) ?? new Set());
  for (const rule of schema.rules) {
    for (const [from, to] of ruleEdges(rule)) {
      if (!adj.has(from)) adj.set(from, new Set());
      if (!adj.has(to)) adj.set(to, new Set());
      adj.get(from)!.add(to);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const parent = new Map<string, string | null>();

  function cycleFrom(meet: string, node: string): string[] {
    const path = [meet, node];
    let cursor: string | null | undefined = node;
    while (cursor && cursor !== meet) {
      cursor = parent.get(cursor) ?? null;
      if (cursor) path.push(cursor);
    }
    return path.reverse();
  }

  function dfs(node: string): string[] | null {
    visiting.add(node);
    for (const next of adj.get(node) ?? []) {
      if (visiting.has(next)) return cycleFrom(next, node);
      if (!visited.has(next)) {
        parent.set(next, node);
        const found = dfs(next);
        if (found) return found;
      }
    }
    visiting.delete(node);
    visited.add(node);
    return null;
  }

  for (const node of adj.keys()) {
    if (!visited.has(node) && !visiting.has(node)) {
      parent.set(node, null);
      const found = dfs(node);
      if (found) return found.map((id) => fieldById(schema, id)?.label.trim() || id);
    }
  }
  return null;
}
