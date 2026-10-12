"use client";

import {
  FINDING_SEVERITIES,
  RULE_ACTION_LABELS,
  RULE_ACTIONS,
  RULE_OPERATOR_LABELS,
  RULE_OPERATORS,
  listFields,
  type FindingSeverity,
  type RuleAction,
  type RuleOperator,
  type TemplateRule,
  type TemplateSchema,
} from "@inspectstack/domain";
import { Button, Input, Label, Select } from "@inspectstack/ui";

const VALUE_OPS = new Set(["eq", "neq", "lt", "lte", "gt", "gte", "contains"]);

export function RuleConfig({
  schema,
  rule,
  readOnly,
  onChange,
  onDelete,
}: {
  schema: TemplateSchema;
  rule: TemplateRule;
  readOnly: boolean;
  onChange: (patch: Partial<TemplateRule>) => void;
  onDelete: () => void;
}) {
  const fields = listFields(schema);
  const condition = rule.conditions[0] ?? {
    fieldId: fields[0]?.id ?? "",
    operator: "is_fail" as const,
  };

  return (
    <div className="space-y-3">
      <p className="text-label font-medium tracking-label text-muted">WHEN</p>
      <div>
        <Label htmlFor="rule-join">Match</Label>
        <Select
          id="rule-join"
          value={rule.join}
          disabled={readOnly}
          onChange={(event) => onChange({ join: event.target.value as "all" | "any" })}
        >
          <option value="all">All conditions</option>
          <option value="any">Any condition</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="rule-field">Field</Label>
        <Select
          id="rule-field"
          value={condition.fieldId}
          disabled={readOnly}
          onChange={(event) =>
            onChange({ conditions: [{ ...condition, fieldId: event.target.value }] })
          }
        >
          {fields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.label || field.key}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="rule-op">Operator</Label>
        <Select
          id="rule-op"
          value={condition.operator}
          disabled={readOnly}
          onChange={(event) =>
            onChange({
              conditions: [{ ...condition, operator: event.target.value as RuleOperator }],
            })
          }
        >
          {RULE_OPERATORS.map((operator) => (
            <option key={operator} value={operator}>
              {RULE_OPERATOR_LABELS[operator]}
            </option>
          ))}
        </Select>
      </div>
      {VALUE_OPS.has(condition.operator) ? (
        <div>
          <Label htmlFor="rule-value">Value</Label>
          <Input
            id="rule-value"
            value={condition.value === undefined ? "" : String(condition.value)}
            disabled={readOnly}
            onChange={(event) =>
              onChange({ conditions: [{ ...condition, value: event.target.value }] })
            }
          />
        </div>
      ) : null}
      <p className="text-label font-medium tracking-label text-muted">THEN</p>
      <div>
        <Label htmlFor="rule-action">Action</Label>
        <Select
          id="rule-action"
          value={rule.then.action}
          disabled={readOnly}
          onChange={(event) =>
            onChange({ then: { ...rule.then, action: event.target.value as RuleAction } })
          }
        >
          {RULE_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {RULE_ACTION_LABELS[action]}
            </option>
          ))}
        </Select>
      </div>
      {rule.then.action === "create_finding" ? (
        <>
          <div>
            <Label htmlFor="finding-title">Finding title</Label>
            <Input
              id="finding-title"
              value={rule.then.findingTitle ?? ""}
              disabled={readOnly}
              onChange={(event) =>
                onChange({ then: { ...rule.then, findingTitle: event.target.value } })
              }
            />
          </div>
          <div>
            <Label htmlFor="finding-sev">Severity</Label>
            <Select
              id="finding-sev"
              value={rule.then.findingSeverity ?? "medium"}
              disabled={readOnly}
              onChange={(event) =>
                onChange({
                  then: { ...rule.then, findingSeverity: event.target.value as FindingSeverity },
                })
              }
            >
              {FINDING_SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </Select>
          </div>
        </>
      ) : (
        <div>
          <Label htmlFor="rule-target">Target field</Label>
          <Select
            id="rule-target"
            value={rule.then.targetFieldId ?? ""}
            disabled={readOnly}
            onChange={(event) =>
              onChange({ then: { ...rule.then, targetFieldId: event.target.value } })
            }
          >
            <option value="">Select field</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.label || field.key}
              </option>
            ))}
          </Select>
        </div>
      )}
      <Button variant="danger" size="sm" disabled={readOnly} onClick={onDelete}>
        Delete rule
      </Button>
    </div>
  );
}
