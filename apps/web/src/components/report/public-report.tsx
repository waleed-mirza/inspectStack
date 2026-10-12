import { LogoPlate, PageHeader, Panel, StatusStamp } from "@inspectstack/ui";
import type { ReportCanonical } from "@inspectstack/domain";

export function PublicReportView({
  canonical,
  verificationCode,
  issuedAt,
  downloadHref,
  revoked,
  logoSrc,
}: {
  canonical: ReportCanonical;
  verificationCode: string;
  issuedAt: string;
  downloadHref?: string;
  revoked?: boolean;
  logoSrc?: string | null;
}) {
  const overall = canonical.summary.trafficLight;
  const brand = canonical.organization.branding.primaryColor || "#215C45";
  return (
    <article
      className="ticket-rail mx-auto w-full max-w-[40rem] px-5 py-10"
      style={{ ["--org-brand" as string]: brand, ["--brand" as string]: brand }}
    >
      <PageHeader
        kicker={
          <p className="font-mono text-micro uppercase tracking-id text-muted">
            {verificationCode}
          </p>
        }
        title={canonical.inspection.siteName ?? canonical.inspection.templateName}
        description={`${canonical.organization.name} · ${canonical.inspection.templateName} v${canonical.inspection.templateVersion}`}
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <LogoPlate name={canonical.organization.name} logoUrl={logoSrc ?? null} />
        <StatusStamp tone={overall === "fail" ? "fail" : overall === "pass" ? "pass" : "ink"}>
          {overall === "fail" ? "Fail" : overall === "pass" ? "Pass" : "Issued"}
        </StatusStamp>
        <StatusStamp tone="ink">{canonical.inspection.number}</StatusStamp>
      </div>
      {revoked ? (
        <Panel className="mb-6 border-fail text-fail">This report is no longer shared.</Panel>
      ) : null}
      <div className="mb-6 flex flex-wrap gap-2">
        <StatusStamp tone="pass">{`${canonical.summary.passCount} pass`}</StatusStamp>
        <StatusStamp tone="fail">{`${canonical.summary.failCount} fail`}</StatusStamp>
        <StatusStamp tone={canonical.summary.highFindingCount > 0 ? "fail" : "ink"}>
          {`${canonical.summary.findingCount} findings`}
        </StatusStamp>
      </div>
      <section className="mb-8">
        <h2 className="font-display text-title">Findings</h2>
        {canonical.findings.length === 0 ? (
          <p className="mt-2 text-ui text-muted">No findings recorded.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {canonical.findings.map((finding) => (
              <li key={finding.id}>
                <Panel>
                  <div className="flex items-start justify-between gap-2">
                    <strong>{finding.title}</strong>
                    <StatusStamp tone={finding.severity === "high" ? "fail" : "ink"}>
                      {finding.severity}
                    </StatusStamp>
                  </div>
                  {finding.notes ? <p className="mt-1 text-ui">{finding.notes}</p> : null}
                  <p className="mt-1 text-ui text-muted">
                    {finding.ownerName ?? "Unassigned"}
                    {finding.dueAt ? ` · due ${finding.dueAt.slice(0, 10)}` : ""}
                  </p>
                </Panel>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mb-8">
        <h2 className="font-display text-title">Sections</h2>
        {canonical.sections.map((section) => (
          <Panel key={section.id} className="mt-3">
            <h3 className="font-display text-title">{section.title}</h3>
            <dl className="mt-2 grid gap-1">
              {section.fields.map((field) => (
                <div
                  key={field.key}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 text-ui"
                >
                  <dt className="text-muted">{field.label}</dt>
                  <dd className={field.result === "fail" ? "text-fail" : undefined}>
                    {field.display}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        ))}
      </section>
      {canonical.media.length > 0 ? (
        <section className="mb-8">
          <h2 className="font-display text-title">Evidence</h2>
          <ul className="mt-3 space-y-2">
            {canonical.media.map((item) => (
              <li key={item.id} className="text-ui text-muted">
                {item.caption ?? item.fieldKey ?? "Photo"}
                {item.capturedAt ? ` · ${item.capturedAt.slice(0, 10)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="mb-8">
        <h2 className="font-display text-title">Signatures</h2>
        <ul className="mt-3 space-y-1 text-ui">
          {canonical.signatures.map((row) => (
            <li key={row.fieldKey}>
              {row.label}: {row.display}
            </li>
          ))}
        </ul>
      </section>
      {downloadHref ? (
        <p className="mb-6">
          <a
            className="inline-flex h-10 items-center border border-ink bg-ink px-3.5 text-ui text-ticket"
            href={downloadHref}
          >
            Download PDF
          </a>
        </p>
      ) : null}
      <p className="font-mono text-micro uppercase tracking-id text-muted">
        Issued {issuedAt.slice(0, 10)} · {verificationCode}
      </p>
      {canonical.legalFooter ? (
        <p className="mt-3 text-ui text-muted">{canonical.legalFooter}</p>
      ) : (
        <p className="mt-3 text-ui text-muted">
          This snapshot is bound to the published template version at issue.
        </p>
      )}
    </article>
  );
}

export function ReportUnavailable() {
  return (
    <main className="mx-auto w-full max-w-[32rem] px-5 py-16">
      <PageHeader title="This report is no longer shared" />
      <p className="text-body text-muted">
        The verification code is revoked, expired, or unknown. Nothing about the inspection is
        shown.
      </p>
    </main>
  );
}
