import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  DEFAULT_BRANDING,
  evidenceObjectKey,
  firstDueOnOrAfter,
  formatLocalDate,
  localDateInZone,
  localWeekday,
  parseTemplateSchema,
  starterPackByKey,
  type TemplateSchema,
  parseWorkspaceBranding,
  type WorkspaceBranding,
} from "@inspectstack/domain";
import { readServerEnv, requireSeedPassword } from "@inspectstack/config";
import { DEMO_PERSONAS, TENANT_A, TENANT_B } from "@inspectstack/testkit";
import { createDb, createSqlClient } from "./client";
import { createStorageAdapter } from "./storage";
import { approveInspection } from "./review";
import {
  assets,
  auditEvents,
  findingComments,
  findings,
  impersonationSessions,
  inspections,
  invitations,
  media,
  memberships,
  organizations,
  reportDownloads,
  reportShareLinks,
  reportSnapshots,
  responses,
  scheduleJobs,
  scheduleRules,
  sites,
  syncOperations,
  templateVersions,
  templates,
  users,
} from "./schema";

const DEMO_SLUGS = [TENANT_A.slug, TENANT_B.slug];
const DEMO_EMAILS = DEMO_PERSONAS.map((p) => p.email);
const reset = process.argv.includes("--reset");

function mintSeedQr(slug: string) {
  const compact = slug
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "X")
    .padEnd(8, "2")
    .slice(0, 8);
  return `ISQ-${compact}`;
}

const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

type AuthAdmin = {
  auth: {
    admin: {
      createUser: (args: {
        email: string;
        password: string;
        email_confirm: boolean;
        user_metadata: Record<string, string>;
      }) => Promise<{ data: { user: { id: string } | null }; error: Error | null }>;
      listUsers: (args: { page: number; perPage: number }) => Promise<{
        data: { users: Array<{ id: string; email?: string }> };
      }>;
      updateUserById: (
        id: string,
        args: { password: string; email_confirm: boolean },
      ) => Promise<unknown>;
      deleteUser: (id: string) => Promise<unknown>;
    };
  };
};

async function ensureAuthUser(
  admin: AuthAdmin,
  email: string,
  password: string,
  displayName: string,
) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (!error && created.user) return created.user.id;

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data.users.find((u) => u.email === email);
  if (!existing) {
    throw error ?? new Error(`Could not create or find ${email}`);
  }
  await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  return existing.id;
}

async function wipeDemo(db: ReturnType<typeof createDb>, admin: AuthAdmin) {
  const orgs = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(inArray(organizations.slug, [...DEMO_SLUGS]));
  const orgIds = orgs.map((o) => o.id);
  if (orgIds.length > 0) {
    await db
      .delete(impersonationSessions)
      .where(inArray(impersonationSessions.targetOrganizationId, orgIds));
    await db.delete(findingComments).where(inArray(findingComments.organizationId, orgIds));
    await db.delete(scheduleJobs).where(inArray(scheduleJobs.organizationId, orgIds));
    await db.delete(auditEvents).where(inArray(auditEvents.organizationId, orgIds));
    await db.delete(syncOperations).where(inArray(syncOperations.organizationId, orgIds));
    await db.delete(reportDownloads).where(inArray(reportDownloads.organizationId, orgIds));
    await db.delete(reportShareLinks).where(inArray(reportShareLinks.organizationId, orgIds));
    await db.delete(reportSnapshots).where(inArray(reportSnapshots.organizationId, orgIds));
    await db.delete(media).where(inArray(media.organizationId, orgIds));
    await db.delete(findings).where(inArray(findings.organizationId, orgIds));
    await db.delete(responses).where(inArray(responses.organizationId, orgIds));
    await db.delete(inspections).where(inArray(inspections.organizationId, orgIds));
    await db.delete(scheduleRules).where(inArray(scheduleRules.organizationId, orgIds));
    await db.delete(templateVersions).where(inArray(templateVersions.organizationId, orgIds));
    await db.delete(templates).where(inArray(templates.organizationId, orgIds));
    await db.delete(assets).where(inArray(assets.organizationId, orgIds));
    await db.delete(sites).where(inArray(sites.organizationId, orgIds));
    await db.delete(invitations).where(inArray(invitations.organizationId, orgIds));
    await db.delete(memberships).where(inArray(memberships.organizationId, orgIds));
    await db.delete(organizations).where(inArray(organizations.id, orgIds));
  }

  const profiles = await db
    .select()
    .from(users)
    .where(inArray(users.email, [...DEMO_EMAILS]));
  if (profiles.length > 0) {
    await db.delete(users).where(
      inArray(
        users.id,
        profiles.map((p) => p.id),
      ),
    );
  }
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  for (const user of listed.data.users) {
    if (user.email && DEMO_EMAILS.includes(user.email as (typeof DEMO_EMAILS)[number])) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
}

async function upsertOrg(
  db: ReturnType<typeof createDb>,
  input: {
    name: string;
    slug: string;
    timezone: string;
    primaryColor: string;
    planKey?: "single" | "agency" | "saas";
    legalFooter: string;
    inspectionPrefix: string;
  },
) {
  const branding: WorkspaceBranding = parseWorkspaceBranding(
    {
      ...DEFAULT_BRANDING,
      primaryColor: input.primaryColor,
      legalFooter: input.legalFooter,
      reportIdentity: { fromName: input.name, documentTitle: "Inspection report" },
      emailIdentity: { fromName: `${input.name} inspections`, replyTo: "" },
      formats: { date: "dmy", paper: "a4", inspectionPrefix: input.inspectionPrefix },
    },
    input.name,
  );
  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, input.slug))
    .limit(1);
  if (existing) {
    const [updated] = await db
      .update(organizations)
      .set({
        branding,
        planKey: input.planKey ?? existing.planKey,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, existing.id))
      .returning();
    return updated ?? existing;
  }
  const [created] = await db
    .insert(organizations)
    .values({
      name: input.name,
      slug: input.slug,
      timezone: input.timezone,
      branding,
      planKey: input.planKey ?? "single",
    })
    .returning();
  if (!created) throw new Error("org insert failed");
  return created;
}

async function seedWeek6Harbour(
  db: ReturnType<typeof createDb>,
  input: { orgId: string; timezone: string; inspectorId: string | null },
) {
  const [unit4] = await db
    .select()
    .from(sites)
    .where(and(eq(sites.organizationId, input.orgId), eq(sites.externalId, "harbour-12-u4")))
    .limit(1);
  const existingUnit = unit4
    ? unit4
    : (
        await db
          .select()
          .from(sites)
          .where(and(eq(sites.organizationId, input.orgId), eq(sites.externalId, "NPG-HARBOUR-4")))
          .limit(1)
      )[0];
  if (!existingUnit) return;

  let [harbour] = await db
    .select()
    .from(sites)
    .where(and(eq(sites.organizationId, input.orgId), eq(sites.externalId, "NPG-HARBOUR")))
    .limit(1);
  if (!harbour) {
    [harbour] = await db
      .insert(sites)
      .values({
        organizationId: input.orgId,
        name: "12 Harbour St",
        addressLine: "12 Harbour St",
        tags: ["harbour"],
        externalId: "NPG-HARBOUR",
      })
      .returning();
  }
  if (!harbour) return;

  const unitExternal =
    existingUnit.externalId === "NPG-HARBOUR-4" ? "NPG-HARBOUR-4" : existingUnit.externalId;
  const [takenHarbour4] = await db
    .select()
    .from(sites)
    .where(and(eq(sites.organizationId, input.orgId), eq(sites.externalId, "NPG-HARBOUR-4")))
    .limit(1);
  const nextExternal =
    unitExternal === "NPG-HARBOUR-4" || !takenHarbour4 || takenHarbour4.id === existingUnit.id
      ? "NPG-HARBOUR-4"
      : existingUnit.externalId;

  await db
    .update(sites)
    .set({
      name: "Unit 4",
      addressLine: "12 Harbour St / Unit 4",
      parentId: harbour.id,
      tags: ["harbour", "unit"],
      externalId: nextExternal,
      updatedAt: new Date(),
    })
    .where(and(eq(sites.id, existingUnit.id), eq(sites.organizationId, input.orgId)));

  for (const child of [
    { name: "Unit 9", externalId: "NPG-HARBOUR-9", tags: ["harbour", "unit"] },
    { name: "Common / meters", externalId: "NPG-HARBOUR-CMN", tags: ["harbour", "meters"] },
  ]) {
    const [hit] = await db
      .select()
      .from(sites)
      .where(and(eq(sites.organizationId, input.orgId), eq(sites.externalId, child.externalId)))
      .limit(1);
    if (hit) continue;
    await db.insert(sites).values({
      organizationId: input.orgId,
      parentId: harbour.id,
      name: child.name,
      addressLine: `12 Harbour St / ${child.name}`,
      tags: child.tags,
      externalId: child.externalId,
    });
  }

  const [smoke] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.organizationId, input.orgId), eq(assets.externalId, "smoke-living")))
    .limit(1);
  if (smoke) {
    await db
      .update(assets)
      .set({
        siteId: existingUnit.id,
        tags: ["life-safety"],
        qrToken: "ISQ-N4HRBR24",
        updatedAt: new Date(),
      })
      .where(and(eq(assets.id, smoke.id), eq(assets.organizationId, input.orgId)));
  }

  const [queuedFinding] = await db
    .select({ finding: findings })
    .from(findings)
    .innerJoin(inspections, eq(inspections.id, findings.inspectionId))
    .where(
      and(
        eq(findings.organizationId, input.orgId),
        eq(inspections.number, "NL-1003"),
        eq(findings.title, "Life-safety device failed"),
      ),
    )
    .limit(1);
  const finding = queuedFinding?.finding;
  if (finding) {
    const due = new Date();
    due.setUTCDate(due.getUTCDate() - 1);
    await db
      .update(findings)
      .set({
        dueAt: due,
        ownerUserId: input.inspectorId,
        status: "open",
        updatedAt: new Date(),
      })
      .where(and(eq(findings.id, finding.id), eq(findings.organizationId, input.orgId)));
    const [comment] = await db
      .select()
      .from(findingComments)
      .where(
        and(
          eq(findingComments.organizationId, input.orgId),
          eq(findingComments.findingId, finding.id),
        ),
      )
      .limit(1);
    if (!comment) {
      await db.insert(findingComments).values({
        organizationId: input.orgId,
        findingId: finding.id,
        authorUserId: input.inspectorId,
        body: "Dust cap still on. Tenant notified. Waiting on replacement.",
      });
    }
  }

  const [version] = await db
    .select({ version: templateVersions })
    .from(templateVersions)
    .innerJoin(templates, eq(templates.id, templateVersions.templateId))
    .where(
      and(
        eq(templateVersions.organizationId, input.orgId),
        eq(templates.slug, "property-condition"),
        eq(templateVersions.status, "published"),
      ),
    )
    .limit(1);
  const published = version?.version;
  if (!published) return;

  const [existingRule] = await db
    .select()
    .from(scheduleRules)
    .where(
      and(
        eq(scheduleRules.organizationId, input.orgId),
        eq(scheduleRules.name, "Weekly Property Condition"),
      ),
    )
    .limit(1);
  if (existingRule) return;

  const now = new Date();
  const today = localDateInZone(now, input.timezone);
  const weekday = localWeekday(today, input.timezone);
  const first = firstDueOnOrAfter(
    {
      frequency: "weekly",
      timeZone: input.timezone,
      localHour: 17,
      localMinute: 0,
      weekday,
    },
    today,
  );
  await db.insert(scheduleRules).values({
    organizationId: input.orgId,
    siteId: existingUnit.id,
    assetId: smoke?.id ?? null,
    templateVersionId: published.id,
    assignedToUserId: input.inspectorId,
    name: "Weekly Property Condition",
    frequency: "weekly",
    timeZone: input.timezone,
    localHour: 17,
    localMinute: 0,
    weekday,
    nextRunLocalDate: first ? formatLocalDate(first) : formatLocalDate(today),
  });
}

async function main() {
  const env = readServerEnv();
  const password = requireSeedPassword();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const db = createDb();
  const sql = createSqlClient();
  const week5Sql = readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../../supabase/migrations/20260831120000_week5_reports.sql",
    ),
    "utf8",
  );
  await sql.unsafe(week5Sql);
  const week6Sql = readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../../supabase/migrations/20260831180000_week6_ops.sql",
    ),
    "utf8",
  );
  await sql.unsafe(week6Sql);
  const week7Sql = readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../../supabase/migrations/20260831220000_week7_harden.sql",
    ),
    "utf8",
  );
  await sql.unsafe(week7Sql);
  const storage = createStorageAdapter(
    admin as unknown as import("@supabase/supabase-js").SupabaseClient,
  );

  if (reset) {
    await wipeDemo(db, admin as AuthAdmin);
  }

  const userIds = new Map<string, string>();
  for (const persona of DEMO_PERSONAS) {
    const id = await ensureAuthUser(
      admin as AuthAdmin,
      persona.email,
      password,
      persona.displayName,
    );
    userIds.set(persona.email, id);
    await db
      .insert(users)
      .values({
        id,
        email: persona.email,
        displayName: persona.displayName,
        isPlatformAdmin: persona.email === "owner@inspectstack.demo",
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: persona.email,
          displayName: persona.displayName,
          isPlatformAdmin: persona.email === "owner@inspectstack.demo",
        },
      });
  }

  const northline = await upsertOrg(db, {
    name: TENANT_A.name,
    slug: TENANT_A.slug,
    timezone: TENANT_A.timezone,
    primaryColor: "#215C45",
    legalFooter: "Northline Property Group — demo snapshot. Not a regulated certificate.",
    inspectionPrefix: "NL",
  });
  const westfield = await upsertOrg(db, {
    name: TENANT_B.name,
    slug: TENANT_B.slug,
    timezone: TENANT_B.timezone,
    primaryColor: "#1a3a5c",
    planKey: "agency",
    legalFooter: "Westfield Vehicle Checks — demo snapshot. Not a regulated certificate.",
    inspectionPrefix: "WV",
  });

  for (const persona of DEMO_PERSONAS) {
    const orgId = persona.orgSlug === TENANT_A.slug ? northline.id : westfield.id;
    const userId = userIds.get(persona.email);
    if (!userId) throw new Error("missing user");
    await db
      .insert(memberships)
      .values({
        organizationId: orgId,
        userId,
        role: persona.role,
        status: "active",
      })
      .onConflictDoUpdate({
        target: [memberships.organizationId, memberships.userId],
        set: { role: persona.role, status: "active" },
      });
  }

  async function seedVertical(input: {
    orgId: string;
    siteName: string;
    siteExternal: string;
    assetName: string;
    assetExternal: string;
    templateName: string;
    templateSlug: string;
    packKey: string;
    schema: TemplateSchema;
    inspectionNumber: string;
    assigneeEmail: string;
    findingTitle: string;
    findingFieldKey: string;
  }) {
    const [site] = await db
      .insert(sites)
      .values({
        organizationId: input.orgId,
        name: input.siteName,
        addressLine: input.siteName,
        externalId: input.siteExternal,
      })
      .onConflictDoNothing()
      .returning();
    const resolvedSite =
      site ??
      (
        await db
          .select()
          .from(sites)
          .where(
            and(eq(sites.organizationId, input.orgId), eq(sites.externalId, input.siteExternal)),
          )
          .limit(1)
      )[0];
    if (!resolvedSite) throw new Error("site missing");

    const [asset] = await db
      .insert(assets)
      .values({
        organizationId: input.orgId,
        siteId: resolvedSite.id,
        name: input.assetName,
        externalId: input.assetExternal,
        qrToken:
          input.assetExternal === "smoke-living" ? "ISQ-N4HRBR24" : mintSeedQr(input.assetExternal),
      })
      .onConflictDoNothing()
      .returning();
    const resolvedAsset =
      asset ??
      (
        await db
          .select()
          .from(assets)
          .where(
            and(eq(assets.organizationId, input.orgId), eq(assets.externalId, input.assetExternal)),
          )
          .limit(1)
      )[0];
    if (!resolvedAsset) throw new Error("asset missing");
    if (
      resolvedAsset.qrToken !==
      (input.assetExternal === "smoke-living" ? "ISQ-N4HRBR24" : mintSeedQr(input.assetExternal))
    ) {
      const token =
        input.assetExternal === "smoke-living" ? "ISQ-N4HRBR24" : mintSeedQr(input.assetExternal);
      await db
        .update(assets)
        .set({ qrToken: token })
        .where(and(eq(assets.id, resolvedAsset.id), eq(assets.organizationId, input.orgId)));
      resolvedAsset.qrToken = token;
    }

    const [template] = await db
      .insert(templates)
      .values({
        organizationId: input.orgId,
        name: input.templateName,
        slug: input.templateSlug,
        packKey: input.packKey,
      })
      .onConflictDoNothing()
      .returning();
    const resolvedTemplate =
      template ??
      (
        await db
          .select()
          .from(templates)
          .where(
            and(eq(templates.organizationId, input.orgId), eq(templates.slug, input.templateSlug)),
          )
          .limit(1)
      )[0];
    if (!resolvedTemplate) throw new Error("template missing");

    const [version] = await db
      .insert(templateVersions)
      .values({
        organizationId: input.orgId,
        templateId: resolvedTemplate.id,
        version: 1,
        status: "published",
        publishedAt: new Date(),
        schema: input.schema,
      })
      .onConflictDoNothing()
      .returning();
    const resolvedVersion =
      version ??
      (
        await db
          .select()
          .from(templateVersions)
          .where(
            and(
              eq(templateVersions.templateId, resolvedTemplate.id),
              eq(templateVersions.version, 1),
            ),
          )
          .limit(1)
      )[0];
    if (!resolvedVersion) throw new Error("version missing");

    const assignee = userIds.get(input.assigneeEmail);
    const [inspection] = await db
      .insert(inspections)
      .values({
        organizationId: input.orgId,
        templateVersionId: resolvedVersion.id,
        siteId: resolvedSite.id,
        assetId: resolvedAsset.id,
        assignedToUserId: assignee,
        status: "in_progress",
        number: input.inspectionNumber,
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        startedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    const resolvedInspection =
      inspection ??
      (
        await db
          .select()
          .from(inspections)
          .where(
            and(
              eq(inspections.organizationId, input.orgId),
              eq(inspections.number, input.inspectionNumber),
            ),
          )
          .limit(1)
      )[0];
    if (!resolvedInspection) throw new Error("inspection missing");

    await db
      .insert(responses)
      .values({
        organizationId: input.orgId,
        inspectionId: resolvedInspection.id,
        fieldKey: input.findingFieldKey,
        value: { result: "fail" },
      })
      .onConflictDoNothing();

    const [finding] = await db
      .insert(findings)
      .values({
        organizationId: input.orgId,
        inspectionId: resolvedInspection.id,
        fieldKey: input.findingFieldKey,
        title: input.findingTitle,
        severity: "high",
        status: "open",
        notes: "Captured during seed so the dashboard is not empty.",
      })
      .returning();

    const mediaId = randomUUID();
    const key = evidenceObjectKey({
      organizationId: input.orgId,
      inspectionId: resolvedInspection.id,
      mediaId,
      random: randomBytes(8).toString("hex"),
      ext: "png",
    });
    await storage.put(input.orgId, key, PIXEL_PNG, "image/png");
    await db.insert(media).values({
      id: mediaId,
      organizationId: input.orgId,
      inspectionId: resolvedInspection.id,
      findingId: finding?.id,
      fieldKey: "smoke_photo",
      storageKey: key,
      contentType: "image/png",
      byteSize: PIXEL_PNG.byteLength,
      contentHash: createHash("sha256").update(PIXEL_PNG).digest("hex"),
      caption: "Seed evidence",
      capturedAt: new Date(),
    });

    await db.insert(auditEvents).values({
      organizationId: input.orgId,
      actorUserId: assignee ?? null,
      action: "seed.inspection",
      entityType: "inspection",
      entityId: resolvedInspection.id,
      metadata: { source: "week2-seed" },
    });
  }

  const propertyPack = starterPackByKey("property-condition");
  const vehiclePack = starterPackByKey("vehicle");
  const constructionPack = starterPackByKey("construction");
  const safetyPack = starterPackByKey("workplace-safety");
  if (!propertyPack || !vehiclePack || !constructionPack || !safetyPack) {
    throw new Error("starter packs missing");
  }

  await seedVertical({
    orgId: northline.id,
    siteName: "12 Harbour St / Unit 4",
    siteExternal: "harbour-12-u4",
    assetName: "Living smoke alarm",
    assetExternal: "smoke-living",
    templateName: propertyPack.name,
    templateSlug: "property-condition",
    packKey: propertyPack.key,
    schema: parseTemplateSchema(propertyPack.schema),
    inspectionNumber: "NL-1001",
    assigneeEmail: "inspector@inspectstack.demo",
    findingTitle: "Life-safety device failed",
    findingFieldKey: "smoke_alarm",
  });

  const [harbour] = await db
    .select()
    .from(inspections)
    .where(and(eq(inspections.organizationId, northline.id), eq(inspections.number, "NL-1001")))
    .limit(1);
  if (harbour) {
    const [existingReview] = await db
      .select()
      .from(inspections)
      .where(and(eq(inspections.organizationId, northline.id), eq(inspections.number, "NL-1002")))
      .limit(1);
    const reviewJob =
      existingReview ??
      (
        await db
          .insert(inspections)
          .values({
            organizationId: northline.id,
            templateVersionId: harbour.templateVersionId,
            siteId: harbour.siteId,
            assetId: harbour.assetId,
            assignedToUserId: harbour.assignedToUserId,
            status: "submitted",
            number: "NL-1002",
            startedAt: new Date(),
            submittedAt: new Date(),
            dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
          })
          .returning()
      )[0];
    if (reviewJob) {
      const answers: Array<{ fieldKey: string; value: unknown }> = [
        { fieldKey: "address", value: "12 Harbour St" },
        { fieldKey: "unit", value: "4B" },
        { fieldKey: "occupancy", value: "tenanted" },
        { fieldKey: "smoke_alarm", value: { result: "fail" } },
        { fieldKey: "locks", value: { result: "pass" } },
        { fieldKey: "co_alarm", value: { result: "pass" } },
        { fieldKey: "bedroom_name", value: "Bedroom 1" },
        { fieldKey: "bedroom_smoke", value: { result: "pass" } },
        { fieldKey: "inspector_sig", value: "Signed" },
        { fieldKey: "tenant_ack", value: true },
      ];
      for (const row of answers) {
        await db
          .insert(responses)
          .values({
            organizationId: northline.id,
            inspectionId: reviewJob.id,
            fieldKey: row.fieldKey,
            value: row.value,
          })
          .onConflictDoNothing();
      }
      const [reviewFinding] = await db
        .insert(findings)
        .values({
          organizationId: northline.id,
          inspectionId: reviewJob.id,
          fieldKey: "smoke_alarm",
          title: "Life-safety device failed",
          severity: "high",
          status: "open",
          notes: "Dust cap still on. No chirp.",
        })
        .returning();
      const mediaId = randomUUID();
      const key = evidenceObjectKey({
        organizationId: northline.id,
        inspectionId: reviewJob.id,
        mediaId,
        random: randomBytes(8).toString("hex"),
        ext: "png",
      });
      await storage.put(northline.id, key, PIXEL_PNG, "image/png");
      await db.insert(media).values({
        id: mediaId,
        organizationId: northline.id,
        inspectionId: reviewJob.id,
        findingId: reviewFinding?.id,
        fieldKey: "smoke_photo",
        storageKey: key,
        contentType: "image/png",
        byteSize: PIXEL_PNG.byteLength,
        contentHash: createHash("sha256").update(PIXEL_PNG).digest("hex"),
        caption: "Detector with dust cap",
        capturedAt: new Date(),
      });
      const reviewerId = userIds.get("reviewer@inspectstack.demo");
      if (reviewerId && reviewJob.status === "submitted") {
        const branding = (northline.branding ?? DEFAULT_BRANDING) as WorkspaceBranding;
        const issued = await approveInspection(db, {
          organizationId: northline.id,
          inspectionId: reviewJob.id,
          actorUserId: reviewerId,
          actorName: "Jon Reviewer",
          role: "reviewer",
          orgName: northline.name,
          orgTimezone: northline.timezone,
          branding,
        });
        if (!issued.ok) {
          console.warn("Seed approve skipped:", issued.error, issued.message);
        }
      }

      const [existingQueue] = await db
        .select()
        .from(inspections)
        .where(and(eq(inspections.organizationId, northline.id), eq(inspections.number, "NL-1003")))
        .limit(1);
      if (!existingQueue) {
        const [queued] = await db
          .insert(inspections)
          .values({
            organizationId: northline.id,
            templateVersionId: harbour.templateVersionId,
            siteId: harbour.siteId,
            assetId: harbour.assetId,
            assignedToUserId: harbour.assignedToUserId,
            status: "submitted",
            number: "NL-1003",
            startedAt: new Date(),
            submittedAt: new Date(),
            dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
          })
          .returning();
        if (queued) {
          for (const row of answers) {
            await db.insert(responses).values({
              organizationId: northline.id,
              inspectionId: queued.id,
              fieldKey: row.fieldKey,
              value: row.value,
            });
          }
          const [queuedFinding] = await db
            .insert(findings)
            .values({
              organizationId: northline.id,
              inspectionId: queued.id,
              fieldKey: "smoke_alarm",
              title: "Life-safety device failed",
              severity: "high",
              status: "open",
              notes: "Queued for Jon. Dust cap still on.",
            })
            .returning();
          const queuedMediaId = randomUUID();
          const queuedKey = evidenceObjectKey({
            organizationId: northline.id,
            inspectionId: queued.id,
            mediaId: queuedMediaId,
            random: randomBytes(8).toString("hex"),
            ext: "png",
          });
          await storage.put(northline.id, queuedKey, PIXEL_PNG, "image/png");
          await db.insert(media).values({
            id: queuedMediaId,
            organizationId: northline.id,
            inspectionId: queued.id,
            findingId: queuedFinding?.id,
            fieldKey: "smoke_photo",
            storageKey: queuedKey,
            contentType: "image/png",
            byteSize: PIXEL_PNG.byteLength,
            contentHash: createHash("sha256").update(PIXEL_PNG).digest("hex"),
            caption: "Detector with dust cap",
            capturedAt: new Date(),
          });
        }
      }
    }
  }

  await seedVertical({
    orgId: westfield.id,
    siteName: "Depot A",
    siteExternal: "depot-a",
    assetName: "Van 14",
    assetExternal: "van-14",
    templateName: vehiclePack.name,
    templateSlug: "vehicle-inspection",
    packKey: vehiclePack.key,
    schema: parseTemplateSchema(vehiclePack.schema),
    inspectionNumber: "WV-2001",
    assigneeEmail: "westfield.owner@inspectstack.demo",
    findingTitle: "Tyre tread",
    findingFieldKey: "tyres",
  });

  async function seedPackTemplate(
    orgId: string,
    pack: { name: string; key: string; schema: TemplateSchema },
    slug: string,
  ) {
    const parsed = parseTemplateSchema(pack.schema);
    const [template] = await db
      .insert(templates)
      .values({
        organizationId: orgId,
        name: pack.name,
        slug,
        packKey: pack.key,
      })
      .onConflictDoNothing()
      .returning();
    const resolvedTemplate =
      template ??
      (
        await db
          .select()
          .from(templates)
          .where(and(eq(templates.organizationId, orgId), eq(templates.slug, slug)))
          .limit(1)
      )[0];
    if (!resolvedTemplate) throw new Error("pack template missing");
    await db
      .insert(templateVersions)
      .values({
        organizationId: orgId,
        templateId: resolvedTemplate.id,
        version: 1,
        status: "published",
        publishedAt: new Date(),
        schema: parsed,
      })
      .onConflictDoNothing();
  }

  await seedPackTemplate(northline.id, constructionPack, "construction-site");
  await seedPackTemplate(northline.id, safetyPack, "workplace-safety");

  const [liveSnapshot] = await db
    .select()
    .from(reportSnapshots)
    .where(and(eq(reportSnapshots.organizationId, northline.id), isNull(reportSnapshots.revokedAt)))
    .limit(1);
  if (!liveSnapshot) {
    const [anySnapshot] = await db
      .select()
      .from(reportSnapshots)
      .where(eq(reportSnapshots.organizationId, northline.id))
      .limit(1);
    if (anySnapshot) {
      await db
        .update(reportSnapshots)
        .set({ revokedAt: null })
        .where(eq(reportSnapshots.id, anySnapshot.id));
      console.log("Re-opened seed snapshot for verify:", anySnapshot.verificationCode);
    }
  }

  await seedWeek6Harbour(db, {
    orgId: northline.id,
    timezone: northline.timezone,
    inspectorId: userIds.get("inspector@inspectstack.demo") ?? null,
  });

  await sql.end({ timeout: 1 });
  console.log("Seed complete.");
  console.log(
    "Personas: owner@inspectstack.demo, inspector@inspectstack.demo, reviewer@inspectstack.demo, client@inspectstack.demo, westfield.owner@inspectstack.demo",
  );
  console.log("Password: SEED_PASSWORD from .env.local");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
