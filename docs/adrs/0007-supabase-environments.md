# ADR 0007 — Supabase as the development and launch platform

- Status: accepted
- Date: 2026-08-26
- Week: 1 (stack amendment before Week 2)
- Amends: ADR 0002 (storage), ADR 0003 (auth), ADR 0006 (pins)

## Context

The founder will develop against Supabase (CLI already used; `npx supabase` in this environment). A **second** Supabase project is used when the product is finalized. Native Postgres, Mailpit, filesystem storage, and Docker Compose are not the Week 2 path. `supabase start` needs Docker, which is not on this machine — local containers are out.

Operators cloning the source still get a real Postgres app. The default documented path is “create two Supabase projects (dev / prod).” Repository tenancy remains mandatory; RLS is defense in depth, never the only check.

## Decision

### Two projects, never mixed

Keep **dev** and **prod** as separate Supabase projects. Do not mix seed data with launch traffic.

| Alias | Project | When | What lives there |
| ----- | ------- | ---- | ---------------- |
| **dev** | `YOUR_DEV_PROJECT_NAME` (`YOUR_DEV_PROJECT_REF`, region of your choice) | Daily `pnpm dev`, seed, CI | Schema, storage buckets, Auth users, demo personas |
| **prod** | create only at finalize | After freeze / launch | Separate project ref, separate keys, migrated schema |

CLI workflow: `supabase/` in the repo (config + migrations). Link with `npx supabase link --project-ref YOUR_DEV_PROJECT_REF` while building. Link **prod** only when promoting. Service-role keys stay in `.env.local` / host secrets — never in git.

Do **not** use `supabase start` unless a later row brings Docker back.

### Auth

**Supabase Auth** replaces Auth.js for identity (email + password, magic link, optional OAuth flags).

Authorization stays ours: `membership` rows with `owner | admin | template_manager | inspector | reviewer | client_viewer`. Resolve the active organization from membership, never from the browser’s project URL or a body `organizationId` alone.

Server uses the service role only in trusted route handlers / repositories. The anon key is public. Impersonation still requires a reason + audit event.

### Data

PostgreSQL is the Supabase project database. **Drizzle** remains the typed schema/query layer so tenant filters stay in `packages/db`. Supabase SQL migrations may be generated from Drizzle or applied via CLI; one pipeline, not two competing schemas.

### Storage

Default driver: **Supabase Storage**. Keys still `{organizationId}/{inspectionId}/{mediaId}/{random}.{ext}`. No public evidence buckets. Signed URLs after ownership check.

### Email

Magic links and invites use the Supabase project’s email settings (dev project → confirm mailbox; prod → custom SMTP when we have it). Mailpit is not required.

## Consequences

- Week 2 gate: clone + env from the **dev** project + seed → dashboard. A cloud account **is** required for this workflow.
- Docs: “needs a Supabase project” for the happy path. Portable S3/SMTP/self-host Postgres stays possible later via adapters; it is not Week 2 work.
- Cross-tenant tests still run in repositories. Add RLS policies as extra guards, not as a substitute.
- Prod keys and the prod project ref appear only at promote time.

## Alternatives rejected

- Native Postgres + Mailpit + filesystem (ADR path before this row): founder chose Supabase CLI + two projects.
- `supabase start` / local Docker stack: Docker is not available; prior no-Compose decision stands.
- Auth.js on top of Supabase Postgres: extra session stack while Auth is already in the project. Identity = Supabase Auth; roles = our membership.
- One project for both dev and prod: seed data and test users would contaminate launch.
