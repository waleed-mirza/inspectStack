# Architecture

InspectStack is a pnpm monorepo. One Next.js App Router host. Tenant isolation lives in repositories, not only in the UI.

## Packages

| Path               | Role                                                              |
| ------------------ | ----------------------------------------------------------------- |
| `apps/web`         | PWA, routes, server actions, offline runner                       |
| `packages/db`      | Drizzle schema, tenant-scoped repositories, storage adapter, seed |
| `packages/domain`  | Roles, branding, plans, template rules, inspection ops, version   |
| `packages/ui`      | Tokens and chrome primitives                                      |
| `packages/reports` | `@react-pdf/renderer` + pdf-lib snapshots and goldens             |
| `packages/config`  | Zod env schema                                                    |
| `packages/testkit` | Demo personas and tenant fixtures                                 |
| `supabase/`        | Linked project config + SQL migrations                            |

## Tenancy

Every tenant-owned table has `organization_id`. The active org is resolved from an authenticated membership. Client-supplied org ids are ignored unless they match that membership. Storage keys are `{organizationId}/…`. Cross-tenant reads return empty, not another tenant’s row.

Two seed tenants prove the boundary: Northline Property Group and Westfield Vehicle Checks.

## Auth

Supabase Auth for identity (password + magic link). Roles live on `memberships`: owner, admin, template_manager, inspector, reviewer, client_viewer. Super-admin is `users.is_platform_admin`, not a membership role. Impersonation requires a written reason and writes an audit event the operator can see.

## Offline

Dexie holds the assignment bundle and an operation queue. Each write has a client operation id. Sync is idempotent. The service worker is injected by `@serwist/next` on `next build --webpack` only. `next dev --turbopack` does not install `/sw.js`.

## Reports

Approval freezes a canonical snapshot. PDFs render from that snapshot. Public `/verify/<code>` and `/share/<token>` resolve the snapshot, then still scope queries. Revoke hides the report with the same copy as an unknown code.

## Jobs

`POST /api/jobs/run` with `Authorization: Bearer CRON_SECRET` creates due schedule assignments. Uniqueness is `(schedule_rule_id, local_date)` so a second run is a no-op.

## ADRs

Decisions: [adrs/README.md](adrs/README.md). ADR 0007 is the live environment (two Supabase projects). ADR 0002/0003 storage and auth text is amended by 0007.
