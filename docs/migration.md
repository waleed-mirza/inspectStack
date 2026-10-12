# Migration policy

Source of truth: timestamped SQL under `supabase/migrations/`.

| File                                     | Week                          |
| ---------------------------------------- | ----------------------------- |
| `20260826140000_week2_foundation.sql`    | Foundation                    |
| `20260830180000_week4_media_capture.sql` | Media / runner                |
| `20260831120000_week5_reports.sql`       | Reports / review              |
| `20260831180000_week6_ops.sql`           | Sites, QR, schedules, actions |
| `20260831220000_week7_harden.sql`        | Branding/admin/rate-limit     |

## Apply

Preferred:

```bash
npx supabase link --project-ref <ref>
pnpm db:push
```

Fallback on this founder machine (CLI 403 historically):

```bash
pnpm db:migrate:week7   # and earlier week scripts if a database was created mid-build
```

Those scripts are `IF NOT EXISTS` and go through the Drizzle/postgres.js client. They do not replace keeping SQL in `supabase/migrations`.

## Rules

- Never edit a file that may already be applied on **dev** or a buyer database.
- New change = new timestamped file.
- Drizzle `pnpm db:generate` is optional helper output; ship SQL that matches `packages/db/src/schema.ts`.
- Seed (`pnpm db:reset`) is **data**, not schema. Do not use reset as a migration tool on a customer database.

## RC

v1.0.0-rc.1 expects all five files above. There is no Week 8 schema change.
