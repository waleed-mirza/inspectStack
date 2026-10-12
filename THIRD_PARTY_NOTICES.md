# Third-party notices

InspectStack ships with the following third-party software and fonts. Licenses below were read from package metadata and vendored font notes at the Week 9 freeze (1 Sep 2026). Downstream distributors must retain these notices.

This is not legal advice. SPDX identifiers are the short names used by the upstream projects.

## Runtime (product)

| Package                   | Version (catalog / pin) | SPDX       |
| ------------------------- | ----------------------- | ---------- |
| next                      | 16.3.3                  | MIT        |
| react                     | 19.2.8                  | MIT        |
| react-dom                 | 19.2.8                  | MIT        |
| zod                       | 4.4.3                   | MIT        |
| @dnd-kit/core             | 6.3.1                   | MIT        |
| @dnd-kit/sortable         | 10.0.0                  | MIT        |
| @dnd-kit/utilities        | 3.2.2                   | MIT        |
| @tanstack/react-query     | 5.102.5                 | MIT        |
| dexie                     | 4.4.5                   | Apache-2.0 |
| @serwist/next             | 9.5.12                  | MIT        |
| serwist                   | 9.5.12                  | MIT        |
| drizzle-orm               | 0.45.2                  | Apache-2.0 |
| postgres                  | 3.4.9                   | MIT        |
| @supabase/supabase-js     | 2.112.4                 | MIT        |
| @supabase/ssr             | 0.12.5                  | MIT        |
| @react-pdf/renderer       | 4.8.1                   | MIT        |
| pdf-lib                   | 1.17.1                  | MIT        |
| browser-image-compression | 2.0.2                   | MIT        |
| konva                     | 10.3.1                  | MIT        |
| react-konva               | 19.2.5                  | MIT        |
| qrcode                    | 1.5.4                   | MIT        |
| lucide-react              | 1.34.0                  | ISC        |
| class-variance-authority  | 0.7.1                   | Apache-2.0 |
| clsx                      | 2.1.1                   | MIT        |
| tailwind-merge            | 3.6.0                   | MIT        |
| tailwindcss               | 4.3.3                   | MIT        |
| @tailwindcss/postcss      | 4.3.3                   | MIT        |
| @radix-ui/react-dialog    | 1.1.23                  | MIT        |
| react-hook-form           | 7.86.0                  | MIT        |
| @hookform/resolvers       | 5.9.1                   | MIT        |

Transitive dependencies remain under their own licenses inside `node_modules` after `pnpm install`. Do not vendor `node_modules` in a release zip; install from the lockfile.

## Vendored report fonts (`packages/reports/fonts/`)

| Files                        | Family                | License                   |
| ---------------------------- | --------------------- | ------------------------- |
| `BarlowSemiCondensed-*.ttf`  | Barlow Semi Condensed | SIL Open Font License 1.1 |
| `SourceSans3-*.ttf`          | Source Sans 3         | SIL Open Font License 1.1 |
| `SplineSansMono-Regular.ttf` | Spline Sans Mono      | SIL Open Font License 1.1 |

OFL fonts may be used and embedded in generated PDFs. They may not be sold standalone.

## Development and test (not required to run the product)

| Package                | Version | SPDX       |
| ---------------------- | ------- | ---------- |
| typescript             | 5.9.3   | Apache-2.0 |
| vitest                 | 4.1.11  | MIT        |
| @playwright/test       | 1.62.1  | Apache-2.0 |
| @testing-library/react | 16.3.2  | MIT        |
| axe-core               | 4.13.0  | MPL-2.0    |
| prettier               | 3.6.2   | MIT        |
| drizzle-kit            | 0.31.10 | MIT        |
| tsx                    | 4.20.6  | MIT        |
| eslint                 | 9.39.1  | MIT        |
| eslint-config-next     | 16.3.3  | MIT        |

## Full texts

Upstream license texts live in each package after install. SIL OFL 1.1: https://openfontlicense.org/open-font-license-official-text/. Apache-2.0: https://www.apache.org/licenses/LICENSE-2.0. MPL-2.0: https://www.mozilla.org/en-US/MPL/2.0/.
