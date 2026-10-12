# Tooling — now vs later

Source of truth for which MCPs, skills, and hooks are expected. Product progress lives in `PROGRESS.md`.

Confirm endpoints in official docs before enabling a future row. Do not install future items early.

The in-repo `.grok/` directory (skills, hooks, config, screenshots, plan extracts) was **removed** on 12 Oct 2026 for MIT publish readiness (`DECISIONS.md`). Prefer session-level / user-level Grok or Cursor skills when present. Do not recreate sales or credential-bearing scripts in git.

## Now (Week 10)

Playwright test package on; Playwright MCP still off. Postgres MCP off. Do not commit `DATABASE_URL` or service-role keys.

### MCP servers (session / user config)

| Server       | Transport                           | Why now                                                                          |
| ------------ | ----------------------------------- | -------------------------------------------------------------------------------- |
| **context7** | HTTP `https://mcp.context7.com/mcp` | Current Next.js / Tailwind / React / Drizzle docs                                |
| **shadcn**   | stdio `npx -y shadcn@latest mcp`    | Install real shadcn items; do not invent component APIs                          |

OAuth: complete Context7 login if prompted. Optional `CONTEXT7_API_KEY` in the environment (not in git).

### Skills (when available in the agent environment)

| Skill                       | Slash                      | When                                                                 |
| --------------------------- | -------------------------- | -------------------------------------------------------------------- |
| `inspectstack-progress`     | `/inspectstack-progress`   | Start/end of a session or after finishing plan work                  |
| `inspectstack-scope`        | `/inspectstack-scope`      | Any feature, module, or dependency request                           |
| `inspectstack-validation`   | `/inspectstack-validation` | Interviews, waitlist, survey, scorecard, objections                  |
| `inspectstack-ui`           | `/inspectstack-ui`         | Wireframes, runner, reports, branding. Wins on product visual rules. |
| `inspectstack-architecture` | —                          | Tenancy, repo shape, adapters, stack                                 |
| `inspectstack-offline`      | —                          | PWA, IndexedDB, sync, recovery                                       |
| `inspectstack-reports`      | —                          | PDF snapshots, verification, golden fixtures                         |
| `inspectstack-security`     | —                          | Tenant isolation, authz, secrets, audit                              |

### Plugins / LSP / hooks

Use marketplace or user-level plugins (`frontend-design`, etc.) when useful. Do not vendor them back into this repository for the MIT tree. Keep secrets out of git; prefer CI secret scanning over ad-hoc hook scripts in-repo.

### Explicitly off for v1

- Paid AI APIs, Linear/Firebase/Discord payment SDKs as product dependencies
- In-app payment billing

## Next

| Kind  | Item                                             | When                                                    | Purpose                                                                           |
| ----- | ------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| MCP   | Playwright `@playwright/mcp`                     | Optional; Week 8 uses `@playwright/test` in-repo        | E2E lives in `apps/web/e2e`                                                       |
| MCP   | Postgres `@modelcontextprotocol/server-postgres` | After a **dev** Supabase DB URL exists locally          | Read-only schema inspection; `DATABASE_URL` from env, never committed             |
| MCP   | GitHub                                           | After `origin` exists                                   | Issues/PRs                                                                        |

Supabase CLI:

```
npx supabase login
npx supabase link --project-ref YOUR_DEV_PROJECT_REF
```

Never commit project refs, service-role keys, or personal emails into docs or config.
