# Week 10 build plan — launch and open-source publish

Resume contract for sessions that may stop at a usage-quota reset. **Do not skip ahead.** Finish the current step, mark it `done` here and in `PROGRESS.md`, then start the next step.

**Stories:** direct landing, marketplace submissions, content, outreach, support/funnel/changelog, first maintenance hold. Paid checkout was removed 12 Oct 2026.

Never-cut: offline integrity, tenant isolation, installability, report quality.

---

## Resume here

| Field                    | Value                                                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date                     | 8 Sep 2026                                                                                                                                                                          |
| Current step             | Paid checkout removed. Do not restore product prices or checkout notes.                                                                                                            |
| Status                   | `in progress` (week).                                                                                                                                                               |
| Last finished            | MIT landing. Checkout notes removed from the tree 12 Oct 2026.                                                                                                                     |
| Next step                | Founder publishes the repository when they choose.                                                                                                                                 |
| Do not start             | Marketplace upload, **prod** Supabase project, paid APIs, v1.1, in-app payment SDKs, live beta                                                                                     |
| Prompt for a new session | `Read PROGRESS.md. Week 10 in progress. Source is MIT. No product prices or checkout notes. No prod project.`                                                                      |

---

## Scope lock

**In:** project landing on the existing Netlify demo host; changelog link; support pointer on the page.

**Out:** marketplace submissions; **prod** Supabase; Docker; paid analytics; in-app billing; custom domain purchase; inventing testimonials; product prices; checkout notes.

Human loops that stay founder-operated:

- Live 7-day beta.
- Two fresh buyers watching the overview.
- Named outreach list (50 + 30) and sending it.
- Remaining films (setup VO, vehicle / construction / safety).

---

## Architecture (do not reopen)

- Demo and landing share one origin. `/` is the project page; `/login` is the evaluator path.
- Identity = Supabase Auth; authorization = membership in `packages/db`.
- No checkout and no payment SDK.
- Operators create their own Supabase project. Author **prod** project stays uncreated.
- Core deps frozen except security.

---

## Steps

Status vocabulary: `not started` · `in progress` · `done` · `blocked`.

### W10-S0 — Plan and start decision

|          |                                                               |
| -------- | ------------------------------------------------------------- |
| Status   | `done`                                                        |
| Evidence | this file; `DECISIONS.md` 7 Sep 2026; `PROGRESS.md` week = 10 |

### W10-S1 — Project landing

|          |                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status   | `done`                                                                                                                                                                                                                    |
| Files    | `apps/web/src/app/page.tsx`, `apps/web/src/components/storefront/home.tsx`, `apps/web/src/lib/actions/notify.ts`, `apps/web/public/listing/`                                                                              |
| Evidence | Browser 7 Sep 2026: `/` at 1280 and 360. Try the demo → `/login`. Landing is MIT (checkout removed 12 Oct 2026). |

### W10-S2 — Checkout runbook

|          |                                                     |
| -------- | --------------------------------------------------- |
| Status   | `skipped`                                           |
| Evidence | Removed 12 Oct 2026 with the paid offer.            |

### W10-S3 — Checkout URLs on the landing

|          |                                                     |
| -------- | --------------------------------------------------- |
| Status   | `skipped`                                           |
| Evidence | Removed 12 Oct 2026. Landing is the MIT project page. |

### W10-S4 — Content drafts (do not publish until asked)

|        |                                                         |
| ------ | ------------------------------------------------------- |
| Status | `not started`                                           |
| Files  | four vertical + architecture + ROI + walkthrough drafts |

### W10-S5 — Outreach tracker (names are founder-filled)

|        |               |
| ------ | ------------- |
| Status | `not started` |

### W10-S6 — Marketplace submissions

|         |               |
| ------- | ------------- |
| Status  | `not started` |
| Blocked | Paid marketplace path retired 12 Oct 2026 |

### W10-S7 — Close week

|        |               |
| ------ | ------------- |
| Status | `not started` |
