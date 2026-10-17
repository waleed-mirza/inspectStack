# v1 feature freeze

Frozen 31 Aug 2026 at the Week 7 gate. Core dependencies stay pinned (`docs/adrs/0006-pinned-versions.md`) except for security fixes.

P0-31–P0-35 are the last product stories before the Week 8 release candidate. Do not add modules, paid APIs, or v1.1 items without a `DECISIONS.md` row.

## Still in v1 (ship)

Workspace branding (logo, color, terminology, report/email identity, date/paper/prefix, legal footer), six membership roles, invitations, suspend, activity log, plan caps and flags, usage meters, super-admin tenants, impersonation with a written reason, authorization tests, four starter packs, offline runner, branded PDFs, verification, sites/QR, schedules, corrective portal.

## v1.1 (do not start now)

See `docs/backlog.md` P1:

- P1-01 CSV import/export
- P1-02 Template import / mini marketplace files
- P1-03 Webhooks + Zapier/Make examples
- P1-04 Additional report layouts
- P1-05 i18n
- P1-06 Custom domains
- P1-07 Deeper plan metering / billing later

P2 stays later: optional AI/OCR behind provider interfaces, native wrappers, maps, SMS, CRM/work-order integrations.

## Known limitations

- Live prospect interviews were skipped; public claims stay tied to shipped functionality.
- Email from-name is recorded on invites; the linked Supabase project mailbox still sends the message. No third-party ESP.
- Rate limits are per-instance database buckets, not a global edge WAF.
- Service worker injection is production `next build --webpack` only; `next dev --turbopack` does not install `/sw.js`.
- Paper size on already-issued snapshots stays A4 so Week 5 golden hashes do not move. Live branding paper applies to new renders via the envelope hint.
- Plan caps are enforcement rails for the demo, not a billing product.
- Super-admin in the demo is `owner@inspectstack.demo` (`users.is_platform_admin`). There is no silent god-mode: impersonation requires a reason and writes an audit event the operator can see.
- **Prod** Supabase project is still not created. Week 8 ships clean-install docs (native local + Netlify). Docker stays out.
- License, third-party notices, and support policy shipped in Week 9. As of 12 Oct 2026, `LICENSE` is MIT. `docs/support.md` points at GitHub issues.
- The landing is an MIT project page, not a storefront. Public host is the Netlify free domain. **Prod** Supabase is not created. GitHub stays private until the founder flips it.
- `v1.0.1` (7 Sep 2026) is a security/defect patch. `esbuild` via `drizzle-kit` stays moderate and dev-only.

## Release notes (Week 7)

White-label settings apply to chrome, public verification, and PDF brand rail. Owners can invite, change roles, and suspend members (last owner is protected). Usage meters show people, jobs this month, sites, templates, and storage against the single/agency/saas table. Platform operator can list tenants, set plan and flags, and view a workspace with a written reason. Auth and public report links are rate-limited. Authorization matrix tests cover tenant, role, signed URL prefix, upload sniff, revoked public links, rate-limit, and public env secrets.
