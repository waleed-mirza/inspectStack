# Week 8 build plan — release candidate

Resume contract for sessions that may stop at a usage-quota reset. **Do not skip ahead.** Finish the current step, mark it `done` here and in `PROGRESS.md`, then start the next step.

**Stories:** P0-36–P0-40 + `v1.0.0-rc.1` archive. **Gate:** a buyer can clone, configure, seed, deploy, and generate a branded report from documentation alone. Live 4-of-5 human evaluators is a founder send of this RC (see `docs/evaluator.md`); product week records a timed install + an internal dry-run.

Never-cut: offline integrity, tenant isolation, installability, report quality.

---

## Resume here

| Field                    | Value                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Date                     | 31 Aug 2026                                                                           |
| Current step             | **W8-S7** — browser gate and close                                                    |
| Status                   | `done`                                                                                |
| Last finished            | W8-S0–S7: tests, docs, polish, two timed profiles, `v1.0.0-rc.1` archive              |
| Next step                | Week 9 only when asked. Do not start beta storefront or **prod** project.             |
| Do not start             | Week 9 beta/storefront, **prod** Supabase project, paid APIs, v1.1, in-app billing    |
| Prompt for a new session | `Read PROGRESS.md. Week 8 is done. Do not start Week 9 until asked. No prod project.` |

When a step is done, move **Current step** to the next id, set that row to `done`, and leave evidence paths.

---

## Scope lock

In: full test matrix (unit / integration / component / E2E at 1280 and 360); two timed clean installs (native local + one managed cloud); docs (Quick Start, architecture, config, deploy, storage/email, branding, packs, testing, upgrade, backup, troubleshooting); sample env, seed/reset, migration policy, changelog, support bundle, versioned RC archive; demo polish (empty/loading/error, keyboard, a11y, throttled-mobile); evaluator kit.

Out: Week 9 videos/listings/license lawyer review, **prod** Supabase project, Docker Compose (founder decision 26 Aug 2026), paid APIs, in-app billing, custom domains, CSV import, extra report layouts, SMS, maps, interviews, core dependency upgrades except security.

Install already-pinned test packages from ADR 0006: `@playwright/test` 1.62.1, `@testing-library/react` 16.3.2, `axe-core` 4.13.0. No product runtime packages.

Two install profiles (plan said Docker-local; this repo does not use Docker):

1. **Native local** — Node 24 LTS + pnpm + linked **dev** Supabase project.
2. **Managed cloud** — Netlify + the same **dev** Supabase project. Docs also describe Vercel as the second managed host.

UI language: jobs / tickets / reports / workspace / brand. Never JWT, RLS, or bucket in buyer-facing copy.

Demo beat to protect: clone → env → seed → sign in as owner → Jobs shows NL tickets → Reports shows an issued snapshot → public verify page.

If the week overruns, cut extra browser projects (Firefox/WebKit stay documented, Chromium is the CI/local evidence), never the Quick Start, never the two timed installs, never the archive checksum.

---

## Architecture (do not reopen)

- Identity = Supabase Auth; authorization = membership in `packages/db`.
- Storage = org-prefixed keys in the evidence bucket; signed URLs after ownership check.
- Offline = Dexie + operation queue; production SW from `next build --webpack`.
- Reports = immutable snapshots; goldens stay A4.
- Jobs = `POST /api/jobs/run` with `CRON_SECRET`.
- Super-admin = `users.is_platform_admin`; impersonation needs a written reason.

---

## Steps

Status vocabulary: `not started` · `in progress` · `done` · `blocked`.

### W8-S0 — Plan and start decision

|          |                                                                       |
| -------- | --------------------------------------------------------------------- |
| Status   | `done`                                                                |
| Evidence | this file; `DECISIONS.md` 31 Aug 2026; `PROGRESS.md` current week = 8 |

### W8-S1 — Test matrix

|          |                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status   | `done`                                                                                                                                            |
| Stories  | P0-36                                                                                                                                             |
| Files    | `apps/web/e2e/*`, `apps/web/playwright.config.mjs`, `packages/ui` component tests                                                                 |
| Evidence | `pnpm test` 93 passed (60 domain + 28 db + 3 goldens + 2 ui). `pnpm test:e2e` 12 passed / 5 skipped (Chromium 1280 + 360). `pnpm typecheck` pass. |

### W8-S2 — Sample env, seed/reset, migration policy, changelog, support bundle

|         |                                                                                               |
| ------- | --------------------------------------------------------------------------------------------- |
| Status  | `done`                                                                                        |
| Stories | P0-39                                                                                         |
| Files   | `.env.example`, `CHANGELOG.md`, `docs/migration.md`, `VERSION`, support bundle productVersion |

### W8-S3 — Buyer documentation

|         |                                                                             |
| ------- | --------------------------------------------------------------------------- |
| Status  | `done`                                                                      |
| Stories | P0-38                                                                       |
| Files   | `docs/quick-start.md` and the rest of the buyer set; `docs/README.md` index |

### W8-S4 — Demo polish

|         |                                                                                                            |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| Status  | `done`                                                                                                     |
| Stories | P0-40                                                                                                      |
| Files   | leftover Week N copy, missing `loading.tsx`, skip-link on public pages, queued stamp `#8a5200`, axe in E2E |

### W8-S5 — Two timed clean installs + evaluator dry-run

|          |                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------- |
| Status   | `done`                                                                                         |
| Stories  | P0-37                                                                                          |
| Files    | `docs/install-rehearsal.md`, `docs/evaluator.md`                                               |
| Evidence | Native local login 2.0s to jobs + issued report. Netlify login 10.6s to jobs. |

### W8-S6 — v1.0.0-rc.1 archive

|          |                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Status   | `done`                                                                                                                                     |
| Files    | `scripts/pack-release.mjs`, `VERSION`, `docs/release/v1.0.0-rc.1.md`                                                                       |
| Evidence | `dist/inspectstack-1.0.0-rc.1.zip` SHA-256 `75941799e2827dba0e43a59eec2c153359680c734ea40b511a7d1ef7def9ac00` (352 files, no `.env.local`) |

### W8-S7 — Browser gate and close

|          |                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| Status   | `done`                                                                                                                |
| Evidence | Local reports + verify + Netlify jobs (screenshots removed 12 Oct 2026). |
