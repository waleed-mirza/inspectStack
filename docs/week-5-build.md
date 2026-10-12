# Week 5 build plan — review and reports

Resume contract for sessions that may stop at a usage-quota reset. **Do not skip ahead.** Finish the current step, mark it `done` here and in `PROGRESS.md`, then start the next step.

**Stories:** P0-22–P0-26. **Gate:** golden PDFs render without clipping; identical snapshots hash consistently; revoked links no longer expose reports.

Never-cut: offline integrity, tenant isolation, installability, report quality.

---

## Resume here

| Field                    | Value                                                                            |
| ------------------------ | -------------------------------------------------------------------------------- |
| Date                     | 31 Aug 2026                                                                      |
| Current step             | **W5-S8** — seed + browser gate                                                  |
| Status                   | `done`                                                                           |
| Last finished            | Queue, return, approve/issue PDF, verify, revoke. Goldens 4/4. Inspector denied. |
| Next step                | Week 6 is done. Do not start Week 7 until asked.                                 |
| Do not start             | Week 7 until asked                                                               |
| Prompt for a new session | `Weeks 1–6 are done. Read PROGRESS.md. No Week 7 until asked. No prod project.`  |

When a step is done, move **Current step** to the next id, set that row to `done`, and leave evidence paths.

---

## Scope lock

In: reviewer queue, return/approve with audit, finding lifecycle (owner, due, severity, status), two PDF layouts, four golden vertical PDFs, snapshot hash, verification page, expiring share links, revocation, download logging.

Out: Week 6 sites/QR/schedules/corrective portal, Week 7 white-label settings depth, paid HTML-to-PDF, extra layouts, **prod** Supabase project, interviews.

Pinned packages already in `pnpm-workspace.yaml` catalog. **Install only on the step that first needs them:**

| Package               | Pin    | First step |
| --------------------- | ------ | ---------- |
| `@react-pdf/renderer` | 4.8.1  | W5-S4      |
| `pdf-lib`             | 1.17.1 | W5-S4      |

Layouts (ADR 0004):

1. **condition** — Property, Vehicle. Cover, summary scores, section pages, photo grid, findings, signatures.
2. **audit** — Construction, Workplace Safety. Cover, finding-forward, owners and due dates, evidence, verification.

UI language: return / approve / issued / revoked. Never protocol jargon on the public page.

Demo beat to protect: Property Condition on a submitted harbour job → fail smoke alarm finding → approve → branded PDF + verification page. Revoke hides the report.

---

## Architecture (do not reopen)

- `/app/inspections/[id]` is the ticket. `/app/review` is the queue. `/app/review/[id]` is the review desk. `/app/run/[id]` stays the field runner.
- Only `submitted` jobs enter the approve/return path. Return sets `returned` + review note; the published template version does not change. Approve is a server transaction: validate completeness → status `approved` → canonical snapshot JSON → hash → PDF → storage.
- Inspector cannot approve their own work. `canReview` (owner / admin / reviewer) may approve; role `inspector` never can.
- Snapshot hash is SHA-256 of canonical JSON with stable key order. Issued time and verification code are envelope fields, not hash inputs. Identical content hashes the same.
- PDF is generated from the snapshot, not live-mutated rows. Changing a template draft never mutates issued PDFs.
- Public verify: `/verify/[code]`. Share links: `/share/[token]`. Revoked or expired tokens resolve to a dead page that exposes nothing (no hash, no images, no PDF).
- Downloads write `report_downloads`. Storage keys stay org-prefixed.

---

## Steps

Status vocabulary: `not started` · `in progress` · `done` · `blocked`.

### W5-S0 — Plan and start decision

|          |                                                                         |
| -------- | ----------------------------------------------------------------------- |
| Status   | `done`                                                                  |
| Goal     | Durable step list so quota-split sessions continue without re-planning. |
| Evidence | this file; `DECISIONS.md` 31 Aug 2026; `PROGRESS.md` current week = 5   |

### W5-S1 — Domain: review, findings, snapshot

|         |                                                                      |
| ------- | -------------------------------------------------------------------- |
| Status  | `done`                                                               |
| Stories | P0-22, P0-23, P0-24 foundation                                       |
| Files   | `packages/domain/src/review.ts`, `findings.ts`, `report-snapshot.ts` |
| Do not  | PDF bytes, UI                                                        |

### W5-S2 — Schema for review notes, snapshot JSON, share, downloads

|          |                                                                           |
| -------- | ------------------------------------------------------------------------- |
| Status   | `done`                                                                    |
| Evidence | `supabase/migrations/20260831120000_week5_reports.sql` applied on **dev** |

### W5-S3 — Repositories: queue, return, approve, findings, public snapshot

|        |                                      |
| ------ | ------------------------------------ |
| Status | `done`                               |
| Authz  | tenant scope + `canReview` on writes |
| Do not | PDF layout polish                    |

### W5-S4 — Two PDF layouts in `packages/reports`

|         |                                                                     |
| ------- | ------------------------------------------------------------------- |
| Status  | `done`                                                              |
| Install | `@react-pdf/renderer` 4.8.1, `pdf-lib` 1.17.1                       |
| Quality | cover, summary, sections, findings, media, signatures, audit footer |

### W5-S5 — Reviewer queue and finding desk UI

|        |                                                                |
| ------ | -------------------------------------------------------------- |
| Status | `done`                                                         |
| Routes | `/app/review`, `/app/review/[id]`                              |
| States | empty queue, validation block, approve retry, inspector denied |

### W5-S6 — Four golden vertical PDFs + hash tests

|        |                                                              |
| ------ | ------------------------------------------------------------ |
| Status | `done`                                                       |
| Files  | `packages/reports/goldens/*.pdf`, fixture models, hash tests |

### W5-S7 — Verification, share, revoke, download log

|        |                                                  |
| ------ | ------------------------------------------------ |
| Status | `done`                                           |
| Routes | `/verify/[code]`, `/share/[token]`, PDF download |
| Gate   | revoked link shows nothing                       |

### W5-S8 — Seed + browser gate

|        |                                                             |
| ------ | ----------------------------------------------------------- |
| Status | `done`                                                      |
| Seed   | submitted harbour job for review; one issued snapshot       |
| Gate   | approve issues PDF; revoke hides verify page; hashes stable |
