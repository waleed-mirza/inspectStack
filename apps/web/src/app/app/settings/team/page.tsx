import { redirect } from "next/navigation";
import {
  Input,
  Label,
  DeniedState,
  EmptyState,
  StatusStamp,
  PageHeader,
  Panel,
  Notice,
  Select,
  SubmitButton,
} from "@inspectstack/ui";
import { MEMBERSHIP_ROLES, canInvite, canManageWorkspace } from "@inspectstack/domain";
import { listInvitations, listOrgMembers } from "@inspectstack/db";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  changeMemberRoleAction,
  inviteMember,
  setMemberStatusAction,
} from "@/lib/actions/workspace";
import { SettingsNav } from "@/components/settings-nav";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!canInvite(session.session.active.role)) {
    return <DeniedState>Only owners and admins can send invites.</DeniedState>;
  }
  const params = await searchParams;
  const org = { organizationId: session.session.active.organizationId };
  const db = getDb();
  const [members, invites] = await Promise.all([listOrgMembers(db, org), listInvitations(db, org)]);
  const manage = canManageWorkspace(session.session.active.role);

  const error =
    params.error === "invalid"
      ? "Check the email and role, then try again."
      : params.error === "limit"
        ? "This plan is at its people cap."
        : params.error === "role"
          ? "That role change would leave the workspace without an owner."
          : params.error
            ? "Check the fields and try again."
            : null;

  return (
    <section className="max-w-[36rem] space-y-8">
      <PageHeader
        title="Team"
        description="Invites use the linked project mailbox. Failure does not block the owner from inspecting."
      />
      <SettingsNav />
      {params.sent ? (
        <Notice tone="pass">
          Invite recorded. Email is sent when the project mailbox allows it.
        </Notice>
      ) : null}
      {error ? <Notice tone="fail">{error}</Notice> : null}
      <form action={inviteMember} className="surface space-y-3 p-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Select id="role" name="role" defaultValue="inspector">
            {MEMBERSHIP_ROLES.filter((role) => role !== "owner").map((role) => (
              <option key={role} value={role}>
                {role.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </div>
        <SubmitButton variant="primary" busyLabel="Sending invite…">
          Send invite
        </SubmitButton>
      </form>
      <div>
        <h2 className="font-display text-title">Members</h2>
        <ul className="mt-3 space-y-2">
          {members.map((member) => (
            <li key={member.userId}>
              <Panel className="space-y-2 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {member.displayName}
                    <span className="ml-2 font-mono text-micro text-muted">{member.email}</span>
                  </span>
                  <StatusStamp tone={member.status === "suspended" ? "fail" : "ink"}>
                    {member.status === "suspended" ? "Suspended" : member.role.replaceAll("_", " ")}
                  </StatusStamp>
                </div>
                {manage && member.userId !== session.session.user.id ? (
                  <div className="flex flex-wrap gap-2">
                    <form action={changeMemberRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={member.userId} />
                      <Select
                        name="role"
                        defaultValue={member.role}
                        className="mt-0 h-8 w-auto min-w-36"
                      >
                        {MEMBERSHIP_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role.replaceAll("_", " ")}
                          </option>
                        ))}
                      </Select>
                      <SubmitButton size="sm" busyLabel="Saving…">
                        Role
                      </SubmitButton>
                    </form>
                    <form action={setMemberStatusAction}>
                      <input type="hidden" name="userId" value={member.userId} />
                      <input
                        type="hidden"
                        name="status"
                        value={member.status === "suspended" ? "active" : "suspended"}
                      />
                      <SubmitButton size="sm" busyLabel="Updating…">
                        {member.status === "suspended" ? "Restore" : "Suspend"}
                      </SubmitButton>
                    </form>
                  </div>
                ) : null}
              </Panel>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="font-display text-title">Pending invites</h2>
        {invites.length === 0 ? (
          <div className="mt-3">
            <EmptyState>No one invited yet. You can inspect alone.</EmptyState>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {invites.map((invite) => (
              <li key={invite.id}>
                <Panel className="px-3 py-2 text-ui">
                  {invite.email} · {invite.role.replaceAll("_", " ")}
                </Panel>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
