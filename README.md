# InspectStack

White-label field inspection and report builder. Working name — trademark and domain clearance required before public launch.

**Version:** `1.0.1` (`VERSION`). Offline-first Next.js PWA: capture in the field, sync when online, issue branded PDFs.

**License:** [MIT](LICENSE). Copyright 2026 WHH Treasures. The name InspectStack is still a working title; this license does not grant trademark rights.

Contributing: [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md). Docs index: [`docs/README.md`](docs/README.md).

## Quick start

Requires Node.js 24 LTS and pnpm 10.34.5.

1. Clone this repo.
2. Copy `.env.example` to `.env.local` at the repo root.
3. Fill values from a Supabase project (`npx supabase projects api-keys --project-ref <ref> --reveal` plus the database password). Prefer the **session pooler** URL (see `.env.example`); `db.<ref>.supabase.co` is IPv6-only on some networks.
4. Install and apply schema + demo data:

```bash
pnpm install
npx supabase link --project-ref <your-dev-ref>
pnpm db:push
pnpm db:reset
pnpm env:sync
pnpm dev
```

`pnpm env:sync` copies `.env.local` into `apps/web/.env.local` (Next.js does not load the repo-root file). `pnpm dev` runs that copy first.

5. Open http://127.0.0.1:3000/login, sign in as `owner@inspectstack.demo` with `SEED_PASSWORD`.
6. Jobs shows Northline tickets. Reports shows an issued snapshot.

`pnpm db:reset` is idempotent: it wipes demo rows, recreates seed personas, and leaves other Auth users alone.

A fresh clone can run `pnpm --filter @inspectstack/web build` with the placeholder values from `.env.example` (authenticated `/app` routes are dynamic). Runtime features still need real Supabase credentials.

## Environment variables

| Variable | Where | Purpose |
| -------- | ----- | ------- |
| `NEXT_PUBLIC_APP_URL` | Public | App origin for magic-link / invite redirects |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role; never expose to the client |
| `DATABASE_URL` | Server only | Postgres connection (prefer session pooler) |
| `POSTGRES_PASSWORD` | Server / seed | Database password |
| `SEED_PASSWORD` | Seed / local login | Password for seeded demo personas |
| `CRON_SECRET` | Server | Bearer token for `POST /api/jobs/run` |

Copy `.env.example` → `.env.local`, fill real values, then `pnpm env:sync`. See [`docs/configuration.md`](docs/configuration.md).

## Deploy

Two profiles: native local, and managed cloud (Netlify or Vercel). No Docker Compose in this repo. Full guide: [`docs/deploy.md`](docs/deploy.md).

### Supabase

1. Create a **dev** Supabase project.
2. `npx supabase link --project-ref <ref>` then `pnpm db:push` and `pnpm db:reset`.
3. Put API keys and the pooler `DATABASE_URL` in `.env.local`.
4. In Auth → URL configuration, allow `http://127.0.0.1:3000/**` and your deployed origin’s `/auth/callback`.

Create a separate **prod** project only when you are ready to launch; do not mix seed data with production traffic.

### Netlify

`netlify.toml` sets Node 24 and `@netlify/plugin-nextjs`.

1. Create a site from this repo (base = repo root).
2. Set the environment variables above. `NEXT_PUBLIC_APP_URL` must be `https://<your-site>.netlify.app`.
3. Add that origin to the Supabase Auth redirect allow-list.
4. Optional: cron `POST https://<your-site>.netlify.app/api/jobs/run` with `Authorization: Bearer <CRON_SECRET>`.

### Vercel

1. Import the monorepo. Root Directory empty (repo root).
2. Build command: `pnpm --filter @inspectstack/web build` (see `apps/web/vercel.json`).
3. Set the same env vars. Add the Vercel URL to the Auth allow-list.

## Workspace

| Path               | Role                                                        |
| ------------------ | ----------------------------------------------------------- |
| `apps/web`         | Next.js App Router PWA host                                 |
| `packages/db`      | Drizzle schema, tenant-scoped repositories, storage adapter |
| `packages/domain`  | Roles, status machines, branding, storage keys              |
| `packages/ui`      | Tokens, shell primitives, empty/loading/error               |
| `packages/config`  | Env schema                                                  |
| `packages/reports` | PDF package                                                 |
| `packages/testkit` | Cross-tenant fixtures                                       |
| `supabase/`        | Config + SQL migrations                                     |

## Scripts

| Command             | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | Sync env and run the web app                      |
| `pnpm build`        | Production web build                              |
| `pnpm test`         | Unit / integration / component                    |
| `pnpm test:e2e`     | Playwright Chromium 1280 + 360                    |
| `pnpm release:pack` | Zip a release archive without secrets             |

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Keep secrets out of git; match the existing modules and field-ticket UI.

Never-cut: offline integrity, tenant isolation, installability, report quality.
