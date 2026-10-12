# Week 7 build plan — harden and freeze

Resume contract for sessions that may stop at a usage-quota reset. **Do not skip ahead.** Finish the current step, mark it `done` here and in `PROGRESS.md`, then start the next step.

**Stories:** P0-31–P0-35. **Gate:** no unresolved critical/high security defect; every sensitive path has a tenant/role test; a new brand applies to UI, email identity, PDF, and public report.

Never-cut: offline integrity, tenant isolation, installability, report quality.

---

## Resume here

| Field                    | Value                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Date                     | 31 Aug 2026                                                                               |
| Current step             | **W7-S9** — seed + browser gate                                                           |
| Status                   | `done`                                                                                    |
| Last finished            | W7-S0–S9: branding, admin, impersonation, authz matrix, freeze on **dev**                 |
| Next step                | Week 8 is done. Week 9 only when asked.                                                   |
| Do not start             | Week 9 beta/storefront, **prod** project, paid APIs, in-app billing, custom domains       |
| Prompt for a new session | `Read PROGRESS.md. Weeks 1–8 are done. Do not start Week 9 until asked. No prod project.` |

When a step is done, move **Current step** to the next id, set that row to `done`, and leave evidence paths.

---

## Scope lock

In: white-label (logo, color, terminology, report/email identity, date/paper/number formats, legal footer); roles, invitations, suspend, audit log; plan limits, feature flags, usage meters; super-admin tenant list; impersonation with a written reason and an audit event the operator can see; authorization matrix tests (tenant, role, signed URL, upload, public-link, rate-limit, secrets); feature freeze notes, v1.1 backlog pointer, known limitations.

Out: Week 8 docs/install/E2E matrix, **prod** Supabase project, paid APIs, in-app billing, custom domains, CSV import (P1-01), extra report layouts, SMS, maps, interviews. Do not upgrade core dependencies after this freeze except security.

No new packages. Rate limits are a DB bucket, not Redis. Email still uses the **dev** project mailbox; the from-name is recorded and shown, not a third-party ESP.

UI language: workspace / brand / plan / usage / activity / impersonate / stop viewing. Never “god mode”, JWT, RLS, or bucket.

Demo beat to protect: owner applies a new color + legal footer + “Property check” terminology → chrome rail and public report follow; inspector is denied; Westfield cannot read Northline settings; platform admin impersonates Westfield with a reason, sees WV jobs, the reason is on the activity ticket; empty reason is blocked.

If the week overruns, cut metering depth (P0-32 is the named cut), never tenant tests, never impersonation audit, never branding on the public report.

---

## Architecture (do not reopen)

- Live branding is `organizations.branding` JSON parsed by `parseWorkspaceBranding`. Snapshot canonical branding stays the Week 5 subset (logo, color, footer, terminology) so golden hashes do not move.
- Logo bytes live at `{orgId}/branding/logo.{ext}` in the evidence bucket. `logoUrl` stores the object key. UI signs it; PDF fetches bytes. Initials on ink if missing.
- Paper size is a render hint on the report envelope, not a hashed canonical field. Goldens stay A4.
- Plan keys `single` / `agency` / `saas` are code tables (`PLAN_LIMITS`). `organizations.plan_key` selects a row. Usage is live counts, not a billing ledger.
- Feature flags are org JSON merged over defaults. Super-admin may disable schedules, QR launch, corrective portal, or share links per tenant.
- Super-admin is `users.is_platform_admin`, not a membership role. Seed: `owner@inspectstack.demo` is the operator.
- Impersonation: `impersonation_sessions` row + httpOnly cookie. Reason required (8–280 chars) **before** the cookie is set. Banner is always visible. Stop writes `ended_at` and an audit event.
- Rate limits: `rate_limit_buckets` keyed by kind + hashed material (auth email+IP, public verify/share IP). Over limit uses the same copy as an unknown report / bad login — nothing extra leaks.
- Authorization stays in repositories and server actions. RLS remains extra.
- `--org-brand` and `--brand` are set on the app shell so ticket rails pick up the live color.

---

## Steps

Status vocabulary: `not started` · `in progress` · `done` · `blocked`.

### W7-S0 — Plan and start decision

|          |                                                                       |
| -------- | --------------------------------------------------------------------- |
| Status   | `done`                                                                |
| Evidence | this file; `DECISIONS.md` 31 Aug 2026; `PROGRESS.md` current week = 7 |

### W7-S1 — Domain: branding, plans, impersonation, rate-limit, uploads, roles

|         |                                                                                          |
| ------- | ---------------------------------------------------------------------------------------- |
| Status  | `done`                                                                                   |
| Stories | P0-31–P0-34 foundation                                                                   |
| Files   | `packages/domain/src/{branding,plans,impersonation,rate-limit,uploads,roles}.ts` + tests |
| Tests   | `harden.test.ts` 12/12                                                                   |

### W7-S2 — Schema for flags, impersonation sessions, rate-limit buckets

|        |                                                                                    |
| ------ | ---------------------------------------------------------------------------------- |
| Status | `done`                                                                             |
| Files  | `packages/db/src/schema.ts`, `supabase/migrations/20260831220000_week7_harden.sql` |
| Apply  | `pnpm --filter @inspectstack/db migrate:week7` applied on **dev** 31 Aug 2026      |

### W7-S3 — Repositories: workspace, usage, admin, tenancy negatives

|        |                                                              |
| ------ | ------------------------------------------------------------ |
| Status | `done`                                                       |
| Files  | `packages/db/src/{admin,workspace}.ts`, repositories updates |

### W7-S4 — White-label settings + apply brand to UI, PDF, public report, email identity

|          |                                                                           |
| -------- | ------------------------------------------------------------------------- |
| Status   | `done`                                                                    |
| Routes   | `/app/settings`                                                           |
| Evidence | Nav **Property checks**; ticket rail `#7A2418`. |

### W7-S5 — Team roles, suspend, activity, plan / flags / usage

|        |                                             |
| ------ | ------------------------------------------- |
| Status | `done`                                      |
| Routes | `/app/settings/team`, `/activity`, `/usage` |

### W7-S6 — Super-admin tenants + impersonation

|          |                                                                     |
| -------- | ------------------------------------------------------------------- |
| Status   | `done`                                                              |
| Routes   | `/app/admin`, `/app/admin/[id]`                                     |
| Evidence | Impersonation + admin Westfield verified (screenshots removed 12 Oct 2026). |

### W7-S7 — Authorization matrix tests

|         |                                                                                    |
| ------- | ---------------------------------------------------------------------------------- |
| Status  | `done`                                                                             |
| Files   | `packages/domain/src/harden.test.ts` 12/12, `packages/db/src/authz.matrix.test.ts` |
| Browser | Inspector denied; Westfield isolated; revoked verify hides                         |

### W7-S8 — Feature freeze notes

|        |                                      |
| ------ | ------------------------------------ |
| Status | `done`                               |
| Files  | `docs/freeze.md`, backlog P1 pointer |

### W7-S9 — Seed + browser gate

|        |                                                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Status | `done`                                                                                                                       |
| Gate   | New Northline brand on chrome; inspector denied; Westfield isolated; impersonation with reason audited; empty reason blocked |
