# Testing

Supported desktop widths **1280px+** (builder/admin). Runner and public report **360px+**.

## Commands

| Command          | What                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` | TypeScript across packages                                                                                                |
| `pnpm lint`      | ESLint on the web app                                                                                                     |
| `pnpm test`      | Vitest: domain unit, db integration (live tests skip without a real `DATABASE_URL`), reports goldens, UI component markup |
| `pnpm test:e2e`  | Playwright Chromium at 1280 and 360 against http://127.0.0.1:3000                                                         |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, and `pnpm test` with a fake database URL so live db suites skip. E2E is local/RC evidence, not GitHub-hosted, because it needs the seeded **dev** project.

## Layers

| Layer          | Where                                                    | Gate                                                               |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| Unit           | `packages/domain` (rules, scoring, ops, harden, version) | critical branches                                                  |
| Integration    | `packages/db` tenancy + authz matrix                     | cross-tenant negatives                                             |
| Component      | `packages/ui` empty/error/denied/busy                    | markup + aria                                                      |
| Visual goldens | `packages/reports` four PDFs                             | stable hashes                                                      |
| E2E            | `apps/web/e2e`                                           | login, jobs, reports, unknown verify, axe, keyboard, throttled 360 |
| Install        | [install-rehearsal.md](install-rehearsal.md)             | two profiles timed                                                 |

## Playwright

Uses the ADR pin `@playwright/test` 1.62.1. First machine:

```bash
pnpm install
pnpm --filter @inspectstack/web exec playwright install chromium
pnpm dev   # in another terminal, or let Playwright start it
pnpm test:e2e
```

`SEED_PASSWORD` is loaded from repo-root `.env.local`. Tests skip if it is missing.

Password logins are rate-limited (8 / 15 min / email+IP). E2E authenticates **once** (`e2e/auth.setup.ts` as `reviewer@inspectstack.demo`) and reuses `e2e/.auth/user.json`. A second password login uses `westfield.owner@inspectstack.demo` on Chromium 1280 only.

Firefox and WebKit are not a CI project. To extend locally: add a Playwright project that spreads `devices['Desktop Firefox']` / `devices['Desktop Safari']`. Chromium 1280 + 360 is the release-candidate evidence.

Axe runs on login and the jobs list. Failures of impact `serious` or `critical` fail the suite.

## Offline recovery

The Week 4 gate is a manual phone/desktop recovery, not a Playwright scenario. See `docs/week-4-build.md`. Do not claim the SW works under `next dev --turbopack`.
