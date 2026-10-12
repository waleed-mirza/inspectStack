# Troubleshooting

Fix the product or this file. Do not leave blocking confusion only in chat.

## Install

| Symptom                                          | Likely cause                               | What to do                                                                                                           |
| ------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `ZodError` on `NEXT_PUBLIC_SUPABASE_URL`         | Next did not see env                       | Run `pnpm env:sync`. Confirm `apps/web/.env.local` exists.                                                           |
| `ENOTFOUND db.<ref>.supabase.co`                 | IPv6-only direct host                      | Use the session pooler URL from `.env.example`.                                                                      |
| `pnpm db:push` 403                               | CLI login role                             | Apply SQL with the documented week migrate scripts, or repair CLI access. Files still live in `supabase/migrations`. |
| Seed fails on `@inspectstack/domain`             | Node strip-types                           | Use `pnpm db:seed` / `db:reset` (tsx), not raw `node`.                                                               |
| Magic link invalid                               | Redirect allow-list                        | Add `http://127.0.0.1:3000/auth/callback` and the hosted origin.                                                     |
| Sign-in “Email or password did not match”        | Wrong persona or password                  | Use a demo email and `SEED_PASSWORD`, not the literal text `SEED_PASSWORD`.                                          |
| `/app` empty after a personal Google/email login | No membership                              | Onboarding explains this. Sign out and use `owner@inspectstack.demo`.                                                |
| Service worker missing in `next dev`             | Expected                                   | Production `pnpm --filter @inspectstack/web build` injects `/sw.js`.                                                 |
| Westfield sees Northline tickets                 | Should never happen                        | Stop. File a tenant defect with the support bundle. This is a never-cut failure.                                     |
| Verify page “no longer shared”                   | Revoked, expired, unknown, or rate-limited | Same copy on purpose. Nothing about the inspection is shown.                                                         |
| `POST /api/jobs/run` 401                         | Missing/mismatched `CRON_SECRET`           | Set a min-8 secret on the server and the Bearer header.                                                              |
| Phone photos fail on HTTP LAN                    | Older builds lacked SHA-256 fallback       | Current code uses Web Crypto or the JS fallback. Confirm you are on this RC.                                         |

## Field runner

Queued / synced / failed live on the ticket chip. Recovery: `/app/run/[id]/recovery` → Retry or Export support bundle. Do not block section navigation because an upload is pending. Submission blocks only on missing required evidence or a permanent fail.

## Docs bugs

If Quick Start step N is wrong, patch Quick Start in the same change that fixes the product. Evaluator notes go in [evaluator.md](evaluator.md).
