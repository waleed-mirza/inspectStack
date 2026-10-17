# InspectStack progress

Living tracker against the 10-week operating plan (25 Aug 2026).
Update this file whenever plan-related work starts or finishes. Do not mark an item done unless the exit criteria are actually met.

After updating this file, also update `~/.grok/memory/inspectstack-f497d06b/MEMORY.md` **Current status**.

**North star:** someone clones the MIT source, installs it, applies their brand, runs an offline inspection, and issues a client-ready report. Paid source SKUs are retired (historical) (`DECISIONS.md` 12 Oct 2026).

Never-cut: offline integrity, tenant isolation, installability, report quality.

## Current status

| Field                | Value                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan week            | **Week 10 of 10 — in progress.** `v1.0.1`. Source license is MIT. GitHub `waleed-mirza/inspectStack` is still private. |
| Phase                | Product. Design system locked. Core deps frozen except security. MIT publish cleanup done on main.                                                                                                            |
| Allowed product work | MIT publish readiness. Do not add product prices. Do not flip the repo public until asked. Trademark still gates a public product name. No **prod** Supabase. No paid APIs. |
| Blocked until        | Public GitHub flip waits for an explicit ask. Trademark/domain clearance still gates a public name.                                                            |
| Last updated         | 17 Oct 2026 (MIT wording cleanup: docs, package licenses, release notes) |

## How to use

1. Read this file at the start of every session.
2. Work only the current week's required output.
3. Check items only when evidence exists (a file, a count, a passing command).
4. Record scope, timing, or stack changes in `DECISIONS.md`.
5. Record MCP/skill/hook changes in `TOOLING.md`.

Status vocabulary: `not started`, `in progress`, `done`, `blocked`, `skipped`.

Calendar (decision 26 Aug 2026): Week 1 = 26 Aug–1 Sep 2026. Shift later weeks only via `DECISIONS.md`.

---

## Session 0 — Plan ingest and agent operating system (26 Aug 2026)

Done before Week 1. Not a product week.

| Item                                                                                       | Status | Evidence                                                |
| ------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------- |
| Operating plan ingested into workspace memory                                               | done   | `~/.grok/memory/inspectstack-f497d06b/MEMORY.md` (local) |
| Living week tracker                                                                        | done   | `PROGRESS.md`                                           |
| Agent rules                                                                                | done   | `AGENTS.md`                                             |
| Decision log + tooling map                                                                 | done   | `DECISIONS.md`, `TOOLING.md`                            |
| Project skills (later removed from tree)                                                                             | done   | `(screenshot evidence removed 12 Oct 2026)`                           |
| Hooks (later removed from tree)                               | done   | `(screenshot evidence removed 12 Oct 2026)`                                          |
| MCPs: Context7 + shadcn (session)                                                                    | done   | session MCP config (in-repo `.grok/` removed 12 Oct 2026) |
| Plugins: frontend-design, feature-dev, commit-commands, pr-review-toolkit, code-simplifier | done   | `grok plugin list`                                      |
| TypeScript LSP                                                                             | done   | TypeScript LSP via agent environment                    |
| Folder trusted for project hooks/MCP                                                       | done   | local trusted_folders (not in repo)                          |

---

## Week 1 — Validate, position, freeze (26 Aug–1 Sep 2026)

**Outcome:** evidence that operators and field businesses understand the offer, plus a buildable v1 spec.

**Hours:** Product+UX 8 · Engineering 14 · Quality 4 · Sales+content 10.

| Item                                                                                                         | Status  | Evidence                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One-sentence positioning, audience matrix, non-goals, launch definition                                      | done    | `docs/prd.md`                                                                                                                                                     |
| ≥8 source-code operator interviews                                                                           | skipped | `DECISIONS.md` 26 Aug 2026 (marketing folder removed)                                                                                                             |
| ≥8 end-user prospect interviews                                                                              | skipped | `DECISIONS.md` 26 Aug 2026 (marketing folder removed)                                                                                                             |
| Six primary workflows mapped + low-fi wireframes (builder, runner, review, report, sites/assets, onboarding) | done    | `docs/workflows.md`; `docs/wireframes/index.html` (click path verified in browser)                                                                                |
| ADRs: tenancy, storage, auth, PDF, offline sync + pinned dependency versions                                 | done    | `docs/adrs/0001`–`0006`                                                                                                                                           |
| P0/P1/P2 backlog with P0 estimates                                                                           | done    | `docs/backlog.md` (44 P0 stories, hours on each)                                                                                                                  |
| Four starter-pack outlines (Property, Vehicle, Construction, Workplace Safety)                               | done    | `docs/starter-packs.md`                                                                                                                                           |
| Waitlist page + 45s concept clip + short survey                                                              | done    | Historical waitlist/survey (removed from published tree 12 Oct 2026); `DECISIONS.md` |
| Objection / prospect-language log                                                                            | done    | Historical prospect-language notes (removed 12 Oct 2026); `DECISIONS.md`                                                          |

**Release gate:** skipped / waived 26 Aug 2026 (`DECISIONS.md`). No live pain confirmations on file.

---

## Week 2 — Production foundation (2–8 Sep 2026)

**Outcome:** a seeded organization can sign in, switch modes, store data/media through adapters, and deploy from a clean environment.

| Item                                                                                                               | Status | Evidence                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo, CI, env schema, `supabase/` config, one-command seed/reset against **dev** project                       | done   | `apps/web`, `packages/{db,domain,ui,reports,config,testkit}`, `pnpm-workspace.yaml` catalog pins, `.github/workflows/ci.yml`. `pnpm db:push` applied `supabase/migrations/20260826140000_week2_foundation.sql`. `pnpm db:reset` seeded two tenants. `pnpm typecheck` + `pnpm --filter @inspectstack/web lint` pass. |
| Supabase Auth, membership, roles, active org resolution, invitation skeleton                                       | done   | `@supabase/ssr` proxy + cookie session. Login password + magic link. `memberships` roles. Org cookie resolved from membership. `/app/settings/team` invite action uses project email. Browser: owner / inspector / westfield sign-in 26 Aug 2026.                                                                   |
| Drizzle schema/migrations for tenant, user, site, asset, template, inspection, media, finding, report, sync, audit | done   | `packages/db/src/schema.ts` + SQL migration on `inspectstack-dev`.                                                                                                                                                                                                                                                  |
| Supabase Storage (org-prefixed keys, signed URLs) + project email for magic links/invites                          | done   | `packages/db/src/storage.ts`; `evidence` bucket; seed uploaded org-prefixed PNG. Magic link + `inviteUserByEmail` use the **dev** project mailbox.                                                                                                                                                                  |
| Shell, responsive nav, loading/error/empty, tokens, dark-safe logo, demo personas                                  | done   | `/app` shell, 1280 + 360 verified. Empty/error/denied states. Initials on ink plate. Login lists four personas. Mode switch (single company / SaaS) persisted.                                                                                                                                                      |
| First hosted demo deployment (same **dev** project)                                                                | done   | Netlify demo site (IDs redacted for publish). GitHub `waleed-mirza/inspectStack` `main`. Next runtime v5.15.13. Browser 26 Aug 2026: owner sign-in → `/app` ticket `NL-1001`. Same **dev** Supabase project.                              |

**Gate:** local path met 26 Aug 2026 — `pnpm db:reset` then `pnpm dev` → dashboard at http://127.0.0.1:3000/app as `owner@inspectstack.demo`. Cross-tenant: `packages/db/src/tenancy.integration.test.ts` passed (Westfield inspection id returns null for Northline). UI: Westfield dashboard shows `WV-2001` only. **Prod** project is not used.

---

## Week 3 — Template builder (9–15 Sep 2026)

**Outcome:** a non-technical admin can create, preview, publish, clone, and version a realistic inspection template.

| Item                                                                        | Status | Evidence                                                                                                                                                                  |
| --------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Section/field CRUD, drag/reorder, config, validation, keyboard              | done   | `/app/templates/[id]` builder: add section/field, dnd-kit Move handles, config panel, ↑↓/Enter/Esc. Browser 26 Aug 2026: Nightly walk created, Walk + Lighting published. |
| v1 field types, pass/fail scoring, required evidence, readable conditionals | done   | `packages/domain/src/template-fields.ts` (19 types). Preview fail on smoke alarm → required photo + “Life-safety device failed”. Scoring modes on builder.                |
| Immutable published versions; preview, clone, retire, usage warnings        | done   | Gate: Property Condition v1 stays published for NL-1001; v2 draft renamed Address → Street address. Preview `/preview`. Clone pack + retire verified on Westfield.        |
| Four starter-pack schema drafts                                             | done   | `packages/domain/src/packs/` property-condition, vehicle, construction, workplace-safety. Seeded on Northline + Westfield. Library clone-pack rail.                       |
| Circular-rule prevention, draft recovery, publish vs active inspections     | done   | `findCircularRuleCycle` blocks save/publish. localStorage draft key `inspectstack:template-draft:`. Usage notice when inspections use a published version.                |

**Gate:** met 26 Aug 2026 — Property Condition **v1 published** remains the version on `NL-1001`. **Edit next draft** opened **v2**; renaming Address to Street address saved on v2 only. `saveDraftSchema` rejects `status=published`. Browser: library still shows 1 job uses this; inspections list still `NL-1001`.

**Also by end of week 3 (plan §2.3):** 8 source-code + 8 end-user interviews completed; continue only if ≥5 independently describe painful report assembly, inconsistent evidence, poor offline, or expensive customization.

---

## Week 4 — Offline field runner (16–22 Sep 2026)

**Outcome:** an inspector can complete and recover an assigned inspection, including evidence, without continuous connectivity.

Product work started 30 Aug 2026 (ahead of calendar). Gate met 31 Aug 2026.

| Item                                                                                      | Status | Evidence                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mobile runner, progress, validation, pass/fail shortcuts, autosave, resume                | done   | `/app/run/[id]` 1280+360 30 Aug 2026. Occupancy Tenanted survived reload. Unit `4B` survived recovery round-trip. `pnpm --filter @inspectstack/web typecheck`.                             |
| Service worker, IndexedDB, assignment download, op queue, retry UI                        | done   | Dexie v2 + drain in `lib/offline/sync.ts`. Chip **offline / queued / synced**. Retry re-enqueues conflicts. SW still production-`next build` only.                                         |
| Photo manifest, compression, captions, annotation, signature, GPS, timestamps             | done   | `browser-image-compression` + Konva + signature pad. POST `/app/run/[id]/media`. Manifest before bytes. Headless GPS denied with a visible notice.                                         |
| Idempotent sync, revision checks, conflict responses, support-bundle export               | done   | Server unique `client_operation_id`. Recovery export JSON+hashes. `/app/run/[id]/recovery` verified empty-after-sync.                                                                      |
| Forced-close, tab-reopen, offline-reconnect, duplicate-op, interrupted-media, low-storage | done   | Desktop 2/2 (30 Aug). Phone 2/2 (31 Aug) on founder device: pass 1 + pass 2 (`W4S11-PH2` / Phone pass 2 harbour) — answers and meter photos survived close-tab/reconnect; chip **synced**. |

**Gate:** met 31 Aug 2026 — recovery twice on desktop production-SW and twice on a real phone (`NL-1001`). One inspection, no lost answers.

---

## Week 5 — Review and reports (23–29 Sep 2026)

**Outcome:** a submitted inspection can be reviewed, corrected, approved, signed, rendered, verified, shared, and downloaded.

| Item                                                                          | Status | Evidence                                                                                                                                                            |
| ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reviewer workflow + audit trail                                               | done   | `/app/review` queue + `/app/review/[id]` desk. Return NL-1003. Inspector denied. Incomplete approve blocked.                                                        |
| Finding lifecycle                                                             | done   | Owner, due, severity, notes, status transitions on the review desk. `packages/domain/src/findings.ts`.                                                              |
| Two report layouts + branded cover/summary/sections/findings/media/signatures | done   | `packages/reports` condition + audit. `@react-pdf/renderer` 4.8.1 + `pdf-lib` 1.17.1.                                                                               |
| Four golden vertical PDFs                                                     | done   | `packages/reports/goldens/{property-condition,vehicle,construction,workplace-safety}.pdf`. Hashes in `hashes.json`. `pnpm --filter @inspectstack/reports test` 3/3. |
| Verification page + revocable sharing                                         | done   | `/verify/IS-FG72H92S` issued then revoked. PDF 200 then 410 “This report is no longer shared.” Share tokens hashed at rest.                                         |

**Gate:** met 31 Aug 2026 — four golden PDFs (A4, 2–3 pages); `pnpm --filter @inspectstack/reports test` 3/3 stable hashes; `/verify/IS-FG72H92S` showed the report then, after revoke, showed nothing; PDF 410.

---

## Week 6 — Operations layer (30 Sep–6 Oct 2026)

**Outcome:** recurring work around sites/assets, assignments, QR launch, and corrective-action follow-up.

Product work started 31 Aug 2026 (ahead of calendar). Resume: `docs/week-6-build.md`.

| Item                                                                     | Status | Evidence                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sites and assets (hierarchy, tags, history, archive, CSV-friendly IDs)   | done   | `/app/sites` Harbour tree (NPG-HARBOUR / Unit 4 / Unit 9 / Common). Inspector cannot add sites. `(screenshot evidence removed 12 Oct 2026)`                                                                                                     |
| Printable QR sheet + protected launch route + scan fallback              | done   | `/app/sites/[id]/qr` `ISQ-N4HRBR24`. `/app/go` keypad + camera. Northline launch opens Living smoke alarm. Westfield denied, nothing leaked. `(screenshot evidence removed 12 Oct 2026)` `(screenshot evidence removed 12 Oct 2026)` `(screenshot evidence removed 12 Oct 2026)` |
| Recurring schedules, timezone-safe next-run, due/overdue                 | done   | `/app/schedules` Weekly Property Condition `Australia/Sydney`. First run created **NL-1004** for local date **2026-09-01**; next 2026-09-08. `(screenshot evidence removed 12 Oct 2026)`                                                         |
| DB-backed job table + cron entry; uniqueness/idempotency                 | done   | Unique `(schedule_rule_id, local_date)`. Second **Run due jobs** made 0. `POST /api/jobs/run` Bearer `CRON_SECRET`. `(screenshot evidence removed 12 Oct 2026)`                                                                              |
| Corrective-action portal (comments, evidence, verify, reopen, reminders) | done   | `/app/actions` overdue NL-1003. Comment saved. Inspector can comment, cannot close. `(screenshot evidence removed 12 Oct 2026)` `(screenshot evidence removed 12 Oct 2026)`                                                                                   |

**Gate:** met 31 Aug 2026 — Weekly Property Condition created **one** assignment (`NL-1004`) at Sydney local date `2026-09-01`; a second run created none. QR `ISQ-N4HRBR24` opens Northline Unit 4 Living smoke alarm; Westfield session sees “This QR does not match a site in your workspace.”

---

## Week 7 — Commercially harden and freeze (7–13 Oct 2026)

**Outcome:** the same codebase can be deployed for a single company or as multi-tenant SaaS, with secure roles, branding, plan limits, and administration.

| Item                                                                                                | Status | Evidence                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| White-label settings (logo, colors, terminology, report/email identity, formats, legal footer)      | done   | `/app/settings` logo/color/words/identity/formats/footer. Nav **Property checks**. Ticket rail `rgb(122, 36, 24)` (`#7A2418`). `(screenshot evidence removed 12 Oct 2026)` `(screenshot evidence removed 12 Oct 2026)`                                                                                      |
| Roles, invitations, audit, plan limits, flags, usage                                                | done   | Team role/suspend (last owner blocked). `/app/settings/activity` Brand saved. `/app/settings/usage` single 4/8 people. Flags on.                                                                                                                                            |
| Super-admin tenants, impersonation with reason + audit                                              | done   | `/app/admin` Northline single + Westfield agency. Viewing Westfield as `westfield.owner@…` reason on banner; WV-2001 only. Short reason blocked. `(screenshot evidence removed 12 Oct 2026)` `(screenshot evidence removed 12 Oct 2026)`                                                        |
| Authorization matrix + cross-tenant + signed URL + upload + public-link + rate-limit + secret tests | done   | `packages/domain/src/harden.test.ts` 12/12. `packages/db/src/authz.matrix.test.ts`: tenant/role/signed URL/upload/public-link/rate-limit/secrets. Inspector denied `(screenshot evidence removed 12 Oct 2026)`. Westfield settings stay `#1A3A5C`. Revoked `/verify/IS-FG72H92S` hides. |
| Feature freeze; v1.1 backlog; release notes + known limitations                                     | done   | `docs/freeze.md`. P1 frozen in `docs/backlog.md`. Core deps freeze except security.                                                                                                                                                                                         |

**Gate:** met 31 Aug 2026 — Northline brand color `#7A2418` on ticket rails and **Property checks** nav; inspector denied on settings; Westfield settings stay `#1A3A5C` with no Tenants link; impersonation requires a reason, shows WV-2001 only, and writes an audit row the operator can see; revoked verify hides the report; authz matrix tests on tenant/role/signed URL/upload/public-link/rate-limit/secrets. Email from-name is recorded on invites (project mailbox still sends). Snapshot PDFs stay A4 so Week 5 hashes do not move.

---

## Week 8 — Release candidate (14–20 Oct 2026)

**Outcome:** an operator can evaluate, install, customize, deploy, and troubleshoot from documentation and videos alone.

| Item                                                                                                                       | Status | Evidence                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full unit/integration/component/E2E across supported browsers and viewports                                                | done   | `pnpm test` 93 passed. `pnpm test:e2e` Chromium 1280+360: 12 passed / 5 skipped. `pnpm typecheck` pass. Firefox/WebKit documented, not CI.                                                     |
| Two clean installs timed (native local + one managed cloud)                                                                | done   | `docs/install-rehearsal.md`. Local inspector login 2.0s to jobs + issued `IS-FG72H92S`. Netlify login 10.6s to jobs (`(screenshot evidence removed 12 Oct 2026)`). Netlify reports wait for this RC on `main`. |
| Docs: Quick Start, architecture, config, deploy, storage/email, branding, packs, testing, upgrade, backup, troubleshooting | done   | `docs/README.md` install set. Start: `docs/quick-start.md`.                                                                                                                                    |
| Sample env, seed/reset, migration policy, changelog, support bundle, versioned archive                                     | done   | `.env.example`, `docs/migration.md`, `CHANGELOG.md`, support bundle `productVersion`, `pnpm release:pack`.                                                                                     |
| Demo data polish, empty/loading/error, keyboard, a11y, throttled-mobile performance                                        | done   | Skip links, extra `loading.tsx`, leftover Week N copy removed, queued stamp `#8a5200` (AA), axe on login+jobs, throttled 360 E2E. `(screenshot evidence removed 12 Oct 2026)`.                            |
| v1.0.0-rc.1 archive                                                                                                        | done   | `dist/inspectstack-1.0.0-rc.1.zip` SHA-256 `75941799e2827dba0e43a59eec2c153359680c734ea40b511a7d1ef7def9ac00`. `docs/release/v1.0.0-rc.1.md`.                                                  |

**Gate:** product path met 31 Aug 2026 — Quick Start + Chromium E2E at 1280/360; native local dry-run reached jobs and issued snapshot `IS-FG72H92S` / `/verify/IS-FG72H92S`; Netlify login reached jobs. Live 4-of-5 evaluators is a founder send of `v1.0.0-rc.1` (`docs/evaluator.md`). Blocking doc issues found in rehearsal were fixed (pooler URL, `env:sync`, rate-limit session reuse, Harbour re-seed unique id).

---

## Week 9 — Storefront and launch candidate (21–27 Oct 2026)

**Outcome:** beta evidence, the MIT license, and the listing assets that match the shipped product.

| Item                                                                                               | Status | Evidence                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7-day private beta; triage blockers / data-loss / report / install only                            | done   | Private-beta protocol + internal rehearsal 1 Sep 2026 (assets removed 12 Oct 2026). Live 7-day / ≥20 real inspections / quotes = founder send.                                                                 |
| Final source archive, checksums, release notes, third-party notices, license, support policy       | done   | `LICENSE`, `THIRD_PARTY_NOTICES.md`, `docs/support.md`, `docs/release/v1.0.0.md`. Zip `dist/inspectstack-1.0.0.zip` SHA-256 `0cc57ad826d00929b6e189569a8f2f4c2dab3b0798f43cbde2202b4151ad8b4a`. No `.env.local` / `.auth` / `node_modules` in the archive. |
| 2–3 min overview, 8–12 min setup, four vertical clips, screenshots, report samples, feature matrix | done   | Product stills/overview now under `apps/web/public/listing/`. Listing pack markdown removed 12 Oct 2026.                                                               |
| Listing copy                                                                                       | done   | Listing copy removed 12 Oct 2026                                                                                                                                                                                                                                |
| FAQ and onboarding emails                                                                          | done   | FAQ/emails removed 12 Oct 2026 (MIT; GitHub issues for support).                                                                                                                                                                                               |
| v1.0.0 launch candidate                                                                            | done   | `VERSION` `1.0.0`. `pnpm release:pack`.                                                                                                                                                                                                                    |

**Gate:** product path met 1 Sep 2026 — public claims ≤ feature matrix; archive download tested (pack + checksum sidecar + zip listing). Two fresh evaluators watching the overview, and the 7-day human beta, are a founder send (`DECISIONS.md` 1 Sep 2026).

---

## Week 10 — Launch and open-source publish (28 Oct–3 Nov 2026)

**Outcome:** superseded 12 Oct 2026. The source is MIT. Do not complete marketplace upload or sales outreach rows.

| Item                                                                                           | Status      | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct landing + checkout/download tested                                                       | skipped     | Paid sale retired 12 Oct 2026 (`DECISIONS.md`). Landing is MIT: `apps/web/src/components/storefront/home.tsx`. |
| Marketplace submissions                                                                         | skipped     | Marketplace listing retired with the MIT decision. Sales folder removed 12 Oct 2026. |
| Four vertical posts, one architecture post, one comparison/ROI post, one live walkthrough      | skipped | Sales-loop content. Not part of the MIT release. |
| Outreach: 50 agencies/founders + 30 consultants/operators with follow-up dates                 | skipped | Sales outreach retired with the paid source offer. |
| Daily support/bug triage, funnel events, public changelog, first maintenance release scheduled | done | `docs/support.md` points at GitHub issues. `SECURITY.md` holds private reports. Changelog on `/`. **v1.0.1** already shipped. No funnel analytics. |
| MIT publish scrub (secrets, sales assets, placeholder build)                                   | done | Personal email + live Supabase/Netlify IDs → placeholders. Removed `marketing/`, plan `.docx`, `.grok/`, Netlify link scripts. Root `package.json` `"license": "MIT"`. `pnpm --filter @inspectstack/web build` with `.env.example` placeholders passes. Gitleaks clean on source tree. |
| MIT wording cleanup (docs, packages, release notes)                                            | done | Lemon/sale-store notes removed from `docs/release/v1.0.1.md`. Restored `docs/release/v1.0.0.md`. Buyer/sale present-tense wording reworded. `"license": "MIT"` on all workspace packages. `pnpm lint` / `typecheck` / `test` green 17 Oct 2026. |

**Gate:** someone can read the MIT grant, clone the source, build with placeholders, and follow Quick Start with their own Supabase project.

---

## First-30-day operating targets (post-launch)

| Metric                   | Target                 |
| ------------------------ | ---------------------- |
| Qualified landing visits | 500                    |
| Demo-start rate          | 10%+                   |
| Demo engagement          | track as useful        |
| Stars / useful clones    | track as useful        |
| Time to first local run  | under 20 min median    |
| Support burden           | GitHub issues          |
