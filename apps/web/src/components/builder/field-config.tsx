"use client";

import {
  COMPUTED_KIND_LABELS,
  COMPUTED_KINDS,
  FIELD_TYPE_GROUPS,
  FIELD_TYPE_LABELS,
  type FieldType,
  type TemplateField,
  type TemplateSection,
} from "@inspectstack/domain";
import { Button, Input, Label, Select, Textarea } from "@inspectstack/ui";

export function FieldConfig({
  field,
  sections,
  readOnly,
  onChange,
  onDelete,
}: {
  field: TemplateField;
  sections: TemplateSection[];
  readOnly: boolean;
  onChange: (patch: Partial<TemplateField>) => void;
  onDelete: () => void;
}) {
  const selectLike = field.type === "single_select" || field.type === "multi_select";
  const numericLike =
    field.type === "numeric" ||
    field.type === "currency" ||
    field.type === "temperature" ||
    field.type === "rating";

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="field-label">Field name</Label>
        <Input
          id="field-label"
          value={field.label}
          disabled={readOnly}
          onChange={(event) => onChange({ label: event.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="field-type">Type</Label>
        <Select
          id="field-type"
          value={field.type}
          disabled={readOnly}
          onChange={(event) => onChange({ type: event.target.value as FieldType })}
        >
          {FIELD_TYPE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.types.map((type) => (
                <option key={type} value={type}>
                  {FIELD_TYPE_LABELS[type]}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="field-help">Help text</Label>
        <Input
          id="field-help"
          value={field.helpText ?? ""}
          disabled={readOnly}
          onChange={(event) => onChange({ helpText: event.target.value })}
        />
      </div>
      <label className="flex items-center gap-2 text-ui">
        <input
          type="checkbox"
          checked={field.required}
          disabled={readOnly}
          onChange={(event) => onChange({ required: event.target.checked })}
        />
        Required
      </label>
      {field.type === "pass_fail" ? (
        <>
          <label className="flex items-center gap-2 text-ui">
            <input
              type="checkbox"
              checked={field.requireEvidenceOnFail}
              disabled={readOnly}
              onChange={(event) => onChange({ requireEvidenceOnFail: event.target.checked })}
            />
            Required evidence on fail
          </label>
          <label className="flex items-center gap-2 text-ui">
            <input
              type="checkbox"
              checked={field.includeInScoring}
              disabled={readOnly}
              onChange={(event) => onChange({ includeInScoring: event.target.checked })}
            />
            Include in scoring
          </label>
        </>
      ) : null}
      {field.type === "photo_group" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="photo-min">Photo min</Label>
              <Input
                id="photo-min"
                type="number"
                min={0}
                value={field.photoMin ?? 0}
                disabled={readOnly}
                onChange={(event) => onChange({ photoMin: Number(event.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="photo-max">Photo max</Label>
              <Input
                id="photo-max"
                type="number"
                min={0}
                value={field.photoMax ?? 8}
                disabled={readOnly}
                onChange={(event) => onChange({ photoMax: Number(event.target.value) })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-ui">
            <input
              type="checkbox"
              checked={field.requireCaption}
              disabled={readOnly}
              onChange={(event) => onChange({ requireCaption: event.target.checked })}
            />
            Require caption
          </label>
          <label className="flex items-center gap-2 text-ui">
            <input
              type="checkbox"
              checked={field.allowAnnotation}
              disabled={readOnly}
              onChange={(event) => onChange({ allowAnnotation: event.target.checked })}
            />
            Allow annotation
          </label>
        </>
      ) : null}
      {numericLike ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="field-min">Min</Label>
            <Input
              id="field-min"
              type="number"
              value={field.min ?? ""}
              disabled={readOnly}
              onChange={(event) =>
                onChange({
                  min: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="field-max">Max</Label>
            <Input
              id="field-max"
              type="number"
              value={field.max ?? ""}
              disabled={readOnly}
              onChange={(event) =>
                onChange({
                  max: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
            />
          </div>
        </div>
      ) : null}
      {field.type === "numeric" || field.type === "currency" || field.type === "temperature" ? (
        <div>
          <Label htmlFor="field-unit">Unit</Label>
          <Input
            id="field-unit"
            value={field.unit ?? ""}
            disabled={readOnly}
            onChange={(event) => onChange({ unit: event.target.value })}
          />
        </div>
      ) : null}
      {selectLike ? (
        <div className="space-y-2">
          <p className="text-label font-medium tracking-label text-muted">Options</p>
          {field.options.map((option, index) => (
            <div key={`${option.value}-${index}`} className="flex gap-2">
              <Input
                value={option.label}
                disabled={readOnly}
                onChange={(event) => {
                  const options = field.options.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          label: event.target.value,
                          value:
                            event.target.value.toLowerCase().replace(/\s+/g, "_") || item.value,
                        }
                      : item,
                  );
                  onChange({ options });
                }}
              />
              <Button
                size="sm"
                disabled={readOnly}
                onClick={() =>
                  onChange({ options: field.options.filter((_, itemIndex) => itemIndex !== index) })
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            disabled={readOnly}
            onClick={() =>
              onChange({
                options: [
                  ...field.options,
                  { value: `option_${field.options.length + 1}`, label: "New option" },
                ],
              })
            }
          >
            Add option
          </Button>
        </div>
      ) : null}
      {field.type === "acknowledgment" ? (
        <div>
          <Label htmlFor="ack-body">Acknowledgment text</Label>
          <Textarea
            id="ack-body"
            value={field.acknowledgmentBody ?? ""}
            disabled={readOnly}
            onChange={(event) => onChange({ acknowledgmentBody: event.target.value })}
          />
        </div>
      ) : null}
      {field.type === "computed" ? (
        <>
          <div>
            <Label htmlFor="computed-kind">Computed result</Label>
            <Select
              id="computed-kind"
              value={field.computedKind ?? "overall_status"}
              disabled={readOnly}
              onChange={(event) =>
                onChange({ computedKind: event.target.value as TemplateField["computedKind"] })
              }
            >
              {COMPUTED_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {COMPUTED_KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          </div>
          {field.computedKind === "section_score" ? (
            <div>
              <Label htmlFor="computed-section">Section</Label>
              <Select
                id="computed-section"
                value={field.computedSectionId ?? ""}
                disabled={readOnly}
                onChange={(event) => onChange({ computedSectionId: event.target.value })}
              >
                <option value="">Select section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </>
      ) : null}
      <Button variant="danger" size="sm" disabled={readOnly} onClick={onDelete}>
        Delete field
      </Button>
    </div>
  );
}
