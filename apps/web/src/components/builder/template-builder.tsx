"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  FIELD_TYPE_LABELS,
  SCORING_MODE_LABELS,
  SCORING_MODES,
  createField,
  createSection,
  exportTemplateJson,
  findCircularRuleCycle,
  listFields,
  newId,
  parseTemplateSchema,
  summarizeRule,
  validateForPublish,
  type ScoringMode,
  type TemplateField,
  type TemplateRule,
  type TemplateSchema,
  type TemplateSection,
} from "@inspectstack/domain";
import { Button, Input, Notice, Panel, Select, StatusStamp, SubmitButton } from "@inspectstack/ui";
import { ActionLink, AppLink } from "@/components/action-link";
import {
  openDraftAction,
  publishTemplateAction,
  renameTemplateAction,
  saveDraftAction,
} from "@/lib/actions/templates";
import { FieldConfig } from "./field-config";
import { RuleConfig } from "./rule-config";
import { SortableRow } from "./sortable-row";

const DRAFT_PREFIX = "inspectstack:template-draft:";

const localDraftCache = new Map<string, { raw: string; value: TemplateSchema | null }>();

function subscribeLocalDraft(storageKey: string, onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function readLocalDraft(storageKey: string, serverJson: string): TemplateSchema | null {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  const cached = localDraftCache.get(storageKey);
  if (cached && cached.raw === raw) return cached.value;
  try {
    const local = parseTemplateSchema((JSON.parse(raw) as { schema: unknown }).schema);
    const value = JSON.stringify(local) === serverJson ? null : local;
    localDraftCache.set(storageKey, { raw, value });
    return value;
  } catch {
    window.localStorage.removeItem(storageKey);
    localDraftCache.delete(storageKey);
    return null;
  }
}

type BuilderProps = {
  template: { id: string; name: string; packKey: string | null; archivedAt: Date | string | null };
  version: {
    id: string;
    version: number;
    status: "draft" | "published" | "retired";
    schema: TemplateSchema;
  };
  inspectionCount: number;
  versionInspectionCount: number;
  versions: Array<{ id: string; version: number; status: "draft" | "published" | "retired" }>;
  publishError?: string | null;
  published?: boolean;
};

export function TemplateBuilder({
  template,
  version,
  inspectionCount,
  versionInspectionCount,
  versions,
  publishError,
  published,
}: BuilderProps) {
  const readOnly = version.status !== "draft" || Boolean(template.archivedAt);
  const storageKey = `${DRAFT_PREFIX}${template.id}:${version.id}`;
  const [schema, setSchema] = useState<TemplateSchema>(() => parseTemplateSchema(version.schema));
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    () => schema.sections[0]?.id ?? null,
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "local">(
    "idle",
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hideRecovery, setHideRecovery] = useState(false);
  const skipSave = useRef(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const serverJson = useMemo(
    () => JSON.stringify(parseTemplateSchema(version.schema)),
    [version.schema],
  );
  const storedDraft = useSyncExternalStore(
    (onChange) => subscribeLocalDraft(storageKey, onChange),
    () => (readOnly ? null : readLocalDraft(storageKey, serverJson)),
    () => null,
  );
  const recovery = hideRecovery ? null : storedDraft;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selectedSection =
    schema.sections.find((section) => section.id === selectedSectionId) ?? null;
  const selectedField =
    selectedSection?.fields.find((field) => field.id === selectedFieldId) ?? null;
  const selectedRule = schema.rules.find((rule) => rule.id === selectedRuleId) ?? null;
  const cycle = useMemo(() => findCircularRuleCycle(schema), [schema]);
  const publishIssues = useMemo(() => validateForPublish(schema), [schema]);

  const persist = useCallback(
    async (next: TemplateSchema) => {
      if (readOnly) return;
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ schema: next, savedAt: Date.now() }),
      );
      setSaveState("saving");
      const result = await saveDraftAction({ versionId: version.id, schema: next });
      if (result.ok) {
        setSaveState("saved");
        setSaveError(null);
      } else {
        setSaveState("local");
        setSaveError(result.error);
      }
    },
    [readOnly, storageKey, version.id],
  );

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    if (readOnly) return;
    const timer = window.setTimeout(() => {
      void persist(schema);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [schema, persist, readOnly]);

  function updateSchema(updater: (current: TemplateSchema) => TemplateSchema) {
    setSchema((current) => updater(current));
  }

  function patchSection(sectionId: string, patch: Partial<TemplateSection>) {
    updateSchema((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    }));
  }

  function patchField(sectionId: string, fieldId: string, patch: Partial<TemplateField>) {
    updateSchema((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map((field) =>
                field.id === fieldId ? { ...field, ...patch } : field,
              ),
            }
          : section,
      ),
    }));
  }

  function onSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    updateSchema((current) => {
      const from = current.sections.findIndex((section) => section.id === active.id);
      const to = current.sections.findIndex((section) => section.id === over.id);
      if (from < 0 || to < 0) return current;
      return { ...current, sections: arrayMove(current.sections, from, to) };
    });
  }

  function onFieldDragEnd(event: DragEndEvent) {
    if (!selectedSection) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = selectedSection.fields.findIndex((field) => field.id === active.id);
    const to = selectedSection.fields.findIndex((field) => field.id === over.id);
    if (from < 0 || to < 0) return;
    patchSection(selectedSection.id, {
      fields: arrayMove(selectedSection.fields, from, to),
    });
  }

  function handleCanvasKey(event: KeyboardEvent) {
    if (readOnly || !selectedSection || !selectedField) return;
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")
      return;
    const index = selectedSection.fields.findIndex((field) => field.id === selectedField.id);
    if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      patchSection(selectedSection.id, {
        fields: arrayMove(selectedSection.fields, index, index - 1),
      });
    }
    if (event.key === "ArrowDown" && index < selectedSection.fields.length - 1) {
      event.preventDefault();
      patchSection(selectedSection.id, {
        fields: arrayMove(selectedSection.fields, index, index + 1),
      });
    }
    if (event.key === "Escape") {
      setSelectedFieldId(null);
      setSelectedRuleId(null);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("field-label")?.focus();
    }
  }

  function addSection() {
    const section = createSection();
    updateSchema((current) => ({ ...current, sections: [...current.sections, section] }));
    setSelectedSectionId(section.id);
    setSelectedFieldId(null);
  }

  function addField() {
    if (!selectedSection) return;
    const keys = listFields(schema).map((field) => field.key);
    const field = createField("pass_fail", keys);
    patchSection(selectedSection.id, { fields: [...selectedSection.fields, field] });
    setSelectedFieldId(field.id);
    setSelectedRuleId(null);
  }

  function addRule() {
    const first = listFields(schema)[0];
    const rule: TemplateRule = {
      id: newId("rule"),
      join: "all",
      conditions: first ? [{ fieldId: first.id, operator: "is_fail" }] : [],
      then: { action: "create_finding", findingTitle: "Finding", findingSeverity: "medium" },
    };
    updateSchema((current) => ({ ...current, rules: [...current.rules, rule] }));
    setSelectedRuleId(rule.id);
    setSelectedFieldId(null);
  }

  function exportJson() {
    const blob = new Blob(
      [exportTemplateJson({ name: template.name, packKey: template.packKey, schema })],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${template.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    const text = await file.text();
    const parsed = JSON.parse(text) as { schema?: unknown };
    const next = parseTemplateSchema(parsed.schema ?? parsed);
    skipSave.current = false;
    setSchema(next);
    setSelectedSectionId(next.sections[0]?.id ?? null);
    setSelectedFieldId(null);
  }

  const stampTone =
    version.status === "published" ? "pass" : version.status === "draft" ? "queued" : "muted";

  return (
    <div className="space-y-4" onKeyDown={handleCanvasKey}>
      <div className="flex flex-wrap items-center gap-2">
        <AppLink href="/app/templates" className="text-ui underline">
          Library
        </AppLink>
        <StatusStamp tone={stampTone}>{version.status}</StatusStamp>
        <span className="font-mono text-micro uppercase tracking-id text-muted">
          {versions.map((item) => `v${item.version} ${item.status}`).join(" · ")}
        </span>
        {saveState === "saving" ? <span className="text-label text-muted">Saving…</span> : null}
        {saveState === "saved" ? <span className="text-label text-pass">Saved</span> : null}
        {saveState === "local" ? (
          <span className="text-label text-fail">Saved on this device</span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <form action={renameTemplateAction} className="flex min-w-64 flex-1 items-end gap-2">
          <input type="hidden" name="templateId" value={template.id} />
          <Input
            name="name"
            defaultValue={template.name}
            aria-label="Template name"
            disabled={Boolean(template.archivedAt)}
          />
          <SubmitButton size="sm" disabled={Boolean(template.archivedAt)} busyLabel="Saving…">
            Rename
          </SubmitButton>
        </form>
        <ActionLink href={`/app/templates/${template.id}/preview`} size="sm">
          Preview as inspector
        </ActionLink>
        {readOnly && !template.archivedAt ? (
          <form action={openDraftAction}>
            <input type="hidden" name="templateId" value={template.id} />
            <SubmitButton variant="primary" size="sm" busyLabel="Opening draft…">
              Edit next draft
            </SubmitButton>
          </form>
        ) : null}
        {!readOnly ? (
          <form action={publishTemplateAction}>
            <input type="hidden" name="templateId" value={template.id} />
            <input type="hidden" name="versionId" value={version.id} />
            <SubmitButton variant="primary" size="sm" busyLabel="Publishing…">
              Publish v{version.version} (immutable)
            </SubmitButton>
          </form>
        ) : null}
        <Button size="sm" onClick={exportJson}>
          Export JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importJson(file);
            event.target.value = "";
          }}
        />
        <Button size="sm" disabled={readOnly} onClick={() => fileRef.current?.click()}>
          Import JSON
        </Button>
      </div>

      {inspectionCount > 0 ? (
        <Notice tone="ink">
          {`${inspectionCount} inspection${inspectionCount === 1 ? " uses" : "s use"} a published version of this template.`}{" "}
          Editing opens a new draft. Historical jobs keep the version they started on.
          {versionInspectionCount > 0 ? ` This version is used by ${versionInspectionCount}.` : ""}
        </Notice>
      ) : null}
      {readOnly ? (
        <Notice tone="ink">
          {template.archivedAt
            ? "Retired templates are read-only. Clone to start a new draft."
            : "This version is locked. Edit next draft to change fields without touching jobs already in the field."}
        </Notice>
      ) : null}
      {published ? (
        <Notice tone="pass">Published. Jobs that start now use this version.</Notice>
      ) : null}
      {publishError ? <Notice tone="fail">{publishError}</Notice> : null}
      {saveError ? (
        <Notice tone="fail">
          Could not save draft — still on this device until retry. {saveError}
        </Notice>
      ) : null}
      {cycle ? <Notice tone="fail">Circular rule blocked: {cycle.join(" → ")}.</Notice> : null}
      {recovery ? (
        <Notice tone="ink">
          Unsaved draft on this device.{" "}
          <Button
            size="sm"
            className="ml-2"
            onClick={() => {
              setSchema(recovery);
              setHideRecovery(true);
            }}
          >
            Restore
          </Button>
          <Button
            size="sm"
            className="ml-2"
            onClick={() => {
              window.localStorage.removeItem(storageKey);
              localDraftCache.delete(storageKey);
              setHideRecovery(true);
            }}
          >
            Discard
          </Button>
        </Notice>
      ) : null}
      {!readOnly && publishIssues.length > 0 ? (
        <Notice tone="ink">{publishIssues[0]!.message}</Notice>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-label text-muted" htmlFor="scoring-mode">
          Scoring
        </label>
        <Select
          id="scoring-mode"
          className="mt-0 w-auto min-w-56"
          value={schema.scoring.mode}
          disabled={readOnly}
          onChange={(event) =>
            updateSchema((current) => ({
              ...current,
              scoring: { ...current.scoring, mode: event.target.value as ScoringMode },
            }))
          }
        >
          {SCORING_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {SCORING_MODE_LABELS[mode]}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-ui">
          <input
            type="checkbox"
            checked={schema.scoring.excludeNa}
            disabled={readOnly}
            onChange={(event) =>
              updateSchema((current) => ({
                ...current,
                scoring: { ...current.scoring, excludeNa: event.target.checked },
              }))
            }
          />
          Exclude n/a
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)_18rem]">
        <aside>
          <Panel className="space-y-2">
            <h2 className="font-display text-title">Sections</h2>
            {schema.sections.length === 0 ? (
              <p className="text-ui text-muted">Clone a starter pack or add a section.</p>
            ) : readOnly ? (
              <div className="space-y-1" role="list">
                {schema.sections.map((section) => (
                  <div key={section.id} className="flex items-center gap-1" role="listitem">
                    <button
                      type="button"
                      className={`h-10 min-w-0 flex-1 border px-2 text-left text-ui ${
                        section.id === selectedSectionId
                          ? "border-ink bg-fill"
                          : "border-rule bg-ticket"
                      }`}
                      onClick={() => {
                        setSelectedSectionId(section.id);
                        setSelectedFieldId(null);
                        setSelectedRuleId(null);
                      }}
                    >
                      {section.title || "Untitled section"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <DndContext
                id="builder-sections"
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onSectionDragEnd}
              >
                <SortableContext
                  items={schema.sections.map((section) => section.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1" role="list">
                    {schema.sections.map((section) => (
                      <SortableRow key={section.id} id={section.id}>
                        {(handle) => (
                          <div className="flex items-center gap-1" role="listitem">
                            <button
                              type="button"
                              className="h-10 shrink-0 border border-ink bg-ticket px-2 text-label"
                              aria-label={`Move ${section.title || "section"}`}
                              {...handle}
                            >
                              Move
                            </button>
                            <button
                              type="button"
                              className={`h-10 min-w-0 flex-1 border px-2 text-left text-ui ${
                                section.id === selectedSectionId
                                  ? "border-ink bg-fill"
                                  : "border-rule bg-ticket"
                              }`}
                              onClick={() => {
                                setSelectedSectionId(section.id);
                                setSelectedFieldId(null);
                                setSelectedRuleId(null);
                              }}
                            >
                              {section.title || "Untitled section"}
                            </button>
                          </div>
                        )}
                      </SortableRow>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            <Button size="sm" disabled={readOnly} onClick={addSection}>
              Add section
            </Button>
          </Panel>
        </aside>

        <section>
          <Panel className="space-y-3">
            {selectedSection ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-title">
                    {selectedSection.title || "Untitled section"}
                  </h2>
                  <label className="flex items-center gap-2 text-ui">
                    <input
                      type="checkbox"
                      checked={selectedSection.repeatable}
                      disabled={readOnly}
                      onChange={(event) =>
                        patchSection(selectedSection.id, { repeatable: event.target.checked })
                      }
                    />
                    Repeatable
                  </label>
                </div>
                {selectedSection.fields.length === 0 ? (
                  <p className="text-ui text-muted">
                    Add a field. Keyboard: up/down reorder, Enter edit, Esc close.
                  </p>
                ) : readOnly ? (
                  <div className="space-y-1" role="list">
                    {selectedSection.fields.map((field) => (
                      <div key={field.id} className="flex items-stretch gap-1" role="listitem">
                        <button
                          type="button"
                          className={`min-w-0 flex-1 border px-3 py-2 text-left ${
                            field.id === selectedFieldId
                              ? "border-ink bg-fill"
                              : "border-rule bg-ticket"
                          }`}
                          onClick={() => {
                            setSelectedFieldId(field.id);
                            setSelectedRuleId(null);
                          }}
                        >
                          <strong className="text-ui">{field.label || "Untitled field"}</strong>
                          <span className="mt-0.5 block text-label text-muted">
                            {FIELD_TYPE_LABELS[field.type]}
                            {field.requireEvidenceOnFail ? " · required evidence on fail" : ""}
                            {field.required ? " · required" : ""}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <DndContext
                    id="builder-fields"
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onFieldDragEnd}
                  >
                    <SortableContext
                      items={selectedSection.fields.map((field) => field.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1" role="list">
                        {selectedSection.fields.map((field) => (
                          <SortableRow key={field.id} id={field.id}>
                            {(handle) => (
                              <div className="flex items-stretch gap-1" role="listitem">
                                <button
                                  type="button"
                                  className="h-auto shrink-0 border border-ink bg-ticket px-2 text-label"
                                  aria-label={`Move ${field.label || "field"}`}
                                  {...handle}
                                >
                                  Move
                                </button>
                                <button
                                  type="button"
                                  className={`min-w-0 flex-1 border px-3 py-2 text-left ${
                                    field.id === selectedFieldId
                                      ? "border-ink bg-fill"
                                      : "border-rule bg-ticket"
                                  }`}
                                  onClick={() => {
                                    setSelectedFieldId(field.id);
                                    setSelectedRuleId(null);
                                  }}
                                >
                                  <strong className="text-ui">
                                    {field.label || "Untitled field"}
                                  </strong>
                                  <span className="mt-0.5 block text-label text-muted">
                                    {FIELD_TYPE_LABELS[field.type]}
                                    {field.requireEvidenceOnFail
                                      ? " · required evidence on fail"
                                      : ""}
                                    {field.required ? " · required" : ""}
                                  </span>
                                </button>
                              </div>
                            )}
                          </SortableRow>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
                <Button size="sm" disabled={readOnly || !selectedSection} onClick={addField}>
                  Add field
                </Button>
                <div className="border-t border-dashed border-ink pt-3">
                  <h3 className="font-display text-title">Rules</h3>
                  <ul className="mt-2 space-y-1">
                    {schema.rules.map((rule) => (
                      <li key={rule.id}>
                        <button
                          type="button"
                          className={`w-full border px-3 py-2 text-left text-ui ${
                            rule.id === selectedRuleId
                              ? "border-ink bg-fill"
                              : "border-rule bg-ticket"
                          }`}
                          onClick={() => {
                            setSelectedRuleId(rule.id);
                            setSelectedFieldId(null);
                          }}
                        >
                          {summarizeRule(schema, rule)}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={readOnly || listFields(schema).length === 0}
                    onClick={addRule}
                  >
                    Add rule
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-ui text-muted">Clone a starter pack or add a section.</p>
            )}
          </Panel>
        </section>

        <aside>
          <Panel>
            <h2 className="font-display text-title">Field config</h2>
            <p className="mt-1 mb-3 text-label text-muted">
              Keyboard: ↑↓ reorder, Enter edit, Esc close.
            </p>
            {selectedField && selectedSection ? (
              <FieldConfig
                field={selectedField}
                sections={schema.sections}
                readOnly={readOnly}
                onChange={(patch) => patchField(selectedSection.id, selectedField.id, patch)}
                onDelete={() => {
                  patchSection(selectedSection.id, {
                    fields: selectedSection.fields.filter((field) => field.id !== selectedField.id),
                  });
                  setSelectedFieldId(null);
                }}
              />
            ) : selectedRule ? (
              <RuleConfig
                schema={schema}
                rule={selectedRule}
                readOnly={readOnly}
                onChange={(patch) =>
                  updateSchema((current) => ({
                    ...current,
                    rules: current.rules.map((rule) =>
                      rule.id === selectedRule.id ? { ...rule, ...patch } : rule,
                    ),
                  }))
                }
                onDelete={() => {
                  updateSchema((current) => ({
                    ...current,
                    rules: current.rules.filter((rule) => rule.id !== selectedRule.id),
                  }));
                  setSelectedRuleId(null);
                }}
              />
            ) : selectedSection ? (
              <div className="space-y-3">
                <label
                  className="block text-label font-medium tracking-label text-muted"
                  htmlFor="section-title"
                >
                  Section name
                </label>
                <Input
                  id="section-title"
                  value={selectedSection.title}
                  disabled={readOnly}
                  onChange={(event) =>
                    patchSection(selectedSection.id, { title: event.target.value })
                  }
                />
                <Button
                  variant="danger"
                  size="sm"
                  disabled={readOnly}
                  onClick={() => {
                    updateSchema((current) => ({
                      ...current,
                      sections: current.sections.filter(
                        (section) => section.id !== selectedSection.id,
                      ),
                    }));
                    setSelectedSectionId(
                      schema.sections.find((section) => section.id !== selectedSection.id)?.id ??
                        null,
                    );
                  }}
                >
                  Delete section
                </Button>
              </div>
            ) : (
              <p className="text-ui text-muted">Select a section or field.</p>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
