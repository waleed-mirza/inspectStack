"use client";

import { useMemo, useState } from "react";
import {
  FIELD_TYPE_LABELS,
  evaluateFieldState,
  scoreTemplate,
  type TemplateField,
  type TemplateSchema,
} from "@inspectstack/domain";
import { Input, Label, Panel, Select, StatusStamp, Textarea } from "@inspectstack/ui";

function PreviewControl({
  field,
  value,
  required,
  onChange,
}: {
  field: TemplateField;
  value: unknown;
  required: boolean;
  onChange: (value: unknown) => void;
}) {
  const label = (
    <Label htmlFor={field.id}>
      {field.label}
      {required ? " *" : ""}
      <span className="ml-2 font-normal text-muted">{FIELD_TYPE_LABELS[field.type]}</span>
    </Label>
  );

  if (field.type === "pass_fail") {
    const current =
      value && typeof value === "object" && "result" in value
        ? String((value as { result: unknown }).result)
        : "";
    return (
      <div>
        {label}
        <Select
          id={field.id}
          value={current}
          onChange={(event) => onChange({ result: event.target.value })}
        >
          <option value="">Not answered</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="na">N/A</option>
        </Select>
      </div>
    );
  }
  if (field.type === "boolean") {
    return (
      <div>
        {label}
        <Select
          id={field.id}
          value={value === true ? "yes" : value === false ? "no" : ""}
          onChange={(event) => onChange(event.target.value === "yes")}
        >
          <option value="">Not answered</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </Select>
      </div>
    );
  }
  if (field.type === "long_text" || field.type === "acknowledgment") {
    return (
      <div>
        {label}
        {field.acknowledgmentBody ? (
          <p className="mt-1 text-ui">{field.acknowledgmentBody}</p>
        ) : null}
        <Textarea
          id={field.id}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }
  if (field.type === "single_select") {
    return (
      <div>
        {label}
        <Select
          id={field.id}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    );
  }
  if (field.type === "computed") {
    return (
      <div>
        {label}
        <p className="mt-1 font-mono text-ui text-muted">Filled from scoring at review time.</p>
      </div>
    );
  }
  if (
    field.type === "photo_group" ||
    field.type === "signature" ||
    field.type === "initials" ||
    field.type === "gps"
  ) {
    return (
      <div>
        {label}
        <p className="mt-1 text-ui text-muted">
          Photos, signatures, and GPS are captured in the field runner, not this preview.
        </p>
      </div>
    );
  }
  return (
    <div>
      {label}
      <Input
        id={field.id}
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function PreviewForm({ schema, title }: { schema: TemplateSchema; title: string }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const state = useMemo(() => evaluateFieldState(schema, answers), [schema, answers]);
  const score = useMemo(
    () =>
      scoreTemplate(
        schema,
        Object.entries(answers).map(([fieldId, value]) => ({
          fieldId,
          fieldKey:
            schema.sections
              .flatMap((section) => section.fields)
              .find((field) => field.id === fieldId)?.key ?? fieldId,
          value,
        })),
      ),
    [schema, answers],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-title">{title}</h2>
        <StatusStamp tone="ink">{score.mode.replaceAll("_", " ")}</StatusStamp>
        <StatusStamp
          tone={
            score.trafficLight === "fail"
              ? "fail"
              : score.trafficLight === "pass"
                ? "pass"
                : "queued"
          }
        >
          {score.percentPass !== null ? `${score.percentPass}% pass` : score.trafficLight}
        </StatusStamp>
      </div>
      {schema.sections.map((section) => {
        const visible = section.fields.filter((field) => !state.hidden.has(field.id));
        if (visible.length === 0) return null;
        return (
          <Panel key={section.id} className="space-y-4">
            <h3 className="font-display text-title">
              {section.title}
              {section.repeatable ? (
                <span className="ml-2 text-label text-muted">repeatable</span>
              ) : null}
            </h3>
            {visible.map((field) => (
              <PreviewControl
                key={field.id}
                field={field}
                required={state.required.has(field.id)}
                value={answers[field.id]}
                onChange={(value) => setAnswers((current) => ({ ...current, [field.id]: value }))}
              />
            ))}
          </Panel>
        );
      })}
      {state.findings.length > 0 ? (
        <Panel>
          <h3 className="font-display text-title">Findings this would create</h3>
          <ul className="mt-2 space-y-1 text-ui">
            {state.findings.map((finding, index) => (
              <li key={`${finding.title}-${index}`}>
                <StatusStamp tone="fail">{finding.severity}</StatusStamp> {finding.title}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
