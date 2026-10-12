# ADR 0005 — Offline field runner and sync

- Status: accepted
- Date: 2026-08-26
- Week: 1

## Context

Offline integrity is never-cut. Inspectors work in basements, sites, and vehicles. Browser storage can be evicted; that risk must be visible. Template editing stays online.

## Decision

**Installable PWA** via service worker (`@serwist/next`). Durable drafts in **Dexie / IndexedDB**, partitioned by `organizationId` + `userId`, with an explicit schema version.

When an assignment opens online, download: inspection shell, published template version, site/asset summary, allowed reference files, current responses, upload policy.

Each local mutation is a domain **operation**: UUID `operationId`, entity id, client timestamp, base revision, type, payload hash. UI reads the local projection; the network is never required for “saved”.

Media: compress (`browser-image-compression`), hash, write manifest, then upload. Metadata and bytes may sync separately. Annotation uses canvas / Konva.

Server applies operations in a transaction, stores `operationId`, increments revision, returns canonical values. Duplicate `operationId` returns the prior result.

Conflict policy:

| Data | Policy | UX |
| ---- | ------ | -- |
| Simple response | Last accepted write with revision check | Conflict if server changed since base |
| Photo / media | Additive; dedupe by content hash | Keep both unless removed |
| Finding status | Server transition rules win | Refresh, reapply allowed transition |
| Template | No offline editing | Builder requires connectivity |
| Final submit | Server validates complete snapshot | Field-level missing/conflict list |

Status language in the UI: offline / queued / syncing / failed / synced — no protocol jargon.

Recovery screen lists queued records, retry, and export of a support bundle.

## Consequences

- Week 4 gate: recovery scenario twice on desktop emulation and twice on a real mid-range phone.
- Autosave target: no more than one answer lost after forced close.
- Low-storage and eviction are first-class tests, not FAQ afterthoughts.

## Alternatives rejected

- “Optimistic fetch with cache” only: not a write-ahead log; duplicates and lost photos.
- CRDT/Yjs: overkill; inspections are assignment-scoped, not arbitrary collab.
- Background Sync API only: poor Safari story; we own the queue.
