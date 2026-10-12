# Week 6 build plan — operations layer

Resume contract for sessions that may stop at a usage-quota reset. **Do not skip ahead.** Finish the current step, mark it `done` here and in `PROGRESS.md`, then start the next step.

**Stories:** P0-27–P0-30. **Gate:** a recurring rule creates one — and only one — assignment at the correct local date; a QR scan reaches the correct tenant-scoped asset.

Never-cut: offline integrity, tenant isolation, installability, report quality.

---

## Resume here

| Field                    | Value                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Date                     | 31 Aug 2026                                                                               |
| Current step             | **W6-S8** — seed + browser gate                                                           |
| Status                   | `done`                                                                                    |
| Last finished            | W6-S3–S8: repositories, sites UI, QR, schedules, portal, seed, browser gate on **dev**    |
| Next step                | Week 7 is done. Week 8 only when asked.                                                   |
| Do not start             | Week 8 RC, **prod** project, paid APIs, CSV import (P1-01), SMS, maps                     |
| Prompt for a new session | `Read PROGRESS.md. Weeks 1–7 are done. Do not start Week 8 until asked. No prod project.` |

When a step is done, move **Current step** to the next id, set that row to `done`, and leave evidence paths.

---

## Scope lock

In: sites/assets hierarchy, tags, archive, history, CSV-friendly external ids, printable QR sheet, protected launch route, keypad/scan fallback, recurring schedules, timezone-safe next-run, due/overdue, idempotent job table + cron entry, corrective-action portal (comments, evidence, verify, reopen, reminders).

Out: Week 7 white-label depth, plan limits, impersonation, CSV bulk import/export (P1-01 — ids only this week), paid HTML-to-PDF, extra report layouts, map tiles, SMS, pg_cron as a paid add-on, **prod** Supabase project, interviews.

Pinned packages already in `pnpm-workspace.yaml` catalog. **Install only on the step that first needs them:**

| Package  | Pin   | First step |
| -------- | ----- | ---------- |
| `qrcode` | 1.5.4 | W6-S5      |

No new date/rrule/cron libraries. Next-run is `Intl` + civil-date arithmetic in `@inspectstack/domain`. Job worker is HTTP `POST /api/jobs/run` with `CRON_SECRET` (Netlify schedule optional). Double-fire is safe because of a unique `(schedule_rule_id, local_date)` index.

UI language: site / asset / due / overdue / queued job / shared QR / closed finding. Never protocol jargon on the launch page.

Demo beat to protect: 12 Harbour St / Unit 4 → QR launches the Northline asset (Westfield scan is denied and leaks nothing) → weekly Property Condition rule in `Australia/Sydney` creates one assignment for that local date even if the worker runs twice.

---

## Architecture (do not reopen)

- `/app/sites` is the tree. `/app/sites/[id]` is the site desk (assets, history, assign, QR sheet). `/app/sites/assets/[id]` is the asset desk.
- `/app/go` is keypad fallback. `/app/go/[token]` is the protected launch route. It is **not** public: unauthenticated users hit login with `next=` back to the token. Wrong-org membership is denied with the same copy as an unknown token — no asset name, address, or org leak.
- QR token stays unique plaintext (physical labels must reprint the same code). Mint unguessable `ISQ-` codes; do not derive from org id + external id. Camera scan uses browser `BarcodeDetector` when present; otherwise the keypad.
- Printable sheet: `/app/sites/[id]/qr` renders labels with `qrcode` 1.5.4 encoding `{APP_URL}/app/go/{token}`.
- Sites already have `parent_id`, `tags`, `external_id`, `archived_at`. Assets already have those plus `qr_token`. Unique `(organization_id, external_id)` WHERE NOT NULL already exists in SQL; Drizzle schema must match. CSV-friendly means the id field, not a spreadsheet importer.
- `canManageSites` = owner / admin. Inspector and reviewer may view. `client_viewer` does not open the sites tree. Inspector cannot create sites in v1.
- Recurring rules live in `schedule_rules`. Each fire inserts a `schedule_jobs` row then an `assigned` inspection. Unique `(schedule_rule_id, local_date)` — a second cron tick is a no-op, not a second job.
- `local_date` is a civil `YYYY-MM-DD` in the **rule** timezone (copied from the org at save so a later org TZ edit does not rewrite history). `inspections.due_at` is timestamptz for that local date + local time.
- Frequencies in v1: `weekly` (weekday), `monthly` (day-of-month, clamped), `every_n_days`, `once`. No rrule package.
- Cron: `POST /api/jobs/run` Authorization `Bearer CRON_SECRET`. Schedules page also has **Run due jobs** for the demo. Do not add pg_cron.
- Corrective portal is `/app/actions` + `/app/actions/[id]`. Authenticated org members only (including `client_viewer`). Comments + evidence (existing `media.finding_id`). Verify/close and reopen stay `canReview`. Reminders are overdue stamps; email uses the existing project mailbox only if it stays cheap — do not add SMS.
- If the week overruns, cut portal reminder depth (P0-30 is the named cut), never uniqueness, never QR tenant isolation.

---

## Steps

Status vocabulary: `not started` · `in progress` · `done` · `blocked`.

### W6-S0 — Plan and start decision

|          |                                                                         |
| -------- | ----------------------------------------------------------------------- |
| Status   | `done`                                                                  |
| Goal     | Durable step list so quota-split sessions continue without re-planning. |
| Evidence | this file; `DECISIONS.md` 31 Aug 2026; `PROGRESS.md` current week = 6   |

### W6-S1 — Domain: sites, QR launch, schedules, portal authz

|         |                                                                                                    |
| ------- | -------------------------------------------------------------------------------------------------- |
| Status  | `done`                                                                                             |
| Stories | P0-27–P0-30 foundation                                                                             |
| Files   | `packages/domain/src/sites.ts`, `qr.ts`, `schedules.ts`, `actions-portal.ts`, `operations.test.ts` |
| Do not  | UI, `qrcode` install, SQL                                                                          |

### W6-S2 — Schema for parent FK, schedule rules, jobs, finding comments

|         |                                                                                 |
| ------- | ------------------------------------------------------------------------------- |
| Status  | `done`                                                                          |
| Stories | P0-27, P0-29, P0-30                                                             |
| Files   | `packages/db/src/schema.ts`, `supabase/migrations/20260831180000_week6_ops.sql` |
| Apply   | `pnpm --filter @inspectstack/db migrate:week6` applied on **dev** 31 Aug 2026   |
| Do not  | UI                                                                              |

### W6-S3 — Repositories: sites/assets CRUD, history, jobs, tenancy negatives

|         |                                                                |
| ------- | -------------------------------------------------------------- |
| Status  | `done`                                                         |
| Stories | P0-27, P0-29                                                   |
| Files   | `packages/db/src/sites.ts`, `schedules.ts`, `portal.ts`        |
| Authz   | tenant scope on every read/write; Westfield cannot see Harbour |
| Do not  | QR sheet polish                                                |

### W6-S4 — Sites/assets UI: tree, desk, tags, archive, assign

|         |                                                                                    |
| ------- | ---------------------------------------------------------------------------------- |
| Status  | `done`                                                                             |
| Stories | P0-27                                                                              |
| Routes  | `/app/sites`, `/app/sites/[id]`, `/app/sites/assets/[id]`                          |
| States  | empty tree, duplicate external id, cycle parent, inspector denied, archived hidden |
| Do not  | QR install (next step)                                                             |

### W6-S5 — QR sheet, protected launch, keypad / camera fallback

|         |                                                                               |
| ------- | ----------------------------------------------------------------------------- |
| Status  | `done`                                                                        |
| Stories | P0-28                                                                         |
| Install | `qrcode` 1.5.4 in `@inspectstack/web`                                         |
| Routes  | `/app/sites/[id]/qr`, `/app/go`, `/app/go/[token]`                            |
| Gate    | Northline token opens Harbour asset; Westfield session denied; nothing leaked |

### W6-S6 — Recurring schedules, job table, cron, due/overdue

|         |                                                                     |
| ------- | ------------------------------------------------------------------- |
| Status  | `done`                                                              |
| Stories | P0-29                                                               |
| Routes  | `/app/schedules`, `POST /api/jobs/run`                              |
| Gate    | double POST creates one inspection; Sydney local date, not UTC date |

### W6-S7 — Corrective-action portal

|         |                                                                                 |
| ------- | ------------------------------------------------------------------------------- |
| Status  | `done`                                                                          |
| Stories | P0-30                                                                           |
| Routes  | `/app/actions`, `/app/actions/[id]`                                             |
| States  | empty queue, comment, evidence, verify, reopen, overdue, inspector cannot close |

### W6-S8 — Seed + browser gate

|        |                                                                                  |
| ------ | -------------------------------------------------------------------------------- |
| Status | `done` 31 Aug 2026                                                               |
| Seed   | Harbour hierarchy + tags + `ISQ-N4HRBR24`; weekly Sydney rule; open finding      |
| Gate   | Recurring rule → NL-1004 at 2026-09-01 Sydney; second run 0; Westfield QR denied |
