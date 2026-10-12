"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  answersByFieldId,
  evaluateFieldState,
  parseAssignmentBundle,
  projectionAllowsWrites,
  runnerProgress,
  submitBlockedReason,
  validateForSubmit,
  type RunnerSyncState,
  type TemplateField,
} from "@inspectstack/domain";
import {
  Button,
  DeniedState,
  EmptyState,
  ErrorState,
  LoadingState,
  LogoPlate,
  Notice,
  StatusStamp,
} from "@inspectstack/ui";
import { AppLink } from "@/components/action-link";
import {
  captureGps,
  deriveRunnerSyncState,
  drainInspectionQueue,
  enqueueLocalOperation,
  estimateDeviceStorage,
  getLocalAssignment,
  listMediaBlobs,
  listQueuedOperations,
  offlineDbAvailable,
  persistAssignmentBundle,
  prepareEvidenceBlob,
  putMediaBlob,
  removeMediaBlob,
  retryFailed,
  type AssignmentRecord,
  type OfflineScope,
} from "@/lib/offline";
import { FieldControl } from "./field-control";
import { PhotoField } from "./photo-field";
import { SignaturePad } from "./signature-pad";
import type { PhotoAnnotation } from "./photo-annotate";

function subscribeOnline(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function stampTone(state: RunnerSyncState): "pass" | "fail" | "queued" | "offline" | "ink" {
  if (state === "synced") return "pass";
  if (state === "failed") return "fail";
  if (state === "offline") return "offline";
  if (state === "queued" || state === "syncing") return "queued";
  return "ink";
}

function fieldAnswer(field: TemplateField, responses: Record<string, unknown>) {
  if (Object.prototype.hasOwnProperty.call(responses, field.key)) return responses[field.key];
  return responses[field.id];
}

export function RunnerApp({
  inspectionId,
  organizationId,
  userId,
  organizationName,
  logoUrl,
}: {
  inspectionId: string;
  organizationId: string;
  userId: string;
  organizationName: string;
  logoUrl?: string | null;
}) {
  const scope = useMemo<OfflineScope>(() => ({ organizationId, userId }), [organizationId, userId]);
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const [record, setRecord] = useState<AssignmentRecord | null>(null);
  const [phase, setPhase] = useState<
    "loading" | "ready" | "missing" | "denied" | "error" | "unavailable"
  >("loading");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [syncState, setSyncState] = useState<RunnerSyncState>("synced");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [submitHint, setSubmitHint] = useState<string | null>(null);
  const [lowStorage, setLowStorage] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [annotatingId, setAnnotatingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"submit" | "retry" | null>(null);
  const [gpsBusy, setGpsBusy] = useState<string | null>(null);
  const drainTimer = useRef<number | null>(null);
  const answerTimers = useRef<Map<string, number>>(new Map());

  const refreshQueueChip = useCallback(async () => {
    const [ops, blobs] = await Promise.all([
      listQueuedOperations(scope, inspectionId),
      listMediaBlobs(scope, inspectionId),
    ]);
    const failed =
      ops.filter((row) => row.status === "failed").length +
      blobs.filter((row) => row.uploadStatus === "failed").length;
    const sending =
      ops.some((row) => row.status === "sending") ||
      blobs.some((row) => row.uploadStatus === "sending");
    const queued =
      ops.filter((row) => row.status === "queued").length +
      blobs.filter((row) => row.uploadStatus === "queued").length;
    setConflicts(
      ops
        .filter((row) => row.lastError === "conflict")
        .map((row) => {
          const key = row.operation.payload.fieldKey;
          return typeof key === "string" ? key : row.operation.entityId;
        }),
    );
    const nextError =
      ops.find((row) => row.status === "failed" && row.lastError)?.lastError ??
      blobs.find((row) => row.uploadStatus === "failed" && row.lastError)?.lastError ??
      null;
    setSyncError(nextError);
    setSyncState(
      deriveRunnerSyncState({
        online,
        sending,
        queued,
        failed,
      }),
    );
  }, [inspectionId, online, scope]);

  const scheduleDrain = useCallback(() => {
    if (drainTimer.current) window.clearTimeout(drainTimer.current);
    drainTimer.current = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await drainInspectionQueue(scope, inspectionId);
          const next = await getLocalAssignment(scope, inspectionId);
          if (next) setRecord(next);
          if (result.conflicts.length > 0) {
            setConflicts(result.conflicts.map((item) => item.fieldKey ?? item.operationId));
          }
        } finally {
          await refreshQueueChip();
        }
      })();
    }, 350);
  }, [inspectionId, refreshQueueChip, scope]);

  const reloadLocal = useCallback(async () => {
    const next = await getLocalAssignment(scope, inspectionId);
    if (next) setRecord(next);
    await refreshQueueChip();
    return next;
  }, [inspectionId, refreshQueueChip, scope]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!offlineDbAvailable()) {
        setPhase("unavailable");
        return;
      }
      try {
        const local = await getLocalAssignment(scope, inspectionId);
        if (local && !cancelled) {
          setRecord(local);
          setPhase("ready");
        }
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          if (!local) {
            setPhase("missing");
            return;
          }
          const storage = await estimateDeviceStorage();
          if (!cancelled) setLowStorage(Boolean(storage?.low));
          await refreshQueueChip();
          return;
        }
        const response = await fetch(`/app/run/${inspectionId}/bundle`, { cache: "no-store" });
        if (cancelled) return;
        if (response.status === 403) {
          setPhase("denied");
          return;
        }
        if (response.ok) {
          const payload = (await response.json()) as { bundle?: unknown };
          if (payload.bundle && typeof payload.bundle === "object") {
            await persistAssignmentBundle(scope, parseAssignmentBundle(payload.bundle));
            await reloadLocal();
            setPhase("ready");
          }
        } else if (!local) {
          setPhase(response.status === 404 ? "missing" : "error");
          return;
        }
        const storage = await estimateDeviceStorage();
        if (!cancelled) setLowStorage(Boolean(storage?.low));
        await refreshQueueChip();
        scheduleDrain();
      } catch {
        if (!cancelled) {
          const local = await getLocalAssignment(scope, inspectionId);
          if (local) {
            setRecord(local);
            setPhase("ready");
            await refreshQueueChip();
          } else setPhase("missing");
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [inspectionId, refreshQueueChip, reloadLocal, scheduleDrain, scope]);

  const mediaCount = record?.projection.media.length;

  useEffect(() => {
    if (mediaCount === undefined) return;
    let revoked: string[] = [];
    void (async () => {
      const blobs = await listMediaBlobs(scope, inspectionId);
      const next: Record<string, string> = {};
      for (const blob of blobs) {
        next[blob.mediaId] = URL.createObjectURL(blob.blob);
      }
      revoked = Object.values(next);
      setUrls(next);
    })();
    return () => {
      for (const url of revoked) URL.revokeObjectURL(url);
    };
  }, [inspectionId, mediaCount, scope]);

  useEffect(() => {
    if (!online) return;
    scheduleDrain();
  }, [online, scheduleDrain]);

  const schema = record?.bundle.template.schema;
  const projection = record?.projection;
  const writable = projection ? projectionAllowsWrites(projection) : false;
  const byId = useMemo(
    () => (schema && projection ? answersByFieldId(schema, projection.responses) : {}),
    [projection, schema],
  );
  const state = useMemo(() => (schema ? evaluateFieldState(schema, byId) : null), [byId, schema]);
  const progress = useMemo(
    () =>
      schema && projection ? runnerProgress(schema, projection.responses, projection.media) : null,
    [projection, schema],
  );
  const sections = schema?.sections ?? [];
  const currentSection = sections[sectionIndex] ?? sections[0];
  const visibleFields =
    currentSection && state
      ? currentSection.fields.filter((field) => !state.hidden.has(field.id))
      : [];
  const issues =
    schema && projection ? validateForSubmit(schema, projection.responses, projection.media) : [];
  const blocked = submitBlockedReason(issues);

  async function ensureStarted() {
    const current = await getLocalAssignment(scope, inspectionId);
    if (!current) return null;
    if (current.projection.status === "draft" || current.projection.status === "assigned") {
      const queued = await listQueuedOperations(scope, inspectionId);
      if (!queued.some((row) => row.operation.type === "start_inspection")) {
        await enqueueLocalOperation(scope, {
          inspectionId,
          type: "start_inspection",
          entityId: inspectionId,
          payload: {},
        });
      }
    }
    return getLocalAssignment(scope, inspectionId);
  }

  async function writeAnswer(fieldKey: string, entityId: string, value: unknown) {
    try {
      await ensureStarted();
      const result = await enqueueLocalOperation(scope, {
        inspectionId,
        type: "set_response",
        entityId,
        payload: { fieldKey, value },
      });
      setRecord((current) => (current ? { ...current, projection: result.projection } : current));
      scheduleDrain();
    } catch (error) {
      setSubmitHint(error instanceof Error ? error.message : "Could not save that answer.");
    }
  }

  function onAnswer(field: TemplateField, value: unknown, immediate: boolean) {
    const key = field.key;
    const existing = answerTimers.current.get(key);
    if (existing) window.clearTimeout(existing);
    const fire = () => {
      void writeAnswer(key, field.id, value);
    };
    if (immediate) {
      fire();
      return;
    }
    answerTimers.current.set(key, window.setTimeout(fire, 400));
  }

  async function addEvidence(field: TemplateField, file: File) {
    await ensureStarted();
    const prepared = await prepareEvidenceBlob({
      file,
      fieldKey: field.key,
      inspectionId,
    });
    const gps = await captureGps();
    await putMediaBlob(scope, {
      mediaId: prepared.mediaId,
      inspectionId,
      fieldKey: field.key,
      blob: prepared.blob,
      contentType: prepared.contentType,
      contentHash: prepared.contentHash,
      byteSize: prepared.byteSize,
      uploadStatus: "queued",
      capturedAt: prepared.capturedAt,
    });
    await enqueueLocalOperation(scope, {
      inspectionId,
      type: "add_media_manifest",
      entityId: prepared.mediaId,
      payload: {
        mediaId: prepared.mediaId,
        fieldKey: field.key,
        contentHash: prepared.contentHash,
        contentType: prepared.contentType,
        byteSize: prepared.byteSize,
        capturedAt: prepared.capturedAt,
        ...(gps ?? {}),
      },
    });
    await reloadLocal();
    scheduleDrain();
  }

  async function removeEvidence(mediaId: string) {
    await enqueueLocalOperation(scope, {
      inspectionId,
      type: "remove_media",
      entityId: mediaId,
      payload: { mediaId },
    });
    await removeMediaBlob(scope, mediaId);
    await reloadLocal();
    scheduleDrain();
  }

  async function updateCaption(mediaId: string, caption: string) {
    await enqueueLocalOperation(scope, {
      inspectionId,
      type: "update_media_meta",
      entityId: mediaId,
      payload: { mediaId, caption },
    });
    await reloadLocal();
    scheduleDrain();
  }

  async function saveAnnotation(mediaId: string, annotation: PhotoAnnotation) {
    await enqueueLocalOperation(scope, {
      inspectionId,
      type: "update_media_meta",
      entityId: mediaId,
      payload: { mediaId, annotation },
    });
    setAnnotatingId(null);
    await reloadLocal();
    scheduleDrain();
  }

  async function captureGpsField(field: TemplateField) {
    setGpsBusy(field.id);
    try {
      const gps = await captureGps();
      if (!gps) {
        setSubmitHint("Location is not available on this device.");
        return;
      }
      onAnswer(field, gps, true);
    } finally {
      setGpsBusy(null);
    }
  }

  async function submit() {
    if (blocked) {
      setSubmitHint(blocked);
      return;
    }
    setBusy("submit");
    try {
      await ensureStarted();
      await enqueueLocalOperation(scope, {
        inspectionId,
        type: "submit_inspection",
        entityId: inspectionId,
        payload: {},
      });
      await drainInspectionQueue(scope, inspectionId);
      await reloadLocal();
      setSubmitHint("Submitted. A reviewer can open this ticket from Review.");
    } finally {
      setBusy(null);
    }
  }

  if (phase === "loading") {
    return <LoadingState layout="runner" label="Opening assignment…" />;
  }
  if (phase === "unavailable") {
    return <ErrorState>This browser cannot store inspections offline.</ErrorState>;
  }
  if (phase === "denied") {
    return (
      <div className="p-5">
        <DeniedState>
          Inspectors and admins capture answers. This role cannot write the runner.
        </DeniedState>
      </div>
    );
  }
  if (phase === "missing") {
    return (
      <div className="p-5">
        <EmptyState title="No assignment downloaded">
          Open this job while online once so it can be stored on the phone.
        </EmptyState>
      </div>
    );
  }
  if (phase === "error" || !record || !schema || !projection || !state || !progress) {
    return (
      <div className="p-5">
        <ErrorState>Could not open this assignment.</ErrorState>
      </div>
    );
  }

  const siteLabel = record.bundle.site?.name ?? record.bundle.template.name;
  const scoreLabel =
    progress.score.percentPass !== null
      ? `${progress.score.percentPass}% pass`
      : progress.score.trafficLight;

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[32rem] flex-col bg-paper">
      <header className="ticket-rail shrink-0 border-b border-ink bg-ticket px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <LogoPlate name={organizationName} logoUrl={logoUrl} size="sm" />
            <div className="min-w-0">
              <p className="font-mono text-micro uppercase tracking-id text-muted">
                {record.bundle.inspection.number}
              </p>
              <p className="truncate font-display text-title leading-tight">{siteLabel}</p>
            </div>
          </div>
          <StatusStamp tone={stampTone(syncState)}>{syncState}</StatusStamp>
        </div>
        <p className="mt-2 text-label text-muted">
          {currentSection?.title ?? "Section"} · {progress.answered} of {progress.total}
        </p>
        <div
          className="mt-2 h-1 bg-fill"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          aria-label="Inspection progress"
        >
          <div className="h-full bg-brand" style={{ width: `${progress.percent}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {sections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                setSubmitHint(null);
                setSectionIndex(index);
              }}
              className={`h-8 rounded-control border px-2 text-label ${
                index === sectionIndex ? "border-ink bg-ink text-ticket" : "border-ink bg-ticket"
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
        {lowStorage ? (
          <Notice tone="fail" className="mb-4">
            This device is low on storage. Sync soon so drafts are not evicted.
          </Notice>
        ) : null}
        {conflicts.length > 0 ? (
          <Notice tone="fail" className="mb-4">
            An answer changed since you started. Keep yours from recovery, or retry after refresh.
          </Notice>
        ) : null}
        {syncState === "failed" ? (
          <Notice tone="fail" className="mb-4">
            {syncError
              ? `Sync failed (${syncError}). Answers are on this phone. Tap Retry.`
              : "Sync failed. Answers are on this phone. Tap Retry."}
          </Notice>
        ) : null}
        {submitHint ? (
          <Notice tone={blocked ? "fail" : "ink"} className="mb-4">
            {submitHint}
          </Notice>
        ) : null}
        {!writable ? (
          <Notice tone="fail" className="mb-4">
            This inspection is locked. Answers cannot be changed on the device.
          </Notice>
        ) : null}
        <div className="mb-4 flex flex-wrap gap-2">
          <StatusStamp
            tone={
              progress.score.trafficLight === "fail"
                ? "fail"
                : progress.score.trafficLight === "pass"
                  ? "pass"
                  : "queued"
            }
          >
            {scoreLabel}
          </StatusStamp>
          {state.findings.map((finding) => (
            <StatusStamp key={`${finding.fieldId}-${finding.title}`} tone="fail">
              {finding.title}
            </StatusStamp>
          ))}
        </div>
        <div className="space-y-5">
          {visibleFields.map((field) => {
            const value = fieldAnswer(field, projection.responses);
            const required = state.required.has(field.id);
            const media = projection.media.filter(
              (item) => item.fieldKey === field.key || item.fieldKey === field.id,
            );
            if (field.type === "photo_group") {
              return (
                <PhotoField
                  key={field.id}
                  field={field}
                  required={required}
                  disabled={!writable}
                  media={media}
                  urls={urls}
                  annotatingId={annotatingId}
                  onPick={(file) => addEvidence(field, file)}
                  onRemove={(mediaId) => void removeEvidence(mediaId)}
                  onCaption={(mediaId, caption) => void updateCaption(mediaId, caption)}
                  onAnnotate={setAnnotatingId}
                  onCloseAnnotate={() => setAnnotatingId(null)}
                  onSaveAnnotate={(mediaId, annotation) => saveAnnotation(mediaId, annotation)}
                />
              );
            }
            if (field.type === "signature" || field.type === "initials") {
              return (
                <div key={field.id}>
                  <p className="text-label font-medium tracking-label text-muted">
                    {field.label}
                    {required ? " *" : ""}
                  </p>
                  {media.length > 0 ? (
                    <p className="mt-1 text-ui">Captured on this device.</p>
                  ) : (
                    <div className="mt-2">
                      <SignaturePad
                        disabled={!writable}
                        onCapture={(file) => addEvidence(field, file)}
                      />
                    </div>
                  )}
                </div>
              );
            }
            if (field.type === "gps") {
              const gps =
                value && typeof value === "object"
                  ? (value as { latitude?: number; longitude?: number })
                  : null;
              return (
                <div key={field.id}>
                  <p className="text-label font-medium tracking-label text-muted">
                    {field.label}
                    {required ? " *" : ""}
                  </p>
                  {gps && Number.isFinite(gps.latitude) ? (
                    <p className="mt-1 font-mono text-ui">
                      {gps.latitude}, {gps.longitude}
                    </p>
                  ) : (
                    <Button
                      type="button"
                      className="mt-2"
                      disabled={!writable}
                      busy={gpsBusy === field.id}
                      busyLabel="Reading location…"
                      onClick={() => void captureGpsField(field)}
                    >
                      Capture location
                    </Button>
                  )}
                </div>
              );
            }
            const immediate =
              field.type === "pass_fail" ||
              field.type === "boolean" ||
              field.type === "single_select" ||
              field.type === "multi_select" ||
              field.type === "rating" ||
              field.type === "acknowledgment";
            return (
              <FieldControl
                key={field.id}
                field={field}
                value={value}
                required={required}
                disabled={!writable}
                computedLabel={scoreLabel}
                onChange={(next) => onAnswer(field, next, immediate)}
              />
            );
          })}
        </div>
      </main>

      <footer className="shrink-0 border-t border-ink bg-ticket px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            disabled={sectionIndex === 0}
            onClick={() => setSectionIndex((index) => Math.max(0, index - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            disabled={sectionIndex >= sections.length - 1}
            onClick={() => setSectionIndex((index) => Math.min(sections.length - 1, index + 1))}
          >
            Next
          </Button>
        </div>
        <Button
          type="button"
          variant="primary"
          className="mt-3 w-full"
          disabled={!writable || busy !== null}
          busy={busy === "submit"}
          busyLabel="Submitting…"
          onClick={() => void submit()}
        >
          Submit
        </Button>
        {blocked ? <p className="mt-2 text-label text-muted">{blocked}</p> : null}
        <div className="mt-3 flex justify-between text-ui">
          <AppLink href={`/app/inspections/${inspectionId}`} className="underline">
            Ticket
          </AppLink>
          <AppLink href={`/app/run/${inspectionId}/recovery`} className="underline">
            Recovery
          </AppLink>
          <Button
            type="button"
            size="sm"
            disabled={busy !== null}
            busy={busy === "retry"}
            busyLabel="Retrying…"
            onClick={async () => {
              setBusy("retry");
              try {
                await retryFailed(scope, inspectionId);
                await reloadLocal();
              } finally {
                setBusy(null);
              }
            }}
          >
            Retry
          </Button>
        </div>
      </footer>
    </div>
  );
}
