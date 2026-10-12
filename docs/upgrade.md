# Upgrade policy

v1.0.1 is the current maintenance archive (1.0.0 was 1 Sep 2026). Core runtime dependencies are frozen except security fixes (ADR 0006).

## Schema

SQL files in `supabase/migrations` are append-only. Never edit a migration that may already be applied. Add a new timestamped file. See [migration.md](migration.md).

`pnpm db:push` applies pending SQL via the Supabase CLI. If the CLI cannot push (403 on this founder machine historically), the week-scoped `pnpm db:migrate:week7` style scripts apply `IF NOT EXISTS` SQL through the app database client. Buyers should prefer `db push` when their login role allows it.

## App

1. Read `CHANGELOG.md` and `docs/freeze.md`.
2. Install with the lockfile: `pnpm install --frozen-lockfile`.
3. Apply migrations.
4. `pnpm db:reset` only on **demo** data. Never reset a buyer’s production database.
5. Rebuild the web app (`next build --webpack`).
6. Confirm four report goldens still match if you touch `packages/reports`: `pnpm --filter @inspectstack/reports test`.

## Compatibility

Already-issued report snapshots stay A4 so Week 5 hashes do not move. Live branding paper size applies to **new** renders.

Service worker caches the runner. After deploy, a hard refresh may be needed on field phones.

## Support bundle

From `/app/run/[id]/recovery` export JSON + hashes. Include `productVersion`, env name (dev/demo), and reproduction steps when filing a defect. Strip secrets.
