# ADR 0006 — Pinned dependency versions

- Status: accepted
- Date: 2026-08-26
- Week: 1
- Source: npm registry + local toolchain, 26 Aug 2026

## Context

Plan policy: choose current stable at Week 1, pin it, do not upgrade core dependencies after the Week 7 feature freeze unless fixing a security issue. Local Node is v24.13.0; Node 24 is current LTS (24.19.x on nodejs.org).

## Decision

Week 2 scaffold installs these **exact** versions (or the lockfile equivalent after `pnpm install` of these specifiers). Review if a CVE lands before freeze.

| Layer | Package | Pin | Notes |
| ----- | ------- | --- | ----- |
| Runtime | Node.js | `24.x` LTS (engines `>=24.13.0 <25`) | Current LTS. Next 16 requires `>=20.9.0`. |
| Runtime | pnpm | `10.34.5` | Local toolchain |
| Language | TypeScript | `5.9.3` | TS 7.0.2 exists; not yet the conservative pin for Next 16. Revisit only if Next documents TS 7 before freeze. |
| App | `next` | `16.3.3` | App Router |
| App | `react` / `react-dom` | `19.2.8` | |
| CSS | `tailwindcss` | `4.3.3` | With `@tailwindcss/postcss` `4.3.3` |
| UI kit | `shadcn` CLI | `4.19.0` | Install components via shadcn MCP; restyle to tokens |
| UI kit | Radix (example primitive) | `@radix-ui/react-dialog` `1.1.23` | Others follow shadcn at install time |
| Forms | `react-hook-form` | `7.86.0` | |
| Forms | `zod` | `4.4.3` | |
| Forms | `@hookform/resolvers` | `5.9.1` | |
| Builder | `@dnd-kit/core` | `6.3.1` | |
| Builder | `@dnd-kit/sortable` | `10.0.0` | |
| Client data | `@tanstack/react-query` | `5.102.5` | |
| Offline DB | `dexie` | `4.4.5` | |
| PWA | `@serwist/next` | `9.5.12` | Service worker |
| ORM | `drizzle-orm` | `0.45.2` | Stable, not v1 RC |
| ORM | `drizzle-kit` | `0.31.10` | |
| DB driver | `postgres` | `3.4.9` | postgres.js, used by Drizzle |
| Auth | `@supabase/supabase-js` | `2.112.4` | ADR 0007 |
| Auth | `@supabase/ssr` | `0.12.5` | Cookie session for App Router |
| CLI | `supabase` | `2.115.0` (npx) | Link/migrations/types. Not `supabase start`. |
| PDF | `@react-pdf/renderer` | `4.8.1` | |
| PDF | `pdf-lib` | `1.17.1` | |
| Media | `browser-image-compression` | `2.0.2` | |
| Media | `konva` | `10.3.1` | |
| Media | `react-konva` | `19.2.5` | Matches React 19 |
| QR | `qrcode` | `1.5.4` | Plus browser `BarcodeDetector` fallback |
| Test | `vitest` | `4.1.11` | |
| Test | `@playwright/test` | `1.62.1` | |
| Test | `@testing-library/react` | `16.3.2` | |
| Test | `axe-core` | `4.13.0` | |
| Icons / cn | `lucide-react` | `1.34.0` | |
| Icons / cn | `class-variance-authority` | `0.7.1` | |
| Icons / cn | `clsx` | `2.1.1` | |
| Icons / cn | `tailwind-merge` | `3.6.0` | |

No Docker. Database, Auth, and Storage are the linked **dev** Supabase project (ADR 0007). Promote to a second **prod** project after freeze. `npx supabase` 2.115.0 is the CLI pin.

## Consequences

- Week 2 `package.json` files copy this table; lockfile is committed.
- Do not float `latest` after scaffold.
- Drizzle v1 RC and TypeScript 7 are explicitly **not** in v1 unless a later ADR accepts them.

## Alternatives rejected

- Node 22 LTS: still supported, but 24 is current LTS as of this pin date.
- Auth.js / `next-auth`: superseded by ADR 0007.
- `drizzle-orm@rc`: RC is not “current stable”.
