import { ActionLink } from "@/components/action-link";
import { SkipLink } from "@/components/skip-link";
import { APP_VERSION, FIRST_MAINTENANCE_DATE, PROJECT } from "@inspectstack/domain";
import { LogoPlate, Panel, StatusStamp } from "@inspectstack/ui";

const FRAMES = [
  {
    src: "/listing/01-outcome.png",
    alt: "Jobs list with a failed smoke-alarm ticket on Northline.",
  },
  {
    src: "/listing/03-runner-offline.png",
    alt: "Phone-width field runner while the job is offline.",
  },
  {
    src: "/listing/05-report.png",
    alt: "Branded property-condition PDF cover.",
  },
  {
    src: "/listing/05-verify.png",
    alt: "Public verification page for an issued report.",
  },
  {
    src: "/listing/07-white-label.png",
    alt: "Workspace brand settings with a custom color.",
  },
  {
    src: "/listing/09-starter-packs.png",
    alt: "Four starter packs on the template library.",
  },
] as const;

const ARCHIVE_PREVIEW = `inspectstack/
├─ apps/web/              Next.js PWA
├─ packages/              domain, UI, and PDF code
├─ supabase/migrations/   schema and seed data
├─ docs/                  Quick Start and deploy notes
├─ .env.example
├─ LICENSE                MIT
└─ THIRD_PARTY_NOTICES.md`;

const SETUP_PREVIEW = `clone → .env.local → pnpm install
pnpm db:push → pnpm db:reset
pnpm dev`;

const FAQ = [
  {
    q: "Does it need paid APIs?",
    a: "No. Local development and the core product work without paid AI, OCR, maps, SMS, or HTML-to-PDF.",
  },
  {
    q: "Is it a native iOS or Android app?",
    a: "No. v1 is an installable, offline-capable PWA. Native wrappers are later.",
  },
  {
    q: "Can I use this in a commercial product?",
    a: "Yes. MIT lets you use, modify, and distribute the source, including in a product you sell, if you keep the copyright and license notice. The InspectStack name is not a trademark grant.",
  },
  {
    q: "Will it install in 20 minutes?",
    a: "The documented path is clone, env, seed, then jobs. That is the target, not a guarantee on every network. Follow docs/quick-start.md.",
  },
  {
    q: "Does offline survive a closed tab?",
    a: "Yes on the recovery gate, desktop and phone, one inspection. Production builds inject the service worker. next dev does not.",
  },
  {
    q: "Is it certified for my industry?",
    a: "Configurable audit, not legal certification. You own housing, construction, fleet, or WHS validation.",
  },
] as const;

export function StorefrontHome({ signedIn }: { signedIn: boolean }) {
  return (
    <>
      <SkipLink />
      <header className="border-b border-ink bg-ticket">
        <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-3">
          <a href="#main" className="flex items-center gap-2">
            <span aria-hidden>
              <LogoPlate name="InspectStack" />
            </span>
            <span className="font-display text-title">InspectStack</span>
          </a>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Project">
            <ActionLink href="#license">License</ActionLink>
            <ActionLink href={signedIn ? "/app" : "#walkthrough"} variant="secondary">
              {signedIn ? "Open workspace" : "See the walkthrough"}
            </ActionLink>
            <ActionLink href={PROJECT.repositoryUrl} variant="primary">
              View source
            </ActionLink>
          </nav>
        </div>
      </header>

      <main id="main" className="page-shell py-10 sm:py-16">
        <p className="font-mono text-micro uppercase tracking-id text-muted">
          IS-1001 · open source
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="max-w-[40rem] font-display text-hero">
            Offline capture. Client-ready reports. Your brand on the cover.
          </h1>
          <StatusStamp tone="pass">MIT</StatusStamp>
        </div>
        <p className="mt-4 max-w-[40rem] text-body text-muted">
          Open-source field inspection software for property, vehicle, construction, and workplace
          safety. Clone it, apply your brand, and host it yourself. Not a generic form builder.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ActionLink href={PROJECT.repositoryUrl} variant="primary">
            View source
          </ActionLink>
          <ActionLink href={signedIn ? "/app" : "#walkthrough"}>
            {signedIn ? "Open workspace" : "See the walkthrough"}
          </ActionLink>
        </div>
        <p className="mt-3 max-w-[40rem] text-ui text-muted">
          Free under the MIT license. You install and host it.
        </p>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <Panel className="ticket-rail">
            <p className="font-mono text-micro uppercase tracking-id text-muted">NL-1001</p>
            <h2 className="mt-1 font-display text-title">12 Harbour St / Unit 4</h2>
            <p className="mt-2 text-ui text-muted">
              Fail the smoke alarm, attach a photo, take a signature, reconnect. The branded PDF and
              public verify page are the product — not a field-type catalog.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusStamp tone="fail">Fail</StatusStamp>
              <StatusStamp tone="queued">Offline</StatusStamp>
              <StatusStamp tone="pass">Synced</StatusStamp>
            </div>
          </Panel>
          <Panel>
            <h2 className="font-display text-title">What you get</h2>
            <ul className="mt-3 space-y-2 text-ui text-muted">
              <li>App source plus four starter packs.</li>
              <li>
                Offline field runner with autosave, photos, annotation, signatures, sync queue.
              </li>
              <li>Review desk, findings, two branded PDF layouts, revocable verification.</li>
              <li>Sites, printable QR launch, recurring schedules, corrective follow-up.</li>
              <li>White-label settings, roles, plan rails, impersonation with a written reason.</li>
              <li>Quick Start, deploy notes, tests, seed/reset, support bundle.</li>
            </ul>
          </Panel>
        </section>

        <section id="walkthrough" className="mt-12 scroll-mt-6">
          <h2 className="font-display text-page">Watch the workflow, then open the demo</h2>
          <p className="mt-2 max-w-[40rem] text-body text-muted">
            Silent capture of the seeded demo. Voice-over is optional; the path is brand → fail a
            smoke alarm offline → annotated photo → signature → PDF + verify.
          </p>
          <video
            className="mt-4 w-full border border-ink bg-ink"
            controls
            playsInline
            preload="metadata"
            poster="/listing/01-outcome.png"
          >
            <source src="/listing/overview.webm" type="video/webm" />
            Overview video is not supported in this browser. Use the report preview and demo login
            below instead.
          </video>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FRAMES.map((frame) => (
              <li key={frame.src} className="surface">
                {/* Listing stills are local public files; next/image is not required. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={frame.src} alt={frame.alt} className="w-full" />
              </li>
            ))}
          </ul>
          <Panel className="ticket-rail mt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-micro uppercase tracking-id text-muted">Demo</p>
              <h3 className="mt-1 font-display text-title">Ready to inspect the workspace?</h3>
              <p className="mt-1 max-w-[40rem] text-ui text-muted">
                The next page has the seeded demo credentials. Start with Jobs, then open Reports to
                see the issued snapshot and public verification page.
              </p>
            </div>
            <ActionLink href={signedIn ? "/app" : "/login"} variant="secondary">
              {signedIn ? "Open workspace" : "Open demo login"}
            </ActionLink>
          </Panel>
        </section>

        <section id="repository" className="mt-12 scroll-mt-6">
          <h2 className="font-display text-page">What is in the repository</h2>
          <p className="mt-2 max-w-[40rem] text-body text-muted">
            This is the application source, not a hosted subscription. Clone the repository and
            follow Quick Start.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Panel className="ticket-rail min-w-0">
              <p className="font-mono text-micro uppercase tracking-id text-muted">Tree</p>
              <h3 className="mt-1 font-display text-title">Repository layout</h3>
              <pre className="mt-3 max-w-full overflow-x-auto border border-rule bg-paper p-3 font-mono text-micro leading-5 text-ink">
                {ARCHIVE_PREVIEW}
              </pre>
              <p className="mt-3 text-ui text-muted">
                App source, shared packages, migrations, setup files, the MIT license, and
                third-party notices.
              </p>
            </Panel>
            <Panel className="min-w-0">
              <p className="font-mono text-micro uppercase tracking-id text-muted">Setup</p>
              <h3 className="mt-1 font-display text-title">A visible path to first run</h3>
              <pre className="mt-3 max-w-full overflow-x-auto border border-rule bg-paper p-3 font-mono text-micro leading-5 text-ink">
                {SETUP_PREVIEW}
              </pre>
              <p className="mt-3 text-ui text-muted">
                Add the connection details for a Supabase project you control, then follow the Quick
                Start to seed the demo and issue a branded report.
              </p>
            </Panel>
            <Panel className="min-w-0">
              <p className="font-mono text-micro uppercase tracking-id text-muted">Hosting</p>
              <h3 className="mt-1 font-display text-title">You run the production instance</h3>
              <p className="mt-3 text-ui text-muted">
                Use your own Supabase project, deploy to your own Netlify or Vercel account, and
                keep control of your application and data.
              </p>
              <p className="mt-3 text-ui text-muted">
                The license section states the MIT grant. It does not include the InspectStack name
                as a trademark.
              </p>
            </Panel>
          </div>
        </section>

        <section id="license" className="mt-12 scroll-mt-6">
          <h2 className="font-display text-page">MIT license</h2>
          <p className="mt-2 max-w-[40rem] text-body text-muted">
            Copyright {PROJECT.copyrightYear} {PROJECT.copyrightHolder}. You may use, copy, modify,
            merge, publish, distribute, sublicense, and sell copies of this software.
          </p>
          <ul className="mt-6 grid gap-4 lg:grid-cols-3">
            <li>
              <Panel className="ticket-rail flex h-full flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-title">Use</h3>
                  <StatusStamp tone="pass">MIT</StatusStamp>
                </div>
                <p className="mt-3 text-ui text-muted">
                  Run it for one company, for clients, or as your own hosted product.
                </p>
              </Panel>
            </li>
            <li>
              <Panel className="ticket-rail flex h-full flex-col">
                <h3 className="font-display text-title">Change</h3>
                <p className="mt-3 text-ui text-muted">
                  Modify the source. Keep the copyright notice and this permission notice in copies
                  and substantial portions.
                </p>
              </Panel>
            </li>
            <li>
              <Panel className="ticket-rail flex h-full flex-col">
                <h3 className="font-display text-title">Share</h3>
                <p className="mt-3 text-ui text-muted">
                  Distribute the source or a product built from it. The software is provided as-is,
                  without warranty.
                </p>
                <ActionLink href={PROJECT.licenseUrl} className="mt-3" variant="secondary">
                  Read the license
                </ActionLink>
              </Panel>
            </li>
          </ul>
        </section>

        <section className="mt-12 grid gap-4 lg:grid-cols-3">
          <Panel>
            <h2 className="font-display text-title">What’s not included</h2>
            <ul className="mt-3 space-y-2 text-ui text-muted">
              <li>Native iOS or Android app-store builds. v1 is an installable PWA.</li>
              <li>AI, OCR, maps, SMS, or in-app billing.</li>
              <li>Done-for-you implementation, custom features, or data migration.</li>
              <li>Industry legal certification or compliance sign-off.</li>
            </ul>
          </Panel>
          <Panel>
            <h2 className="font-display text-title">What you host</h2>
            <p className="mt-3 text-ui text-muted">
              Bring your own Supabase project for Auth, Postgres, and Storage. Develop with Node.js
              24 LTS and pnpm, then deploy your own production instance to Netlify or Vercel.
            </p>
            <p className="mt-3 text-ui text-muted">
              You control and pay for your cloud, domain, and email accounts. No Docker setup is
              included; no paid APIs are required for the core product.
            </p>
          </Panel>
          <Panel>
            <h2 className="font-display text-title">Community</h2>
            <p className="mt-3 text-ui text-muted">
              Questions and defects go to GitHub issues. There is no paid support window and no
              license upgrade.
            </p>
            <ActionLink href={PROJECT.issuesUrl} className="mt-3" variant="secondary">
              Open an issue
            </ActionLink>
          </Panel>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-page">Questions</h2>
          <dl className="mt-4 grid gap-3">
            {FAQ.map((item) => (
              <div key={item.q} className="surface p-4">
                <dt className="font-display text-title">{item.q}</dt>
                <dd className="mt-2 text-ui text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-ink bg-ticket">
        <div className="page-shell flex flex-wrap items-start justify-between gap-4 py-6 text-ui text-muted">
          <p>
            {PROJECT.license} · © {PROJECT.copyrightYear} {PROJECT.copyrightHolder}
            <br />
            InspectStack v{APP_VERSION} · first maintenance hold {FIRST_MAINTENANCE_DATE} (defects
            only)
          </p>
          <p>
            <a href={PROJECT.changelogUrl}>Changelog</a>
            {" · "}
            <a href={PROJECT.licenseUrl}>License</a>
            {" · "}
            <a href={signedIn ? "/app" : "#walkthrough"}>
              {signedIn ? "Open workspace" : "See demo walkthrough"}
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
