import type { MembershipRole } from "@inspectstack/domain";

export const DEMO_PERSONAS = [
  {
    email: "owner@inspectstack.demo",
    displayName: "Amina Owner",
    role: "owner" as MembershipRole,
    orgSlug: "northline-property",
  },
  {
    email: "inspector@inspectstack.demo",
    displayName: "Maya Inspector",
    role: "inspector" as MembershipRole,
    orgSlug: "northline-property",
  },
  {
    email: "reviewer@inspectstack.demo",
    displayName: "Jon Reviewer",
    role: "reviewer" as MembershipRole,
    orgSlug: "northline-property",
  },
  {
    email: "client@inspectstack.demo",
    displayName: "Priya Client",
    role: "client_viewer" as MembershipRole,
    orgSlug: "northline-property",
  },
  {
    email: "westfield.owner@inspectstack.demo",
    displayName: "Chris Westfield",
    role: "owner" as MembershipRole,
    orgSlug: "westfield-vehicle",
  },
] as const;

export const TENANT_A = {
  slug: "northline-property",
  name: "Northline Property Group",
  timezone: "Australia/Sydney",
  packKey: "property-condition",
} as const;

export const TENANT_B = {
  slug: "westfield-vehicle",
  name: "Westfield Vehicle Checks",
  timezone: "Australia/Sydney",
  packKey: "vehicle",
} as const;

export function assertSameTenant(row: { organizationId: string }, organizationId: string): void {
  if (row.organizationId !== organizationId) {
    throw new Error("Cross-tenant row leaked into a scoped result");
  }
}
