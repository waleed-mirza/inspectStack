import { redirect } from "next/navigation";
import { EmptyState, PageHeader, SubmitButton } from "@inspectstack/ui";
import { SkipLink } from "@/components/skip-link";
import { getSessionContext } from "@/lib/session";
import { signOut } from "@/lib/actions/auth";

export default async function OnboardingPage() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  if (session.active) redirect("/app");

  return (
    <>
      <SkipLink />
      <main id="main" className="mx-auto w-full max-w-[32rem] px-5 py-16">
        <PageHeader title="No workspace yet" />
        <EmptyState title="Waiting on membership">
          Signed in as <code className="font-mono">{session.user.email || "unknown"}</code>. This
          Auth user has no organization membership. Demo tickets belong to{" "}
          <code className="font-mono">owner@inspectstack.demo</code> (password{" "}
          <code className="font-mono">SEED_PASSWORD</code>), not a personal mailbox.
        </EmptyState>
        <form action={signOut} className="mt-6">
          <SubmitButton variant="primary" busyLabel="Signing out…">
            Sign out and use a demo persona
          </SubmitButton>
        </form>
      </main>
    </>
  );
}
