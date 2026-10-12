# Architecture decision records

Pinned 26 Aug 2026. Core dependencies freeze after the Week 7 feature freeze unless a security fix requires a bump.

| ADR | Decision |
| --- | -------- |
| [0001](0001-tenancy.md) | Organization-scoped multi-tenancy in repositories |
| [0002](0002-storage.md) | S3-compatible adapter; MinIO locally |
| [0003](0003-auth.md) | Auth.js v5 with credentials, magic-link, OAuth adapters |
| [0004](0004-pdf-reports.md) | `@react-pdf/renderer` + pdf-lib; immutable snapshots |
| [0005](0005-offline-sync.md) | Service worker + Dexie + explicit operation queue |
| [0006](0006-pinned-versions.md) | Exact versions to install in Week 2 |
| [0007](0007-supabase-environments.md) | Two Supabase projects (dev / prod); Auth + Storage + Postgres |
