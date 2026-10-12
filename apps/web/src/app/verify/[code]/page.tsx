import { PublicReportView, ReportUnavailable } from "@/components/report/public-report";
import { consumeRateLimit, getPublicReportByCode } from "@inspectstack/db";
import { getDb } from "@/lib/db";
import { requestClientIp } from "@/lib/client-ip";
import { resolveLogoSrc } from "@/lib/brand-logo";
import { parseWorkspaceBranding } from "@inspectstack/domain";

export const dynamic = "force-dynamic";

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ip = await requestClientIp();
  const limited = await consumeRateLimit(getDb(), {
    kind: "verify",
    material: `verify:${ip}`,
  });
  if (!limited.ok) return <ReportUnavailable />;
  const result = await getPublicReportByCode(getDb(), decodeURIComponent(code));
  if (!result.ok) return <ReportUnavailable />;
  const branding = parseWorkspaceBranding(
    result.canonical.organization.branding,
    result.canonical.organization.name,
  );
  const logoSrc = await resolveLogoSrc(result.snapshot.organizationId, branding);

  return (
    <main>
      <PublicReportView
        canonical={result.canonical}
        verificationCode={result.snapshot.verificationCode}
        issuedAt={result.snapshot.issuedAt.toISOString()}
        downloadHref={`/verify/${result.snapshot.verificationCode}/pdf`}
        logoSrc={logoSrc}
      />
    </main>
  );
}
