# ADR 0001 — Multi-tenancy

- Status: accepted
- Date: 2026-08-26
- Week: 1

## Context

InspectStack supports single-company and multi-tenant SaaS deployments from one codebase. Cross-tenant data exposure is a never-cut failure. Operators self-host; tenancy cannot depend on a vendor-specific RLS product.

## Decision

Every tenant-owned table carries `organization_id`. The active organization is resolved from an authenticated membership (session + membership row), never from an untrusted request body alone.

Tenant scope is enforced in repository functions in `packages/db`, not only in UI or route handlers. Unique indexes include `organization_id` where the natural key is per-tenant (template slug, asset external id, inspection number).

Storage object keys are prefixed by organization. Signed URL issuance validates ownership first.

Super-admin impersonation requires a written reason and an append-only audit event visible to the operator.

SaaS vs single-company is a deployment/plan flag (`APP_MODE` + plan limits), not a second schema.

## Consequences

- Cross-tenant negative tests are required on every sensitive read/write (Week 2 gate).
- Client-supplied `organizationId` in a body is ignored unless it matches the resolved membership.
- Public report links resolve tenant via the token’s stored org, then still scope queries.
- Cannot “just query by id” in handlers.

## Alternatives rejected

- Postgres RLS as the only control: portable Docker deployments may not operate RLS well; we still may add RLS later as defense in depth, never as the sole check.
- Separate database per tenant in v1: operationally too heavy for a self-hosted template.
- Path-param org without membership check: trivial to swap.
