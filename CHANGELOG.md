# Changelog

All notable changes to InspectStack. Version is `VERSION` and `APP_VERSION` in `@inspectstack/domain`.

## Unreleased

- Source license is MIT (`LICENSE`). Copyright 2026 WHH Treasures.
- Landing is an open-source project page: view source, MIT grant, demo walkthrough.
- `CONTRIBUTING.md` and `SECURITY.md` added. Support is GitHub issues.
- Publish cleanup: personal email and live Supabase/Netlify identifiers replaced with placeholders; sales/`marketing` assets, operating-plan Word doc, and `.grok/` removed from the tree; root `package.json` declares `"license": "MIT"`; production build tolerates placeholder env via dynamic `/app` rendering.
- GitHub remains private until the founder publishes it.

## 1.0.1 — 2026-09-07

Maintenance. Security and defects only. Pulled forward from the 5 Oct 2026 hold.

### Added

- Project landing at `/`. `/login` remains the evaluator path.

### Security

- Nested `browserslist` 4.28.6 (GHSA-c83g-rgw3-j3cx, GHSA-73wf-gq98-2v4g via `@serwist/next`) reviewed: build-time only, not on the request path. Not overridden this patch — `pnpm install` bin-link currently fails with `Invalid Version` on this machine (pre-existing). Does not bump Next or Serwist.
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `frame-ancestors 'none'` on every response.
- Public verify/share HTML and 410 PDF responses are `Cache-Control: no-store` so a revoked report cannot linger in a CDN.
- Inspection media bytes are sniffed (magic) before storage; declared MIME is not enough.
- Release zip excludes evaluator-password login screenshots.

### Known limitations

`esbuild` in `drizzle-kit` remains moderate (GHSA-67mh-4wv8-2f99). It is a **dev-only** CLI path, not the production app. Not bumped (core pin).

## 1.0.0 — 2026-09-01

Launch candidate. Week 9 package on the **dev** Supabase project.

### Added

- Third-party notices, support policy, and sample privacy/terms for operators to adapt.
- Product stills and overview recording under `apps/web/public/listing/`.
- Private-beta protocol (later removed from the published tree; see Unreleased).

### Known limitations

Same as the RC, plus: demo host was a Netlify free domain; no extra analytics.

## 1.0.0-rc.1 — 2026-08-31

Release candidate. Weeks 2–8 product on the **dev** Supabase project.

### Added

- White-label field inspection app: templates, offline runner, review, branded PDFs, sites/QR, schedules, corrective actions, plan/usage, impersonation.
- Queued stamp color `#8a5200` (was `#b36b00`) so the In-field stamp meets WCAG AA on ticket stock.
- Four starter packs: Property Condition, Vehicle, Construction, Workplace Safety.
- Docs: Quick Start, architecture, configuration, deploy, storage/email, branding, testing, upgrade, backup, troubleshooting, migration policy.
- Test matrix: Vitest unit/integration/component; Playwright Chromium at 1280 and 360; axe on login and jobs.
- Support bundle from the runner recovery screen includes `productVersion`.
- `pnpm release:pack` builds a source zip without secrets, `node_modules`, or `.env.local`.

### Known limitations

See `docs/freeze.md`. Live interviews were skipped. Email from-name is recorded; the linked Supabase project mailbox still sends. Service worker is production `next build --webpack` only. **Prod** Supabase project is not created in this RC.

## 0.0.0 — Weeks 2–7 (unreleased snapshots)

Foundation, builder, offline runner, reports, operations, harden and freeze. Tracked in `PROGRESS.md`.
