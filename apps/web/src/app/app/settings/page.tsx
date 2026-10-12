import { redirect } from "next/navigation";
import {
  Input,
  Label,
  DeniedState,
  LogoPlate,
  PageHeader,
  Panel,
  Select,
  SubmitButton,
  Textarea,
  Notice,
} from "@inspectstack/ui";
import { canManageWorkspace, parseWorkspaceBranding } from "@inspectstack/domain";
import { requireSession } from "@/lib/session";
import { resolveLogoSrc } from "@/lib/brand-logo";
import { SettingsNav } from "@/components/settings-nav";
import {
  clearWorkspaceLogo,
  saveWorkspaceBranding,
  saveWorkspaceIdentity,
  setWorkspaceMode,
  uploadWorkspaceLogo,
} from "@/lib/actions/workspace";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  const { active } = session.session;
  if (!canManageWorkspace(active.role)) {
    return <DeniedState>Owners and admins manage branding and mode.</DeniedState>;
  }
  const params = await searchParams;
  const branding = parseWorkspaceBranding(active.branding, active.organizationName);
  const logoSrc = await resolveLogoSrc(active.organizationId, branding);

  const error =
    params.error === "name"
      ? "Name the workspace before saving."
      : params.error === "logo"
        ? "Choose a PNG, JPEG, or WebP mark."
        : params.error === "logo_size"
          ? "That file is larger than 512 KB."
          : params.error === "logo_type" || params.error === "logo_mismatch"
            ? "Use a PNG, JPEG, or WebP mark."
            : params.error === "mode"
              ? "Pick a valid operating mode."
              : null;

  return (
    <section className="max-w-[36rem] space-y-8">
      <PageHeader
        title="Workspace"
        description="The mark, color, words, and footer apply to chrome, issued reports, and the public verification page."
      />
      <SettingsNav />
      {params.saved ? <Notice tone="pass">Workspace saved.</Notice> : null}
      {error ? <Notice tone="fail">{error}</Notice> : null}

      <Panel className="flex items-center gap-3">
        <LogoPlate name={active.organizationName} logoUrl={logoSrc} />
        <div>
          <p className="font-display text-title">{active.organizationName}</p>
          <p className="font-mono text-micro text-muted">{active.timezone}</p>
        </div>
      </Panel>

      <form action={saveWorkspaceIdentity} className="surface space-y-3 p-4">
        <div>
          <Label htmlFor="name">Workspace name</Label>
          <Input id="name" name="name" required defaultValue={active.organizationName} />
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" name="timezone" defaultValue={active.timezone} />
        </div>
        <SubmitButton variant="primary" busyLabel="Saving…">
          Save name
        </SubmitButton>
      </form>

      <form action={uploadWorkspaceLogo} className="surface space-y-3 p-4">
        <Label htmlFor="logo">Mark</Label>
        <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
        <p className="text-ui text-muted">
          PNG, JPEG, or WebP. Sits on ink so a light mark stays visible.
        </p>
        <div className="flex flex-wrap gap-2">
          <SubmitButton variant="primary" busyLabel="Uploading…">
            Upload mark
          </SubmitButton>
        </div>
      </form>
      {branding.logoUrl ? (
        <form action={clearWorkspaceLogo}>
          <SubmitButton busyLabel="Clearing…">Use initials instead</SubmitButton>
        </form>
      ) : null}

      <form action={saveWorkspaceBranding} className="surface space-y-4 p-4">
        <div>
          <Label htmlFor="primaryColor">Brand color</Label>
          <Input id="primaryColor" name="primaryColor" defaultValue={branding.primaryColor} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="termInspection">{branding.terminology.inspection} (word)</Label>
            <Input
              id="termInspection"
              name="termInspection"
              defaultValue={branding.terminology.inspection}
            />
          </div>
          <div>
            <Label htmlFor="termSite">{branding.terminology.site} (word)</Label>
            <Input id="termSite" name="termSite" defaultValue={branding.terminology.site} />
          </div>
          <div>
            <Label htmlFor="termAsset">{branding.terminology.asset} (word)</Label>
            <Input id="termAsset" name="termAsset" defaultValue={branding.terminology.asset} />
          </div>
          <div>
            <Label htmlFor="termFinding">{branding.terminology.finding} (word)</Label>
            <Input
              id="termFinding"
              name="termFinding"
              defaultValue={branding.terminology.finding}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="reportFromName">Report from</Label>
          <Input
            id="reportFromName"
            name="reportFromName"
            defaultValue={branding.reportIdentity.fromName}
          />
        </div>
        <div>
          <Label htmlFor="documentTitle">Report title</Label>
          <Input
            id="documentTitle"
            name="documentTitle"
            defaultValue={branding.reportIdentity.documentTitle}
          />
        </div>
        <div>
          <Label htmlFor="emailFromName">Invite from name</Label>
          <Input
            id="emailFromName"
            name="emailFromName"
            defaultValue={branding.emailIdentity.fromName}
          />
        </div>
        <div>
          <Label htmlFor="emailReplyTo">Reply-to</Label>
          <Input
            id="emailReplyTo"
            name="emailReplyTo"
            type="email"
            defaultValue={branding.emailIdentity.replyTo}
          />
        </div>
        <p className="text-ui text-muted">
          Invites still send from the linked project mailbox. The from name is recorded on the
          invite.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="dateFormat">Date format</Label>
            <Select id="dateFormat" name="dateFormat" defaultValue={branding.formats.date}>
              <option value="dmy">01 Sep 2026</option>
              <option value="mdy">09/01/2026</option>
              <option value="ymd">2026-09-01</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="paperSize">Paper</Label>
            <Select id="paperSize" name="paperSize" defaultValue={branding.formats.paper}>
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="inspectionPrefix">Job prefix</Label>
            <Input
              id="inspectionPrefix"
              name="inspectionPrefix"
              defaultValue={branding.formats.inspectionPrefix}
              maxLength={4}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="legalFooter">Legal footer</Label>
          <Textarea
            id="legalFooter"
            name="legalFooter"
            rows={3}
            defaultValue={branding.legalFooter}
          />
        </div>
        <SubmitButton variant="primary" busyLabel="Saving brand…">
          Save brand
        </SubmitButton>
      </form>

      <form action={setWorkspaceMode} className="surface space-y-3 p-4">
        <Label htmlFor="appMode">Operating mode</Label>
        <Select id="appMode" name="appMode" defaultValue={active.appMode}>
          <option value="single_company">Single company</option>
          <option value="saas">SaaS (multi-workspace)</option>
        </Select>
        <SubmitButton variant="primary" busyLabel="Saving…">
          Save mode
        </SubmitButton>
      </form>
    </section>
  );
}
