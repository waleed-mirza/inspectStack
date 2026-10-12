# Six primary workflows

Mapped 26 Aug 2026. Clickable low-fi: `docs/wireframes/index.html`.

Shared invariants: every tenant-owned row carries `organization_id`. Org is resolved from authenticated membership, never from an untrusted body alone. Published template versions are immutable. Only **approved** inspections issue final reports.

## Status machines

| Object | Progression | Rule |
| ------ | ----------- | ---- |
| Inspection | draft → assigned → in_progress → submitted → approved / returned → archived | Only approved records issue final reports |
| Finding | open → acknowledged → in_progress → ready_for_review → closed / reopened | Every transition records actor and time |
| Template version | draft → published → retired | Published versions are immutable |
| Sync operation | queued → sending → applied / conflict / failed | Client operation ID makes retries idempotent |

## 1. Template author — builder

**Happy path:** Create draft → add sections/fields → add rules → preview → publish immutable version.

**Actors:** owner, admin, template manager.

**Empty:** library with “Clone a starter pack” and “New blank template”.
**Validation:** unnamed fields, circular conditionals, publish with zero sections blocked.
**Server failure:** draft stays local-enough to retry; builder itself is **online-only**.
**Permission denied:** inspector/client cannot open the builder.

**Conditionals (v1):** `WHEN field / operator / value THEN show|hide | require|optional | create finding`. All/any groups. Readable rule summary. No arbitrary expressions.

**Never-cut:** a published version used by an inspection stays unchanged when the next draft is edited.

Wireframe: `wireframes/builder.html`.

## 2. Inspector — field runner

**Happy path:** Open assignment → download offline bundle → capture responses/evidence → sign → sync → submit.

**Actors:** inspector (primary), admin for assignment.

**Empty:** no assignments; download incomplete.
**Validation:** required evidence missing on fail; signature required when template says so.
**Offline:** answers autosave locally after each change; uploads never block section navigation; final submit blocked only if required evidence is missing or permanently failed.
**Sync conflict:** revision check on simple answers; photos additive by content hash; finding transitions follow server rules.
**Permission denied:** reviewer/client cannot mutate field answers after submit except through review return.

**Never-cut:** complete offline, close tab, reopen, add evidence, reconnect, retry interrupted upload → exactly one canonical inspection, no lost answers.

Wireframe: `wireframes/runner.html`.

## 3. Reviewer — review and findings

**Happy path:** Review exceptions → edit findings → request correction or approve → generate report.

**Actors:** reviewer, admin, owner.

**Empty:** submitted queue is empty.
**Validation:** approve blocked if required signatures/evidence still missing after return cycle.
**Server failure:** approval is a server transaction; UI shows retry, does not double-issue reports.
**Permission denied:** inspector cannot approve their own work in v1 (reviewer or admin).

Wireframe: `wireframes/review.html`.

## 4. Client — report and verification

**Happy path:** Open secure/public link → read report → acknowledge/sign if asked → download PDF.

**Actors:** client viewer; anyone with a live verification code.

**Empty:** revoked or expired link.
**Validation:** verification code mismatch.
**Server failure:** download logs still attempt; no partial PDF claimed as final.
**Permission denied:** revoked links expose nothing.

**Never-cut:** report quality (no clipping, stable snapshot hash, branding on cover/summary/sections/findings/media/signatures).

Wireframe: `wireframes/report.html`.

## 5. Dispatcher / ops — sites, assets, schedule

**Happy path:** Select site/asset → choose template version → assign inspector → set due date → notify. Recurring rule creates the next assignment at the local date. QR launches the tenant-scoped asset.

**Actors:** admin, owner, dispatcher (admin role in v1 — no separate dispatcher role).

**Empty:** no sites; QR sheet with zero assets.
**Validation:** due date in a timezone the org actually uses; recurring uniqueness so a double cron cannot duplicate.
**Server failure:** job table is idempotent.
**Permission denied:** inspector cannot create sites in v1 unless flagged; clients never can.

Wireframe: `wireframes/sites.html`.

## 6. Owner — onboarding and brand

**Happy path:** Create workspace → choose starter pack → upload logo → invite team.

**Actors:** owner (first user), later admin.

**Empty:** no pack chosen; logo missing (dark-safe placeholder).
**Validation:** workspace name, timezone, at least one pack or blank.
**Server failure:** org create is transactional; invite emails retry via SMTP adapter.
**Permission denied:** non-members cannot create a second org unless SaaS mode + plan allows.

Must support the three-minute demo: apply logo/color, clone Property Condition, run the bedroom inspection.

Wireframe: `wireframes/onboarding.html`.

## Corrective owner (supporting, Week 6)

Receive action → add evidence/comment → mark ready → reviewer verifies or returns. Portal is in v1; not one of the six Week 1 wireframe surfaces.

## Screens to ship (from this map)

Public: landing/demo chooser, login, report verification, shared report.
Onboarding: workspace, starter pack, logo, invite.
Dashboard: due/overdue, completion trend, open findings, recent activity.
Templates: library, builder, preview, version history, publish/clone.
Inspections: list, assign, runner, review, report, audit trail.
Operations: sites, assets, QR print, schedules, corrective actions.
Settings: branding, report, email, storage, roles, plan/limits.
Super admin: tenants, plans, usage, flags, impersonation audit.
