import { redirect } from "next/navigation";
import { DeniedState, EmptyState, PageHeader, StatusStamp } from "@inspectstack/ui";
import { canAccessPlatform } from "@inspectstack/domain";
import { listTenants } from "@inspectstack/db";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { TicketLink } from "@/components/action-link";

export default async function AdminTenantsPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canAccessPlatform(session.session.user.isPlatformAdmin)) {
    return <DeniedState>Only the platform operator can open tenants.</DeniedState>;
  }
  const tenants = await listTenants(getDb(), session.session.user.isPlatformAdmin);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Tenants"
        description="Plans, flags, usage, and support viewing. Every viewing session needs a written reason."
      />
      {tenants.length === 0 ? (
        <EmptyState>No workspaces on this project yet.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {tenants.map((tenant) => (
            <li key={tenant.id}>
              <TicketLink
                href={`/app/admin/${tenant.id}`}
                number={tenant.slug}
                title={tenant.name}
                meta={`${tenant.planKey} · ${tenant.timezone}`}
                stamp={tenant.planKey}
                tone="ink"
              />
            </li>
          ))}
        </ul>
      )}
      <p className="text-ui text-muted">
        <StatusStamp tone="muted">{`${tenants.length} workspaces`}</StatusStamp>
      </p>
    </section>
  );
}
