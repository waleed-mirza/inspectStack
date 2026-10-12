# Configuration

Runtime env is validated by `packages/config`. Next.js reads `apps/web/.env.local`. Keep the source of truth at the repo root `.env.local` and run `pnpm env:sync` (also first step of `pnpm dev`).

## Required

| Variable                        | Where  | Purpose                                                  |
| ------------------------------- | ------ | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | public | Project URL                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Auth client                                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | server | Auth admin, storage signing, seed. Never `NEXT_PUBLIC_`. |
| `DATABASE_URL`                  | server | Postgres (session pooler recommended)                    |

## Recommended

| Variable               | Purpose                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`  | Magic-link / invite redirect origin. Default `http://127.0.0.1:3000`. Hosted demo must include this origin in the Supabase Auth allow-list. |
| `SEED_PASSWORD`        | Password for seeded personas. Min 8 characters.                                                                                             |
| `CRON_SECRET`          | Bearer token for `POST /api/jobs/run`. Min 8 characters if set. Empty secret rejects all callers.                                           |
| `POSTGRES_PASSWORD`    | Used when rewriting IPv6-only `db.<ref>` hosts to the pooler.                                                                               |
| `SUPABASE_POOLER_HOST` | Optional pooler hostname override.                                                                                                          |

## Hosted demo

Netlify (and Vercel) need the same keys as server secrets, plus the public trio. Do not paste the service role into a `NEXT_PUBLIC_` variable. See [deploy.md](deploy.md).

## What this product does not read

The operating plan listed portable driver names (`STORAGE_DRIVER`, `SMTP_HOST`, `AUTH_SECRET`). v1 uses the linked Supabase project for Auth, Postgres, Storage, and project email. Those portable names are not implemented. Do not add them unless `DECISIONS.md` records a change.
