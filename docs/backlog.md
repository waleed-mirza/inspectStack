# Prioritized backlog

Frozen 26 Aug 2026. Hours are engineering estimates for one experienced full-stack developer. P0 must fit Weeks 2–9. If a weekly gate fails, cut a P1/P2 item before stealing more than two days from the next week. Never-cut: offline integrity, tenant isolation, installability, report quality.

## P0 — v1 ship (estimate each story)

| ID    | Story                                                                                                                                                  | Week | Hours | Why                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ----- | ------------------------------------ |
| P0-01 | Monorepo (`apps/web`, `packages/{db,domain,ui,reports,config,testkit}`), pnpm, TS strict, CI lint/typecheck/unit/migration, env schema, `.env.example` | 2    | 5     | Installability starts here           |
| P0-02 | `supabase/` config, link **dev** project, one-command seed/reset                                                                                       | 2    | 4     | Founder workflow; no Docker          |
| P0-03 | Supabase Auth: password, magic link, optional OAuth flags; SSR cookies                                                                                 | 2    | 6     | Identity                             |
| P0-04 | Organizations, membership, roles, active-org resolution, invitation skeleton                                                                           | 2    | 5     | Tenant root                          |
| P0-05 | Drizzle schema + migrations for tenant, user, site, asset, template, inspection, media, finding, report, sync, audit                                   | 2    | 6     | Domain tables                        |
| P0-06 | Tenant-scoped repositories + first cross-tenant negative tests                                                                                         | 2    | 4     | Never-cut isolation                  |
| P0-07 | Supabase Storage adapter + project email for invites/magic links                                                                                       | 2    | 4     | Dev/prod = two projects              |
| P0-08 | App shell, responsive nav, tokens, dark-safe logo, empty/loading/error, demo personas                                                                  | 2    | 5     | Operator-familiar chrome             |
| P0-09 | First hosted demo deployment                                                                                                                           | 2    | 3     | Something to show                    |
| P0-10 | Template library: create, clone starter, list, retire                                                                                                  | 3    | 4     | Entry to builder                     |
| P0-11 | Section/field CRUD, dnd-kit reorder, keyboard, field config panel                                                                                      | 3    | 8     | Core authoring                       |
| P0-12 | v1 field types (plan §3.2) + pass/fail scoring + required evidence on fail                                                                             | 3    | 7     | Inspection language                  |
| P0-13 | Constrained conditionals + circular-rule prevention + readable summary                                                                                 | 3    | 5     | Rules without a programming language |
| P0-14 | Immutable publish, preview, clone, version history, usage warning                                                                                      | 3    | 5     | Historical reports stay honest       |
| P0-15 | Four starter-pack schema drafts seeded                                                                                                                 | 3    | 4     | Demo verticals                       |
| P0-16 | Mobile runner: progress, validation, pass/fail shortcuts, section nav                                                                                  | 4    | 8     | Field execution                      |
| P0-17 | PWA + Dexie schema + assignment download + autosave + resume                                                                                           | 4    | 7     | Offline package                      |
| P0-18 | Operation queue, idempotent sync, revision conflicts, retry UI                                                                                         | 4    | 7     | Write-ahead log                      |
| P0-19 | Photo manifest, compression, captions, Konva annotation, signature, GPS, timestamps                                                                    | 4    | 7     | Evidence                             |
| P0-20 | Recovery screen + support-bundle export                                                                                                                | 4    | 3     | Forced-close story                   |
| P0-21 | Offline recovery scenarios (close, reopen, reconnect, duplicate op, interrupted media, low storage)                                                    | 4    | 4     | Week 4 gate                          |
| P0-22 | Reviewer queue, exception list, return/approve, audit trail                                                                                            | 5    | 6     | Approval                             |
| P0-23 | Finding lifecycle + owners + due dates                                                                                                                 | 5    | 4     | Actionable output                    |
| P0-24 | Two PDF layouts + branded cover/summary/sections/findings/media/signatures                                                                             | 5    | 10    | Commercial outcome                   |
| P0-25 | Four golden vertical PDFs + snapshot hash tests                                                                                                        | 5    | 4     | Report quality gate                  |
| P0-26 | Verification page, revocable share links, download logging                                                                                             | 5    | 4     | Trust artifact                       |
| P0-27 | Sites/assets hierarchy, tags, history, archive, CSV-friendly IDs                                                                                       | 6    | 6     | Subjects of work                     |
| P0-28 | Printable QR sheet + protected launch route + scan fallback                                                                                            | 6    | 4     | Field launch                         |
| P0-29 | Recurring schedules, timezone-safe next-run, due/overdue, idempotent job table                                                                         | 6    | 6     | Repeat work                          |
| P0-30 | Corrective-action portal (comments, evidence, verify, reopen, reminders)                                                                               | 6    | 6     | Close the loop                       |
| P0-31 | White-label settings: logo, colors, terminology, report/email identity, formats, legal footer                                                          | 7    | 6     | Agency proof                         |
| P0-32 | Plan limits, feature flags, usage; SaaS tenant admin                                                                                                   | 7    | 5     | Two operating modes                  |
| P0-33 | Super-admin tenants + impersonation with reason + audit                                                                                                | 7    | 3     | Support without silent god-mode      |
| P0-34 | Authorization matrix tests: tenant, role, signed URL, upload, public-link, rate-limit, secrets                                                         | 7    | 6     | Week 7 security gate                 |
| P0-35 | Feature freeze notes, v1.1 backlog, known limitations                                                                                                  | 7    | 2     | Stop expanding                       |
| P0-36 | Full test matrix (unit/integration/component/E2E, browsers, 1280 / 360)                                                                                | 8    | 8     | Release candidate                    |
| P0-37 | Two timed clean installs (native local + one managed cloud)                                                                                            | 8    | 4     | <20 min gate                         |
| P0-38 | Docs: Quick Start, architecture, config, deploy, storage/email, branding, packs, testing, upgrade, backup, troubleshooting                             | 8    | 8     | Install without us                   |
| P0-39 | Sample env, seed/reset, migration policy, changelog, support bundle, versioned archive                                                                 | 8    | 4     | Release archive                      |
| P0-40 | Demo polish: empty/loading/error, keyboard, a11y, throttled-mobile                                                                                     | 8    | 4     | First impression                     |
| P0-41 | 7-day private beta triage (blockers, data-loss, report, install only)                                                                                  | 9    | 8     | Real use                             |
| P0-42 | Launch candidate archive, checksums, license, third-party notices, support policy                                                                      | 9    | 4     | What they get                        |
| P0-43 | Videos (2–3 min overview, 8–12 min setup, four vertical clips), screenshots, report samples, feature matrix                                            | 9    | 8     | Project proof                        |
| P0-44 | Listing copy, FAQ, and onboarding email                                                                                                                 | 9    | 5     | Project page                         |

**P0 total: ~230 hours** across Weeks 2–9 (~35–45 h/week including QA/docs mix). If over, cut from P0-30 (corrective portal depth), P0-32 (metering depth), or extra video cut-downs — never from P0-06, P0-18, P0-21, P0-24, P0-34, P0-37.

## P1 — after launch readiness (v1.1)

Frozen out of v1 at Week 7 (`docs/freeze.md`). Do not start these until after launch or a `DECISIONS.md` row.

| ID    | Capability                               | Reason             |
| ----- | ---------------------------------------- | ------------------ |
| P1-01 | CSV import/export                        | Migration          |
| P1-02 | Template import / mini marketplace files | Agency reuse       |
| P1-03 | Webhooks + Zapier/Make examples          | Integration        |
| P1-04 | Additional report layouts                | Broader operators  |
| P1-05 | i18n / multilingual UI framework         | Non-EN operators   |
| P1-06 | Custom domains                           | SaaS polish        |
| P1-07 | Deeper plan metering                     | SaaS billing later |

## P2 — later, only with validated demand

| ID    | Capability                                                                  | Reason       |
| ----- | --------------------------------------------------------------------------- | ------------ |
| P2-01 | Optional AI summary / OCR / photo classification behind provider interfaces | v1 exclusion |
| P2-02 | Native wrappers, push                                                       | PWA first    |
| P2-03 | Map tiles, route planning                                                   | v1 exclusion |
| P2-04 | SMS                                                                         | v1 exclusion |
| P2-05 | External work-order / CRM integrations                                      | Not an ERP   |
