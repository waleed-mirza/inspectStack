# Backup and restore

v1 backup is the Supabase project plus this git repo. There is no in-app backup button.

## What to copy

| Piece             | How                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Postgres          | Supabase dashboard → Database → Backups, or `pg_dump` against the pooler URL                    |
| Storage           | Download the `evidence` bucket (org-prefixed keys). Logo objects live under `{orgId}/branding/` |
| Auth users        | Supabase Auth export / dashboard. Seed recreates only the five demo personas                    |
| Source + lockfile | git tag / RC zip from `pnpm release:pack`                                                       |
| Env               | `.env.local` stored in a secret manager, never in the zip                                       |

## Restore (demo)

1. Create or empty a Supabase project.
2. `npx supabase link --project-ref <ref>`
3. `pnpm db:push`
4. Restore object storage into `evidence` **or** run `pnpm db:reset` to rebuild demo bytes.
5. Copy env, `pnpm env:sync`, `pnpm dev` or deploy.

## Restore (operator production — after they have a prod project)

Point `DATABASE_URL` and Supabase keys at the restored project. Do not run `pnpm db:reset` on production data. Re-upload storage objects with the same keys. Confirm Auth redirect URLs.

## Point-in-time

Use the provider’s PITR if the plan includes it. InspectStack does not ship its own WAL shipping.

## Support bundle

The runner recovery export is **device** state (queued ops, hashes), not a database backup. Collect it for offline defects; it does not restore the server.
