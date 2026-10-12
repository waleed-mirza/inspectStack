# Week 4 build plan — offline field runner

Resume contract for sessions that may stop at a usage-quota reset. **Do not skip ahead.** Finish the current step, mark it `done` here and in `PROGRESS.md`, then start the next step.

**Stories:** P0-16–P0-21. **Gate:** close tab, reopen, add evidence, reconnect, retry interrupted upload → exactly one canonical inspection, no lost answers. Pass twice on desktop emulation and twice on a real mid-range phone.

Never-cut: offline integrity, tenant isolation, installability, report quality.

---

## Resume here

| Field                    | Value                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| Date                     | 31 Aug 2026                                                                                        |
| Current step             | **W4-S11** — recovery gate                                                                         |
| Status                   | `done`                                                                                             |
| Last finished            | Desktop 2/2 + phone 2/2. Pass 2: answers and photos survived; chip **synced**. Week 4 gate met.    |
| Next step                | Week 5 review and reports when the founder asks. Do not start PDFs until then.                     |
| Do not start             | Week 5 until asked                                                                                 |
| Prompt for a new session | `Week 4 gate is met. Read PROGRESS.md. Start Week 5 only if asked. No prod project. No paid APIs.` |

When a step is done, move **Current step** to the next id, set that row to `done`, and leave evidence paths.

---

## Scope lock

In: installable PWA, Dexie package download, operation queue, autosave/resume, runner UI, photo manifest/compression/caption/annotation, signature, GPS, timestamps, idempotent sync, recovery + support bundle.

Out: Week 5 PDFs/review depth, Week 6 sites/QR/schedules, paid APIs, OCR, maps, SMS, native apps, CRDT collab, **prod** Supabase project.

Pinned packages already in `pnpm-workspace.yaml` catalog. **Install only on the step that first needs them:**

| Package                     | Pin             | First step |
| --------------------------- | --------------- | ---------- |
| `dexie`                     | 4.4.5           | W4-S4      |
| `@serwist/next`             | 9.5.12          | W4-S5      |
| `browser-image-compression` | 2.0.2           | W4-S9      |
| `konva` / `react-konva`     | 10.3.1 / 19.2.5 | W4-S9      |

UI language (ADR 0005): **offline / queued / syncing / failed / synced**. Never protocol jargon.

Demo beat to protect: Property Condition on `NL-1001` → fail smoke alarm → annotated photo → tenant signature → reconnect.

---

## Architecture (do not reopen)

- Route: `/app/run/[id]` is the field runner (360px, no desktop nav). `/app/inspections/[id]` stays the ticket/read view and later review entry.
- Online open downloads an **assignment bundle** (inspection shell, published template version, site/asset summary, responses, media metadata, upload policy). Stored in Dexie partitioned by `organizationId` + `userId` with an explicit schema version.
- Every local mutation is an operation: UUID `operationId`, entity id, client timestamp, `baseRevision`, type, payload hash. UI reads the local projection; the network is never required for “saved”.
- Server applies ops in a transaction against `sync_operations.client_operation_id` (unique per org). Same id returns the prior result.
- Conflicts: simple response = last accepted write with revision check; photos additive by content hash; findings = server transition rules; templates = no offline edit; submit = server validates complete snapshot.
- Authz: `canInspect` may mutate `draft` / `assigned` / `in_progress` / `returned`. Reviewer/client cannot write answers. Tenant scope on every repository call.
- Uploads never block section navigation. Submit blocks only if required evidence is missing or permanently failed.

Existing tables already cover inspections, responses, media, findings, `sync_operations`. W4-S2 adds media field/gps/annotation columns the runner needs.

---

## Steps

Status vocabulary: `not started` · `in progress` · `done` · `blocked`.

### W4-S0 — Plan and start decision

|          |                                                                         |
| -------- | ----------------------------------------------------------------------- |
| Status   | `done`                                                                  |
| Goal     | Durable step list so quota-split sessions continue without re-planning. |
| Evidence | this file; `DECISIONS.md` 30 Aug 2026; `PROGRESS.md` current week = 4   |

### W4-S1 — Domain: operations, bundle, validation

|           |                                                                                                                                                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status    | `done`                                                                                                                                                                                                                                                   |
| Stories   | Foundation for P0-16–P0-21                                                                                                                                                                                                                               |
| Files     | `packages/domain/src/inspection-ops.ts`, `inspection-validation.ts`, `assignment-bundle.ts`, `inspection-ops.test.ts`, `index.ts`, `statuses.ts`                                                                                                         |
| Deps      | none                                                                                                                                                                                                                                                     |
| Evidence  | `pnpm --filter @inspectstack/domain typecheck` 30 Aug 2026. Tests written, not executed (run only on request).                                                                                                                                           |
| Done when | Operation types + stable payload hash; local projection apply is idempotent by `operationId`; submit validation blocks fail-without-photo and missing required signature on the Property Condition pack; runner progress ignores hidden/computed fields. |
| Do not    | Install Dexie/Serwist; touch Next routes; migrate Postgres.                                                                                                                                                                                              |

### W4-S2 — Repositories and schema

|           |                                                                                                                                                                                                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status    | `done`                                                                                                                                                                                                                                                                                                    |
| Stories   | P0-17/P0-18 server half                                                                                                                                                                                                                                                                                   |
| Files     | `packages/db/src/schema.ts`, `supabase/migrations/20260830180000_week4_media_capture.sql`, `packages/db/src/inspections.ts`, `tenancy.integration.test.ts`, `repositories.tenancy.test.ts`                                                                                                                |
| Evidence  | `pnpm --filter @inspectstack/db typecheck` 30 Aug 2026. Media SQL applied on **dev** via app DB client (`npx supabase db push` 403). Tests written, not executed.                                                                                                                                         |
| Done when | `getAssignmentBundle` is tenant-scoped (Westfield id → null for Northline). `applySyncOperations` is idempotent on `clientOperationId`, increments inspection revision, writes responses/media. Media rows store `fieldKey`, capture time, optional GPS, annotation JSON. Cross-tenant apply is rejected. |
| Do not    | Client queue or UI.                                                                                                                                                                                                                                                                                       |

### W4-S3 — Server actions and download route

|           |                                                                                                                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status    | `done`                                                                                                                                                                                        |
| Stories   | P0-17/P0-18 API                                                                                                                                                                               |
| Files     | `apps/web/src/lib/inspection-sync.ts`, `apps/web/src/lib/actions/inspections.ts`, `apps/web/src/app/app/run/[id]/bundle/route.ts`                                                             |
| Evidence  | `pnpm --filter @inspectstack/web typecheck` 30 Aug 2026. GET/POST `/app/run/[id]/bundle`. `canInspect` only; `client_viewer` is 403.                                                          |
| Done when | Authenticated inspector can download a bundle and post ops. Role denial for `client_viewer`. Zod at the boundary. Audit events for start/submit. Duplicate op POST returns the stored result. |
| Do not    | Dexie or runner chrome.                                                                                                                                                                       |

### W4-S4 — Dexie package and operation queue

|           |                                                                                                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status    | `done`                                                                                                                                                                                                                    |
| Stories   | P0-17, P0-18 client half                                                                                                                                                                                                  |
| Deps      | `dexie@4.4.5` on `@inspectstack/web`                                                                                                                                                                                      |
| Files     | `apps/web/src/lib/offline/{db,queue,projection,index}.ts`, `apps/web/src/components/sign-out-button.tsx`                                                                                                                  |
| Evidence  | Schema v1 `inspectstack` DB, partition `orgId:userId`. Sign-out calls `purgeOnSignOut`. `purgeOnWorkspaceSwitch` exists but is not auto-run (offline integrity). `pnpm --filter @inspectstack/web typecheck` 30 Aug 2026. |
| Done when | IndexedDB schema versioned; partitions by org+user; bundle persist; enqueue op + update local projection without network; purge on logout/org switch is defined.                                                          |
| Do not    | Service worker or field widgets.                                                                                                                                                                                          |

### W4-S5 — Installable PWA

|           |                                                                                                                                                                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status    | `done`                                                                                                                                                                                                                             |
| Stories   | P0-17                                                                                                                                                                                                                              |
| Deps      | `@serwist/next@9.5.12`, `serwist@9.5.12`                                                                                                                                                                                           |
| Files     | `apps/web/next.config.ts`, `src/app/sw.ts`, `manifest.ts`, `offline/page.tsx`, icons, `components/service-worker.tsx`                                                                                                              |
| Evidence  | `pnpm --filter @inspectstack/web typecheck` 30 Aug 2026. Templates/login/auth = NetworkOnly. `/app/run` + `/app/inspections` = NetworkFirst. `/offline` fallback. Manifest + 192/512 icons. SW disabled in `next dev --turbopack`. |
| Done when | App is installable; runner/bundle/static assets cache; `/app/templates` builder is network-first (no offline template editing).                                                                                                    |
| Do not    | Photo pipeline.                                                                                                                                                                                                                    |

### W4-S6 — Runner UI (online-capable, local projection)

|           |                                                                                                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status    | `done`                                                                                                                                                                                                                                                        |
| Stories   | P0-16                                                                                                                                                                                                                                                         |
| Files     | `apps/web/src/app/app/run/layout.tsx`, `run/[id]/page.tsx`, `apps/web/src/components/runner/*`, ticket link on `/app/inspections/[id]`                                                                                                                        |
| Evidence  | `pnpm --filter @inspectstack/web typecheck` 30 Aug 2026. Browser: inspector opens `NL-1001` at `/app/run/[id]`, 1280 + 360, section chips, pass/fail, progress, `client_viewer` denied in page.                                                               |
| Done when | One-handed 360px: section nav, progress, pass/fail/N/A shortcuts, all v1 field types except photo annotation (stub capture ok), scoring, visible/required from rules. Empty/loading/error/denied. Tokens only (`inspectstack-ui`). Desktop 1280 still usable. |
| Do not    | Konva, compression, recovery screen.                                                                                                                                                                                                                          |

### W4-S7 — Autosave and resume

|           |                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status    | `done`                                                                                                                                            |
| Stories   | P0-17                                                                                                                                             |
| Evidence  | Browser 30 Aug 2026: Occupancy Tenanted survived full reload. Unit `4B` survived recovery round-trip. Chip never shows a network “saved” spinner. |
| Done when | Each answer writes Dexie first; reopen same assignment restores projection; no “saved” spinner tied to network.                                   |
| Do not    | Conflict UI polish beyond a stub.                                                                                                                 |

### W4-S8 — Sync loop, conflicts, retry

|           |                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Status    | `done`                                                                                                                                                                                                 |
| Stories   | P0-18                                                                                                                                                                                                  |
| Files     | `apps/web/src/lib/offline/sync.ts`                                                                                                                                                                     |
| Evidence  | Browser: chip **offline / queued / synced**. Conflict retry re-enqueues a new `operationId`. Duplicate apply is still unique on `client_operation_id`.                                                 |
| Done when | Online drain of queue; status chip uses the five UI words; failed ops retry; duplicate `operationId` does not double-write; response conflict shown when server revision > base; photos stay additive. |
| Do not    | Support-bundle export (next step).                                                                                                                                                                     |

### W4-S9 — Evidence: photo, caption, annotation, signature, GPS

|           |                                                                                                                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status    | `done`                                                                                                                                                                                                               |
| Stories   | P0-19                                                                                                                                                                                                                |
| Deps      | `browser-image-compression@2.0.2`, `konva@10.3.1`, `react-konva@19.2.5` on `@inspectstack/web`                                                                                                                       |
| Files     | `apps/web/src/lib/offline/{db,media}.ts` (schema v2 blobs), `photo-field.tsx`, `photo-annotate.tsx`, `signature-pad.tsx`, `run/[id]/media/route.ts`                                                                  |
| Evidence  | Catalog pins installed. Manifest op before byte POST. Signature pad + Konva layer on smoke photo. GPS denied in headless (`Location is not available on this device.`). Cross-tenant byte put returns `not_found`.   |
| Done when | Compress + content hash + manifest before upload; caption; Konva annotation layer; signature pad; GPS + timestamps on capture; metadata can sync before bytes; interrupted upload is retryable by the same media id. |
| Do not    | PDF embedding (Week 5).                                                                                                                                                                                              |

### W4-S10 — Recovery screen and support bundle

|           |                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------- |
| Status    | `done`                                                                                                  |
| Stories   | P0-20                                                                                                   |
| Files     | `apps/web/src/app/app/run/[id]/recovery/page.tsx`, `recovery-screen.tsx`, `support-bundle.ts`           |
| Evidence  | Browser 30 Aug 2026: `/app/run/[id]/recovery` lists 0 queued after sync; Retry + Export support bundle. |
| Done when | Lists queued/failed records; retry; export JSON+hashes support bundle; low-storage warning is visible.  |
| Do not    | Week 5 review queue.                                                                                    |

### W4-S11 — Recovery gate (browser)

|           |                                                                                                                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Status    | `done`                                                                                                                                                                                                                                                                   |
| Stories   | P0-21                                                                                                                                                                                                                                                                    |
| Evidence  | Desktop 2/2 (30 Aug). Phone 2/2 (31 Aug) on founder device as `inspector@inspectstack.demo` / `NL-1001`. Pass 2: Unit/Address + meter photos still present after close-tab/reconnect; chip **synced**. HTTP LAN needed SHA-256 fallback + UUID v4 via `getRandomValues`. |
| Done when | Scripted path on `NL-1001`: work offline → close tab → reopen → add evidence → reconnect → retry interrupted upload → one inspection, no lost answers. Desktop **met**. Phone **met**.                                                                                   |
| Do not    | Start Week 5 PDFs until asked.                                                                                                                                                                                                                                           |

Phone path (founder device, twice):

1. From repo root: `pnpm build` then `pnpm --filter @inspectstack/web exec next start --hostname 0.0.0.0 --port 3000` (LAN, not `127.0.0.1`).
2. On the phone (same Wi-Fi): open `http://<LAN-IP>:3000/login`, sign in as `inspector@inspectstack.demo` with `SEED_PASSWORD`.
3. Open `NL-1001` field runner. Wait until the status chip is **synced** (service worker is controlling).
4. Airplane mode. Change Unit and Address. Close the tab. Reopen the same runner URL. Values must still be there.
5. Add a meter photo. Reconnect. Open Recovery → **Retry failed** if the chip is **failed** or **queued**. One `NL-1001`, no lost answers.
6. Repeat steps 4–5 once more with different Unit/Address text.

---

## How to resume after a quota reset

1. Read `PROGRESS.md` (must say Week 4) and this file’s **Resume here**.
2. Read `DECISIONS.md` 30 Aug 2026 Week 4 row.
3. Implement **only the current step**. If it is already `done`, start the next `not started` step.
4. Update **Resume here**, the step table, `PROGRESS.md` evidence, and workspace `MEMORY.md` Current status before stopping.
5. Do not run test suites unless the founder asks.

Calendar Week 4 is 16–22 Sep 2026; product work started 30 Aug 2026 (ahead of calendar, same as Weeks 2–3).
