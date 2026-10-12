import { redirect } from "next/navigation";
import { sendMagicLink, signInWithPassword } from "@/lib/actions/auth";
import { Input, Label, Notice, PageHeader, Panel, SubmitButton } from "@inspectstack/ui";
import { DEMO_PERSONAS } from "@inspectstack/testkit";
import { getSessionContext } from "@/lib/session";
import { SkipLink } from "@/components/skip-link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; next?: string }>;
}) {
  const params = await searchParams;
  const session = await getSessionContext();
  const next =
    typeof params.next === "string" &&
    params.next.startsWith("/app") &&
    !params.next.startsWith("//")
      ? params.next
      : null;
  if (session?.active) redirect(next ?? "/app");
  if (session && !session.active) redirect("/onboarding");

  const error =
    params.error === "credentials"
      ? "Email or password did not match."
      : params.error === "magic"
        ? "Magic link was not sent. Check the project's email settings."
        : params.error === "invalid"
          ? "Enter a valid email and a password of at least 8 characters."
          : params.error === "auth"
            ? "That sign-in link is invalid or expired."
            : params.error === "rate"
              ? "Too many sign-in tries. Wait a few minutes, then try again."
              : null;

  return (
    <>
      <SkipLink />
      <main id="main" className="mx-auto w-full max-w-[32rem] px-5 py-16">
        <PageHeader
          title="Open a workspace"
          description={
            <>
              Evaluator path: sign in as <code className="font-mono">owner@inspectstack.demo</code>{" "}
              with the <code className="font-mono">SEED_PASSWORD</code> value from{" "}
              <code className="font-mono">.env.local</code> (not the literal word SEED_PASSWORD).
              Then open Jobs and Reports.
            </>
          }
        />

        {error ? <Notice tone="fail">{error}</Notice> : null}
        {params.sent ? (
          <Notice tone="pass">Magic link sent if that mailbox exists on this project.</Notice>
        ) : null}

        <form action={signInWithPassword} className="mt-8 space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="username" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
            />
          </div>
          <SubmitButton variant="primary" className="w-full" busyLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>

        <form
          action={sendMagicLink}
          className="mt-8 space-y-3 border-t border-dashed border-ink pt-6"
        >
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <Label htmlFor="magic-email">Or send a magic link</Label>
          <Input id="magic-email" name="email" type="email" required />
          <SubmitButton className="w-full" busyLabel="Sending link…">
            Email a sign-in link
          </SubmitButton>
        </form>

        <section className="mt-10">
          <h2 className="font-display text-title">Demo personas</h2>
          <ul className="mt-3 space-y-2">
            {DEMO_PERSONAS.map((persona) => (
              <li key={persona.email}>
                <Panel className="px-3 py-2">
                  <span className="font-mono text-micro uppercase tracking-id text-muted">
                    {persona.role.replace("_", " ")}
                  </span>
                  <div className="text-body">{persona.displayName}</div>
                  <div className="font-mono text-micro">{persona.email}</div>
                </Panel>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
