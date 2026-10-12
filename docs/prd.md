# InspectStack product requirements (v1 freeze)

Week 1 specify. Frozen 26 Aug 2026. Working name: **InspectStack** — trademark, domain, package, app-store, clearance still required before public launch (`DECISIONS.md`).

## One-sentence positioning

Launch white-label inspection software for property, construction, vehicle, safety, and maintenance businesses — with offline field capture and client-ready reports included.

## What ships

MIT source + four industry starter packs + install enablement (seed, docs, deploy guides). Not a generic form builder.

The docs convince a developer or agency that the code is easy to own. The demo convinces the field business that the workflow is real.

## Audience matrix

| Layer | Persona | What they must believe | Primary proof | Typical use |
| ----- | ------- | ---------------------- | ------------- | ----------- |
| Operator | Solo SaaS founder | A viable vertical MVP can launch in weeks | Live SaaS demo + setup video | Self-host / white-label |
| Operator | Web agency / freelancer | It can be branded and adapted for multiple client proposals | White-label panel + starter packs | Multi-client deployments |
| Operator | Vertical software consultant | The workflow is deep enough to sell implementation | Offline sync + findings + reports | Implementation services |
| End-user (demo audience) | Inspection company owner | Reports will be faster, consistent, and professional | Property / vehicle report demo | Via an operator who deploys it |
| End-user (demo audience) | Operations or safety manager | Evidence and corrective actions will be traceable | Audit trail + dashboard | Via an operator who deploys it |

The source license is MIT (`LICENSE`).

## Thesis to protect

Offline field execution + professional reports + white-label launchability. Resist becoming a generic form builder or a field-service ERP.

## v1 must include

Workspace, users (owner / admin / template manager / inspector / reviewer / client viewer), templates (sections, fields, validation, conditionals, scoring, version / publish / clone), field runner (offline queue, autosave, draft resume, evidence, GPS, signatures), findings, reports (branded PDF, verification), sites + assets (QR, history), scheduling (assignments, recurring, reminders), admin (tenants, flags, plan limits, usage), four seeded vertical packs, install docs.

Field types, conditionals, screens, and status machines: see `docs/workflows.md` and the operating plan §§3–6.

## Non-goals (do not build in v1)

- Broad no-code form platform, workflow automation suite, CRM, accounting, or workforce scheduling
- Paid AI, OCR, map tiles, SMS, third-party PDF APIs, native push, or specialized inspection APIs
- Native iOS / Android apps (excellent PWA only; native packaging is later)
- Arbitrary real-time collaborative editing (version templates; publish / clone)
- Regulated compliance certification (configurable audit trails; buyers own legal validation)
- In-app payment billing unless essential to the demo; provide integration points
- Offline template editing
- Public evidence buckets

An excluded item enters v1 only with a `DECISIONS.md` row.

## Launch definition (measurable)

A buyer, without our help, understands the vertical demo, trusts the architecture, purchases the correct license, installs, applies their brand, runs an offline inspection, and issues a client-ready report.

| Milestone | When | Passes when |
| --------- | ---- | ----------- |
| Installable foundation | End of Week 8 | Clone, configure, seed, deploy, branded PDF without our help |
| Launch package | End of Week 9 | ≥20 real end-to-end beta inspections; listing claims ≤ shipped functionality |
| Public sale | End of Week 10 | Direct storefront live; suitable marketplaces submitted; 30-day pipeline scheduled |
| First-30-day operating targets | After launch | 500 qualified landing visits, 10%+ demo-start, useful clone/install rate, median first local run <20 min, support via GitHub issues |

These are operating targets, not forecasts.

## Three-minute demo (must stay possible)

An operator applies logo and color → clones Property Condition pack → runs a bedroom inspection offline → fails a smoke alarm → annotates a photo → captures a tenant signature → reconnects → opens branded PDF + public verification page.

## Validation status

Live Week 1 interviews: **skipped** (`DECISIONS.md` 26 Aug 2026). Week 1 purchase-intent gate **waived**. Week 3 8+8 interview rule **deferred**.

## Related

- Workflows: `docs/workflows.md`
- Wireframes: `docs/wireframes/index.html`
- ADRs: `docs/adrs/`
- Backlog: `docs/backlog.md`
- Starter packs: `docs/starter-packs.md`
