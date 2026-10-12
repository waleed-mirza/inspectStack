"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplateField } from "@inspectstack/domain";
import { Button, Input, Label, Select, Textarea, cn } from "@inspectstack/ui";

const phoneText = "text-[1rem]";

function DraftInput({
  id,
  disabled,
  value,
  type,
  multiline,
  onChange,
}: {
  id: string;
  disabled?: boolean;
  value: string;
  type?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  function focus(target: HTMLElement) {
    focused.current = true;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  const shared = {
    id,
    disabled,
    value: draft,
    className: phoneText,
    onFocus: (event: { currentTarget: HTMLElement }) => focus(event.currentTarget),
    onBlur: () => {
      focused.current = false;
      onChange(draft);
    },
    onChange: (event: { target: { value: string } }) => {
      setDraft(event.target.value);
      onChange(event.target.value);
    },
  };

  if (multiline) return <Textarea {...shared} />;
  return <Input type={type} inputMode={type === "number" ? "decimal" : undefined} {...shared} />;
}

function FieldLabel({ field, required }: { field: TemplateField; required: boolean }) {
  return (
    <Label htmlFor={field.id}>
      {field.label}
      {required ? " *" : ""}
    </Label>
  );
}

function passFailResult(value: unknown): string {
  if (value && typeof value === "object" && "result" in value) {
    return String((value as { result: unknown }).result ?? "");
  }
  if (value === "pass" || value === "fail" || value === "na") return value;
  return "";
}

export function FieldControl({
  field,
  value,
  required,
  disabled,
  computedLabel,
  onChange,
}: {
  field: TemplateField;
  value: unknown;
  required: boolean;
  disabled?: boolean;
  computedLabel?: string;
  onChange: (value: unknown) => void;
}) {
  const help = field.helpText ? (
    <p className="mt-1 text-label text-muted">{field.helpText}</p>
  ) : null;

  if (field.type === "pass_fail") {
    const current = passFailResult(value);
    return (
      <fieldset>
        <legend className="text-label font-medium tracking-label text-muted">
          {field.label}
          {required ? " *" : ""}
        </legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(
            [
              [
                "pass",
                "Pass",
                "border-pass text-pass data-[on=true]:bg-pass data-[on=true]:text-ticket",
              ],
              [
                "fail",
                "Fail",
                "border-fail text-fail data-[on=true]:bg-fail data-[on=true]:text-ticket",
              ],
              [
                "na",
                "N/A",
                "border-ink text-muted data-[on=true]:bg-ink data-[on=true]:text-ticket",
              ],
            ] as const
          ).map(([result, label, cls]) => (
            <button
              key={result}
              type="button"
              data-on={current === result}
              disabled={disabled}
              className={cn(
                "h-12 rounded-control border bg-ticket text-ui font-medium disabled:opacity-50",
                cls,
              )}
              onClick={() => onChange({ result })}
            >
              {label}
            </button>
          ))}
        </div>
        {help}
      </fieldset>
    );
  }

  if (field.type === "boolean") {
    const current = value === true ? "yes" : value === false ? "no" : "";
    return (
      <fieldset>
        <legend className="text-label font-medium tracking-label text-muted">
          {field.label}
          {required ? " *" : ""}
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={current === "yes" ? "primary" : "secondary"}
            disabled={disabled}
            onClick={() => onChange(true)}
          >
            Yes
          </Button>
          <Button
            type="button"
            variant={current === "no" ? "primary" : "secondary"}
            disabled={disabled}
            onClick={() => onChange(false)}
          >
            No
          </Button>
        </div>
        {help}
      </fieldset>
    );
  }

  if (field.type === "single_select") {
    return (
      <div>
        <FieldLabel field={field} required={required} />
        <Select
          id={field.id}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value || null)}
        >
          <option value="">Select</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {help}
      </div>
    );
  }

  if (field.type === "multi_select") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <fieldset>
        <legend className="text-label font-medium tracking-label text-muted">
          {field.label}
          {required ? " *" : ""}
        </legend>
        <ul className="mt-2 space-y-2">
          {field.options.map((option) => (
            <li key={option.value}>
              <label className="flex min-h-10 items-center gap-2 text-ui">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-brand"
                  disabled={disabled}
                  checked={selected.includes(option.value)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...selected, option.value]
                      : selected.filter((item) => item !== option.value);
                    onChange(next);
                  }}
                />
                {option.label}
              </label>
            </li>
          ))}
        </ul>
        {help}
      </fieldset>
    );
  }

  if (field.type === "rating") {
    const min = field.min ?? 1;
    const max = field.max ?? 5;
    const current = typeof value === "number" ? value : null;
    const buttons = [];
    for (let score = min; score <= max; score += 1) buttons.push(score);
    return (
      <fieldset>
        <legend className="text-label font-medium tracking-label text-muted">
          {field.label}
          {required ? " *" : ""}
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {buttons.map((score) => (
            <button
              key={score}
              type="button"
              disabled={disabled}
              onClick={() => onChange(score)}
              className={cn(
                "h-12 min-w-12 rounded-control border border-ink bg-ticket px-3 text-ui disabled:opacity-50",
                current === score && "bg-ink text-ticket",
              )}
            >
              {score}
            </button>
          ))}
        </div>
        {help}
      </fieldset>
    );
  }

  if (field.type === "long_text") {
    return (
      <div>
        <FieldLabel field={field} required={required} />
        <DraftInput
          id={field.id}
          multiline
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
        />
        {help}
      </div>
    );
  }

  if (field.type === "acknowledgment") {
    const checked =
      value === true || value === "acknowledged" || (typeof value === "string" && value.length > 0);
    return (
      <div>
        <FieldLabel field={field} required={required} />
        {field.acknowledgmentBody ? (
          <p className="mt-1 text-ui">{field.acknowledgmentBody}</p>
        ) : null}
        <label className="mt-2 flex min-h-10 items-center gap-2 text-ui">
          <input
            id={field.id}
            type="checkbox"
            className="h-5 w-5 accent-brand"
            disabled={disabled}
            checked={checked}
            onChange={(event) => onChange(event.target.checked ? "acknowledged" : null)}
          />
          I acknowledge
        </label>
        {help}
      </div>
    );
  }

  if (field.type === "computed") {
    return (
      <div>
        <FieldLabel field={field} required={false} />
        <p className="mt-1 font-mono text-ui">{computedLabel ?? "Not scored yet"}</p>
      </div>
    );
  }

  if (field.type === "datetime") {
    const raw = typeof value === "string" ? value.slice(0, 16) : "";
    return (
      <div>
        <FieldLabel field={field} required={required} />
        <DraftInput
          id={field.id}
          type="datetime-local"
          disabled={disabled}
          value={raw}
          onChange={(next) => onChange(next ? new Date(next).toISOString() : null)}
        />
        {help}
      </div>
    );
  }

  if (field.type === "numeric" || field.type === "currency" || field.type === "temperature") {
    return (
      <div>
        <FieldLabel field={field} required={required} />
        <div className="flex items-center gap-2">
          <DraftInput
            id={field.id}
            type="number"
            disabled={disabled}
            value={typeof value === "number" ? String(value) : ""}
            onChange={(next) => onChange(next === "" ? null : Number(next))}
          />
          {field.unit ? <span className="text-label text-muted">{field.unit}</span> : null}
        </div>
        {help}
      </div>
    );
  }

  return (
    <div>
      <FieldLabel field={field} required={required} />
      <DraftInput
        id={field.id}
        disabled={disabled}
        value={value === undefined || value === null ? "" : String(value)}
        onChange={onChange}
      />
      {help}
    </div>
  );
}
