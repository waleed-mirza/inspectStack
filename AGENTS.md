# InspectStack agent rules

Product: InspectStack — white-label Field Inspection & Report Builder (Next.js PWA, offline capture, branded PDFs, four starter packs). Source is MIT (`LICENSE`, 12 Oct 2026).

Name is a working title. Trademark and domain clearance required before public launch.

## Every session

1. Read `PROGRESS.md` before product or tooling work. The current week there is the only week in scope.
2. After finishing plan-related work, update `PROGRESS.md` (status + evidence) and `~/.grok/memory/inspectstack-f497d06b/MEMORY.md` **Current status** when that memory store exists. Do not check items you did not verify.
3. Record scope, timing, or stack changes in `DECISIONS.md`.
4. Follow `TOOLING.md` for which MCPs / skills / hooks are allowed now vs later.

## Current constraint

Weeks 1–9 are **done**; interviews **skipped**. Week 10 is **in progress**. Source is MIT as of 12 Oct 2026 (`DECISIONS.md`). Do not describe paid source SKUs. GitHub stays private until the founder asks to make it public. Do not add paid APIs or v1.1 items unless `DECISIONS.md` records a change. Do not create a **prod** Supabase project. Core dependencies are frozen except security.

Never-cut: offline integrity, tenant isolation, installability, report quality. If a weekly gate fails, cut a v1.1 feature before borrowing more than two days from the next week.

Invoke `/inspectstack-scope` before adding a module, dependency, or paid integration (when that skill is available in the session).

## Stack (pin versions in Week 1; freeze after Week 7 unless security)

| Layer           | Choice                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Runtime         | Current Node.js LTS, pnpm, TypeScript strict, lockfile committed                                  |
| App             | Current Next.js App Router + React                                                                |
| UI              | Tailwind + shadcn/ui + Radix                                                                      |
| Forms / builder | React Hook Form + Zod; dnd-kit                                                                    |
| Client data     | TanStack Query                                                                                    |
| Offline         | Service worker + Dexie/IndexedDB + explicit sync queue                                            |
| DB              | PostgreSQL + Drizzle + migrations                                                                 |
| Auth            | Supabase Auth (`@supabase/ssr`); roles on our `membership` table                                  |
| Storage         | Supabase Storage (org-prefixed keys, signed URLs)                                                 |
| Email           | Supabase project email (magic links / invites)                                                    |
| PDF             | `@react-pdf/renderer` + pdf-lib                                                                   |
| Dev             | Linked **dev** Supabase project via `npx supabase`. No Docker. **Prod** project only at finalize. |

Repo shape: `apps/web`, `packages/{db,domain,ui,reports,config,testkit}`, `docs`.

Founder development uses a **dev** Supabase project (no Docker). A second **prod** project is used at finalize. Do not commit service-role keys. Do not commit live project refs or personal emails.

Ignore `clientnest-*` skills if they appear in this session; they belong to a different product.

## Skills to invoke (when present in the agent environment)

- `/inspectstack-progress` — start or close of plan work
- `/inspectstack-scope` — any feature, module, or dependency request
- `/inspectstack-validation` — interviews, waitlist, survey, objection log
- `/inspectstack-ui` — any visual work (field runner, reports, branding)
- `/frontend-design` — UI craft within inspectstack-ui constraints
- `/inspectstack-architecture` — tenancy, repo shape, adapters
- `/inspectstack-offline` — runner, sync, IndexedDB, recovery
- `/inspectstack-reports` — PDF, snapshots, verification
- `/inspectstack-security` — tenant isolation, authz, secrets

Project-local `.grok/` tooling was removed from the published tree (MIT cleanup). Use session skills/MCPs when available. Use Context7 MCP for current Next.js / Tailwind / React / Drizzle docs. Use shadcn MCP to install components; do not invent shadcn APIs.

## Definition of done (when a real feature is in scope)

Happy path, empty, validation error, server failure, and permission denial. Authorization on the server and in repositories, not only in the UI. Tenant-negative tests on sensitive paths. Tests, docs, and demo data updated when those exist. No new production-build or console warnings.

Tests execute only when the user explicitly asks.
