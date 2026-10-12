# Quick Start

Target: a seeded demo in under 20 minutes. This is the native local profile (Node + a Supabase project). There is no Docker path in this repository.

## Prerequisites

- Node.js 24 LTS (`node -v` starts with `v24`)
- pnpm 10.34.5 (`corepack enable` then `corepack prepare pnpm@10.34.5 --activate`)
- A Supabase project you control (Auth + Postgres + Storage)
- `npx supabase` 2.115.0 for `link` / `db push`

## Install

```bash
git clone <this-repo>
cd InspectStack
copy .env.example .env.local   # Windows
# cp .env.example .env.local  # macOS / Linux
```

Fill `.env.local` from the project:

```bash
npx supabase projects api-keys --project-ref <ref> --reveal
npx supabase link --project-ref <ref>
```

Use the **session pooler** `DATABASE_URL` from `.env.example`. Direct `db.<ref>.supabase.co` is IPv6-only on some networks.

```bash
pnpm install
pnpm db:push
pnpm db:reset
pnpm env:sync
pnpm dev
```

`pnpm env:sync` copies `.env.local` into `apps/web/.env.local`. Next.js does not load the repo-root file. `pnpm dev` runs that copy first.

Open http://127.0.0.1:3000/login

| Persona                         | Email                               | Password        |
| ------------------------------- | ----------------------------------- | --------------- |
| Owner (Northline)               | `owner@inspectstack.demo`           | `SEED_PASSWORD` |
| Inspector                       | `inspector@inspectstack.demo`       | same            |
| Reviewer                        | `reviewer@inspectstack.demo`        | same            |
| Client viewer                   | `client@inspectstack.demo`          | same            |
| Westfield owner (second tenant) | `westfield.owner@inspectstack.demo` | same            |

Set `SEED_PASSWORD` in `.env.local` (see `.env.example`). Use that same value to sign in as the demo personas.

## First report

1. Sign in as the Northline owner.
2. Jobs lists seeded tickets (`NL-1001` in field, `NL-1002` already issued, `NL-1003` in review).
3. Open **Reports** and open the issued snapshot.
4. Copy the verification code (stamp `IS-…`) and open `/verify/<code>` in a private window.

To run an inspection yourself: open `NL-1001` → field runner → fail the living smoke alarm → attach a photo → submit. Reviewer approves from **Review**. That issues a new snapshot.

## Reset

`pnpm db:reset` wipes demo rows for the two seed tenants, recreates personas, and leaves other Auth users alone. It is safe to repeat.

## Next

- [Configuration](configuration.md)
- [Deploy](deploy.md)
- [Branding](branding.md)
- [Troubleshooting](troubleshooting.md)
