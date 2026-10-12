import { redirect } from "next/navigation";
import {
  DeniedState,
  EmptyState,
  Input,
  Label,
  Notice,
  PageHeader,
  Panel,
  Select,
  StatusStamp,
  SubmitButton,
} from "@inspectstack/ui";
import { TicketLink } from "@/components/action-link";
import {
  listJobsForRule,
  listOrgMembers,
  listPublishedTemplateVersions,
  listScheduleRules,
  listSitesTree,
} from "@inspectstack/db";
import {
  SCHEDULE_FREQUENCIES,
  WEEKDAY_LABELS,
  canInspect,
  canManageSchedules,
  isFeatureEnabled,
  compareLocalDate,
  formatLocalDate,
  localDateInZone,
  parseLocalDate,
} from "@inspectstack/domain";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  createScheduleRuleAction,
  pauseScheduleRuleAction,
  runDueJobsAction,
} from "@/lib/actions/schedules";
import { dueStamp, siteErrorMessage } from "@/lib/ops-copy";

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    paused?: string;
    resumed?: string;
    ran?: string;
    made?: string;
    duplicates?: string;
    failed?: string;
  }>;
}) {
  const session = await requireSession();
  if (!session.ok) redirect("/login");
  if (!isFeatureEnabled(session.session.active.featureFlags, "schedules")) {
    return <DeniedState>Schedules are off for this workspace.</DeniedState>;
  }
  if (!canManageSchedules(session.session.active.role)) {
    return <DeniedState>Only owners and admins can manage recurring schedules.</DeniedState>;
  }
  const query = await searchParams;
  const db = getDb();
  const org = { organizationId: session.session.active.organizationId };
  const [rules, tree, templates, members] = await Promise.all([
    listScheduleRules(db, org),
    listSitesTree(db, org),
    listPublishedTemplateVersions(db, org),
    listOrgMembers(db, org),
  ]);
  const rulesWithJobs = await Promise.all(
    rules.map(async (row) => ({
      ...row,
      jobs: await listJobsForRule(db, org, row.rule.id),
    })),
  );
  const inspectors = members.filter((member) => canInspect(member.role));
  const tz = session.session.active.timezone;
  const now = new Date();
  const today = formatLocalDate(localDateInZone(now, tz));
  const error = siteErrorMessage(query.error);

  return (
    <section>
      <PageHeader
        title="Schedules"
        description={`Recurring rules use ${tz}. Each local date creates one assignment, even if the job runs twice.`}
        actions={
          <form action={runDueJobsAction}>
            <SubmitButton variant="primary" busyLabel="Running…">
              Run due jobs
            </SubmitButton>
          </form>
        }
      />
      {error ? <Notice tone="fail">{error}</Notice> : null}
      {query.saved ? (
        <Notice tone="pass">Schedule saved. Next run is the next local date.</Notice>
      ) : null}
      {query.paused ? <Notice>Schedule paused.</Notice> : null}
      {query.resumed ? <Notice tone="pass">Schedule resumed.</Notice> : null}
      {query.ran ? (
        <Notice tone="pass">
          {`Created ${query.made ?? "0"} assignment${query.made === "1" ? "" : "s"}. ${query.duplicates ?? "0"} already existed. ${query.failed ?? "0"} failed.`}
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {rulesWithJobs.length === 0 ? (
            <EmptyState title="No recurring rules">
              Add a weekly, monthly, every-n-days, or once rule. Timezone is copied from the
              workspace so a later timezone edit does not rewrite history.
            </EmptyState>
          ) : (
            <ul className="grid gap-3">
              {rulesWithJobs.map(({ rule, siteName, assetName, jobs }) => {
                const next = rule.nextRunLocalDate ? parseLocalDate(rule.nextRunLocalDate) : null;
                const todayLocal = localDateInZone(now, rule.timeZone);
                const due = !next
                  ? "upcoming"
                  : compareLocalDate(next, todayLocal) < 0
                    ? "overdue"
                    : compareLocalDate(next, todayLocal) === 0
                      ? "due_today"
                      : "upcoming";
                const stamp = rule.pausedAt
                  ? { label: "Paused", tone: "muted" as const }
                  : dueStamp(due);
                return (
                  <li key={rule.id}>
                    <article className="surface ticket-rail p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-mono text-micro uppercase tracking-id text-muted">
                          {rule.frequency.replaceAll("_", " ")}
                        </p>
                        {stamp ? <StatusStamp tone={stamp.tone}>{stamp.label}</StatusStamp> : null}
                      </div>
                      <h2 className="mt-2 font-display text-title">{rule.name}</h2>
                      <p className="mt-2 text-ui text-muted">
                        {siteName ?? "No site"}
                        {assetName ? ` · ${assetName}` : ""}
                        {` · next ${rule.nextRunLocalDate ?? "—"} ${String(rule.localHour).padStart(2, "0")}:${String(rule.localMinute).padStart(2, "0")} ${rule.timeZone}`}
                      </p>
                      <form action={pauseScheduleRuleAction} className="mt-3">
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <input type="hidden" name="pause" value={rule.pausedAt ? "0" : "1"} />
                        <SubmitButton size="sm" busyLabel="Saving…">
                          {rule.pausedAt ? "Resume" : "Pause"}
                        </SubmitButton>
                      </form>
                      {jobs.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {jobs.slice(0, 5).map(({ job, inspectionNumber }) => (
                            <li key={job.id}>
                              {inspectionNumber && job.inspectionId ? (
                                <TicketLink
                                  href={`/app/inspections/${job.inspectionId}`}
                                  number={inspectionNumber}
                                  title={`${job.localDate} · ${job.status}`}
                                  stamp={job.status}
                                  tone={job.status === "created" ? "pass" : "queued"}
                                  meta={job.localDate}
                                />
                              ) : (
                                <p className="text-ui text-muted">
                                  {job.localDate} · {job.status}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-ui text-muted">
                          No queued jobs yet. Today is {today}.
                        </p>
                      )}
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <aside>
          <Panel>
            <h2 className="font-display text-title">New rule</h2>
            <form action={createScheduleRuleAction} className="mt-3 space-y-3">
              <Label>
                Name
                <Input name="name" required placeholder="Weekly Property Condition" />
              </Label>
              <Label>
                Frequency
                <Select name="frequency" defaultValue="weekly">
                  {SCHEDULE_FREQUENCIES.map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                Weekday
                <Select name="weekday" defaultValue="5">
                  {WEEKDAY_LABELS.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Label>
                  Hour
                  <Input name="localHour" type="number" min={0} max={23} defaultValue={17} />
                </Label>
                <Label>
                  Minute
                  <Input name="localMinute" type="number" min={0} max={59} defaultValue={0} />
                </Label>
              </div>
              <Label>
                Day of month
                <Input name="dayOfMonth" type="number" min={1} max={31} placeholder="For monthly" />
              </Label>
              <Label>
                Every n days
                <Input name="intervalDays" type="number" min={1} placeholder="For every n days" />
              </Label>
              <Label>
                Once on
                <Input name="onceLocalDate" type="date" />
              </Label>
              <Label>
                Template
                <Select
                  name="templateVersionId"
                  required
                  defaultValue={templates[0]?.versionId ?? ""}
                >
                  {templates.map((row) => (
                    <option key={row.versionId} value={row.versionId}>
                      {row.templateName} v{row.version}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                Site
                <Select name="siteId" defaultValue="">
                  <option value="">None</option>
                  {tree.sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                Asset
                <Select name="assetId" defaultValue="">
                  <option value="">None</option>
                  {tree.assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                Inspector
                <Select name="assignedToUserId" defaultValue="">
                  <option value="">Unassigned</option>
                  {inspectors.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.displayName}
                    </option>
                  ))}
                </Select>
              </Label>
              <SubmitButton variant="primary" className="w-full" busyLabel="Saving…">
                Save rule
              </SubmitButton>
            </form>
          </Panel>
        </aside>
      </div>
    </section>
  );
}
