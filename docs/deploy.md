# Deploy

Two verified profiles: native local, and managed cloud on Netlify. Vercel is documented as an equivalent Next host. There is no Docker Compose profile in this repository.

## Native local

Follow [Quick Start](quick-start.md). Production-like PWA (service worker) needs:

```bash
pnpm --filter @inspectstack/web build
pnpm --filter @inspectstack/web start
```

`next build --webpack` is required. Turbopack production build does not inject `/sw.js`.

Placeholder values from `.env.example` are enough for the production **build** to succeed (authenticated `/app` routes use dynamic rendering). Sign-in, sync, and PDF still need a real Supabase project.

## Managed cloud — Netlify

1. Create a Supabase project. Apply `supabase/migrations` (`npx supabase db push`) and `pnpm db:reset` against that project.
2. Create a Netlify site from the repo. Base is the repo root. Build command and publish directory come from `netlify.toml`.
3. Set environment variables from [configuration.md](configuration.md). `NEXT_PUBLIC_APP_URL` must be the Netlify URL (`https://<site>.netlify.app`).
4. In Supabase Auth, add `https://<site>.netlify.app/auth/callback` to the redirect allow-list.
5. Optional: Netlify scheduled function or an external cron `POST https://<site>.netlify.app/api/jobs/run` with `Authorization: Bearer <CRON_SECRET>`.

Timed rehearsal notes: [install-rehearsal.md](install-rehearsal.md).

## Managed cloud — Vercel

`apps/web/vercel.json` marks the Next framework. Import the monorepo, set the same env vars, Root Directory empty (repo root), build `pnpm --filter @inspectstack/web build`. Add the Vercel URL to the Auth allow-list.

## What not to do

- Do not mix seed/demo data into a production Supabase project (ADR 0007).
- Do not commit `.env.local`.
- Do not run `supabase start` (needs Docker; not this product’s local path).
