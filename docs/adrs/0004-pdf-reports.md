# ADR 0004 — PDF reports and snapshots

- Status: accepted
- Date: 2026-08-26
- Week: 1

## Context

The product moment is a branded, client-ready PDF plus a public verification page. External PDF APIs are a v1 exclusion. Identical approved inspections must hash the same. Two layouts ship in v1; four golden vertical fixtures.

## Decision

Render with **`@react-pdf/renderer`**. Use **`pdf-lib`** only for post-processing we cannot express in the renderer (page stamps, merge, linearization if needed).

A **report snapshot** is an immutable JSON render model stored at issue time, bound to `templateVersionId` + `inspectionId` + branding tokens. The PDF is generated from the snapshot, not live-mutated inspection rows. Snapshot hash is of the canonical JSON (stable key order).

v1 layouts:

1. **Condition report** — cover, summary scores, room/section pages, photo grid, findings, signatures (Property, Vehicle).
2. **Audit / punch** — cover, finding-forward, owners and due dates, evidence, verification (Construction, Workplace Safety).

Sharing: expiring token, verification code/page, revocation, download logging. Revoked tokens resolve to a dead page, not 404-with-leak.

## Consequences

- Report work lives in `packages/reports` with golden fixtures.
- Changing a template draft never mutates issued PDFs.
- Visual QA (clipping, long answers, missing photos) is a Week 5 gate, not polish-later.
- No DocRaptor, Prince, Browserless, or paid HTML-to-PDF.

## Alternatives rejected

- Headless Chrome HTML-to-PDF as the only path: heavier ops, less deterministic typography.
- Client-only generate-and-forget: no verification hash, no revocation story.
