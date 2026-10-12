# Install rehearsal

Two profiles. Docker-local is not used (founder decision 26 Aug 2026). Times are wall-clock on this founder machine, 31 Aug 2026.

| Profile                 | Target                       | Result                                                                                                              | Wall clock                                                                                                                                                                                                   |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Native local            | < 20 min to jobs list        | **Met**                                                                                                             | Existing clone + env: `pnpm install` 9.6s, `pnpm typecheck` 11.3s, `pnpm test` 42s, `pnpm dev` already up, inspector login 2.0s to `/app` jobs (`NL-1001`…`NL-1004`). Reports issued snapshot `IS-FG72H92S`. |
| Managed cloud (Netlify) | reach seeded demo + a report | **Login/jobs met.** Reports on this host wait for the RC deploy (current Netlify build is older than local Week 8). | Open the hosted Netlify demo `/login` → inspector sign-in 10.6s to `/app`; jobs list visible.                                                                          |

Hidden assumptions removed as they appeared:

- Next env file is `apps/web/.env.local` (`pnpm env:sync`).
- Database URL is the session pooler, not `db.<ref>.supabase.co`.
- `SEED_PASSWORD` is the password **value**, not the word `SEED_PASSWORD`.
- Service worker only after production `next build --webpack`.
- Auth rate limit is 8 password tries / 15 min / email+IP — E2E reuses one session.
- `pnpm db:seed` without `--reset` used to fail on Harbour `external_id`; seed now skips the rename when `NPG-HARBOUR-4` already exists.
- Hosted Netlify is auto-deploy from GitHub `main`. This RC is not on `main` until pushed; local is the evaluator source of truth for reports.

A from-zero clone (new machine, new Supabase project, `db:push`, `db:reset`) was not re-run this session. The linked **dev** project and `.env.local` already exist. Quick Start is the install path for that from-zero case.

## Native local evidence

- Playwright Chromium 1280 + 360: 12 passed, 5 skipped (project filters).
- Browser dry-run: local reports + verify (screenshots removed from tree 12 Oct 2026).

## Managed cloud evidence

- Hosted Netlify jobs list — inspector, Northline tickets.
- After this RC is on `main`, re-time Reports + `/verify/<code>` on Netlify.
