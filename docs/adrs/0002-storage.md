# ADR 0002 — Object storage

- Status: accepted (amended by [ADR 0007](0007-supabase-environments.md) — default driver is Supabase Storage)
- Date: 2026-08-26
- Week: 1

## Context

Field evidence (photos, signatures, support bundles) must work locally with no cloud account, and in production on R2, AWS S3, or Supabase Storage. No public evidence buckets. Signed access only.

## Decision

A single S3-compatible **storage adapter** in the app:

| Environment | Implementation |
| ----------- | -------------- |
| Founder dev / demo | Supabase Storage on the **dev** project (ADR 0007) |
| Launch | Supabase Storage on the **prod** project |
| Later portable path | S3-compatible adapter or filesystem — not Week 2 |

Interface: put, get, delete, presign upload, presign download. Keys: `{organizationId}/{inspectionId}/{mediaId}/{random}.{ext}`.

Uploads: client compresses, hashes, writes a media **manifest** first, then transfers bytes. Content type is verified server-side. Presigned URLs are short-lived.

Email for auth/invites is the Supabase project’s email (ADR 0007). A portable SMTP adapter is not Week 2 work.

## Consequences

- `.env` carries `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` (dev vs prod project).
- Week 2 requires the linked **dev** Supabase project, not native disk or MinIO.
- `@supabase/supabase-js` is a required runtime for storage and auth.

## Alternatives rejected

- Vendor SDK per provider in app code: lock-in.
- Storing binaries in Postgres: inspection photos will blow up backups.
- Public CDN buckets with guessable URLs: tenant leak.
