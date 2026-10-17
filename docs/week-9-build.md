# Week 9 build plan — storefront package and launch candidate

Resume contract for sessions that may stop at a usage-quota reset. **Do not skip ahead.** Finish the current step, mark it `done` here and in `PROGRESS.md`, then start the next step.

**Stories:** P0-41–P0-44 + `v1.0.0` launch-candidate archive. **Gate:** two fresh evaluators can explain the project after the overview; archive download tested; no public claim exceeds shipped functionality.

Never-cut: offline integrity, tenant isolation, installability, report quality.

---

## Resume here

| Field                    | Value                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| Date                     | 1 Sep 2026                                                                                         |
| Current step             | **W9-S7** — close week                                                                             |
| Status                   | `done`                                                                                             |
| Last finished            | W9-S0–S7: beta protocol, legal pack, listing assets, `v1.0.0` archive                              |
| Next step                | Week 10 in progress (`docs/week-10-build.md`).                                                     |
| Do not start             | Marketplace upload, **prod** project, paid APIs, v1.1, in-app billing                              |
| Prompt for a new session | `Read PROGRESS.md. Week 10 in progress. Source is MIT. No prod project.`                    |

When a step is done, move **Current step** to the next id, set that row to `done`, and leave evidence paths.

---

## Scope lock

In: 7-day private-beta protocol and triage log; launch-candidate archive + checksums + release notes; license, third-party notices, support policy, privacy/terms samples; overview/setup/vertical media; product stills and report samples.

Out: Week 10 marketplace **submissions**, **prod** Supabase project, Docker Compose, paid APIs, in-app billing, custom domains, CSV import, extra report layouts, SMS, maps, interviews, domain purchase, trademark filing, core dependency upgrades except security. Do not invent testimonials or live evaluator quotes.

Human loops that cannot run in this product week (same pattern as Week 8 evaluators):

- Live 7-day private beta with five external people and ≥20 real field inspections.
- Two permissioned testimonials.
- Two fresh evaluators watching the overview.
- Live paid-checkout flows (retired with the paid source offer).

Those remain **founder send**. This week ships the protocol, the assets, an internal rehearsal, and a tested archive download.

If the week overruns, cut extra video polish (keep the overview + four still sequences), never the license/notices, never the listing honesty rule, never the archive checksum.

UI language: jobs / tickets / reports / workspace / brand. Never JWT, RLS, or bucket in operator-facing copy.

---

## Architecture (do not reopen)

- Identity = Supabase Auth; authorization = membership in `packages/db`.
- Storage = org-prefixed keys in the evidence bucket; signed URLs after ownership check.
- Offline = Dexie + operation queue; production SW from `next build --webpack`.
- Reports = immutable snapshots; goldens stay A4.
- Jobs = `POST /api/jobs/run` with `CRON_SECRET`.
- Super-admin = `users.is_platform_admin`; impersonation needs a written reason.
- Core deps frozen except security (`docs/freeze.md`).

---

## Steps

Status vocabulary: `not started` · `in progress` · `done` · `blocked`.

### W9-S0 — Plan and start decision

|          |                                                                      |
| -------- | -------------------------------------------------------------------- |
| Status   | `done`                                                               |
| Evidence | this file; `DECISIONS.md` 1 Sep 2026; `PROGRESS.md` current week = 9 |

### W9-S1 — Beta protocol and internal rehearsal

|          |                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status   | `done`                                                                                                                                                                                            |
| Stories  | P0-41                                                                                                                                                                                             |
| Files    | beta protocol/log (removed from published tree 12 Oct 2026)                                                                                                                                             |
| Evidence | Internal dry-run 1 Sep 2026: owner jobs/reports/verify/settings/sites/admin/templates/runner; Westfield WV-2001 only. No blocker/data-loss/report/install class. Live 7-day send remains founder. |

### W9-S2 — License, notices, support, legal samples

|          |                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------- |
| Status   | `done`                                                                                                          |
| Stories  | P0-42 (legal half)                                                                                              |
| Files    | `LICENSE`, `THIRD_PARTY_NOTICES.md`, `docs/support.md`                                      |
| Evidence | Plan modes (single/agency/saas); runtime+font notices; support via GitHub issues; sample privacy/terms labeled as samples. |

### W9-S3 — Screenshots, report samples, feature matrix

|          |                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------- |
| Status   | `done`                                                                                                |
| Stories  | P0-43 stills                                                                                          |
| Files    | `apps/web/public/listing/` (stills); report samples removed from sales folder 12 Oct 2026 |
| Evidence | Ten frames from the live app + verify/Westfield extras; four golden PDFs; matrix claims ≤ shipped.    |

### W9-S4 — Overview, setup, and vertical clips

|          |                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Status   | `done`                                                                                                                                                 |
| Stories  | P0-43 motion                                                                                                                                           |
| Files    | video scripts/recordings (sales folder removed 12 Oct 2026)                                                                                                                                    |
| Evidence | `overview.webm` jobs→verify; `vertical-property.webm` 360 runner; setup chaptered to Quick Start; other verticals = goldens + pack still until filmed. |

### W9-S5 — Listing copy, FAQ, emails

|          |                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Status   | `done`                                                                                                                   |
| Stories  | P0-44                                                                                                                    |
| Files    | listing/email pack removed 12 Oct 2026                                                                      |
| Evidence | Listing copy and FAQ match the no-Docker v1.                                                                            |

### W9-S6 — v1.0.0 launch-candidate archive

|          |                                                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| Status   | `done`                                                                                                               |
| Stories  | P0-42 archive                                                                                                        |
| Files    | `VERSION`, `CHANGELOG.md`, `docs/release/v1.0.0.md`, `dist/inspectstack-1.0.0.zip`                                   |
| Evidence | `pnpm release:pack` 397 files; zip lists LICENSE/support/`docs/release`; no `.env.local` / `.auth` / `node_modules`. |

### W9-S7 — Close week

|          |                                                                              |
| -------- | ---------------------------------------------------------------------------- |
| Status   | `done`                                                                       |
| Evidence | `PROGRESS.md` Week 9 done; MEMORY current status; docs index lists the pack. |
