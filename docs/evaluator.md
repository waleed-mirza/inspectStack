# Evaluator kit

Give this build to people **without live onboarding**. Watch where the docs fail; patch Quick Start or the product, not a private chat.

Plan gate: at least four of five evaluators reach the seeded demo and generate a report without direct help.

## What to send

1. Link to the repo or the zip from `pnpm release:pack`.
2. This file + [quick-start.md](quick-start.md).
3. Optional: your own hosted demo URL (same seeded **dev** project).

## Script (no help)

**Path A — hosted (fastest)**

1. Open the hosted demo. From `/` choose **Try the demo**.
2. Sign in as `owner@inspectstack.demo` with the `SEED_PASSWORD` value from their `.env.local`.
3. Confirm Jobs shows Northline tickets (`NL-…`).
4. Open Reports → issued snapshot.
5. Open `/verify/<code>` in a private window.
6. Sign out. Sign in as `westfield.owner@inspectstack.demo`. Confirm only `WV-…` tickets. No Northline numbers.

**Path B — native local (install gate)**

Follow Quick Start from a clean clone. Time it. Target under 20 minutes to the jobs list.

**Path C — issue a report (full beat)**

As inspector, open an in-progress job, fail a required evidence item, attach a photo, submit. As reviewer, approve. Confirm a new Reports row and a verify page.

## What to collect

Time to first jobs list, where they stalled, whether the report looked client-ready, and whether Westfield isolation held. Do not invent quotes.
