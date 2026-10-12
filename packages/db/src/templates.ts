import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  assertDraftMutable,
  findCircularRuleCycle,
  parseTemplateSchema,
  slugifyTemplateName,
  starterPackByKey,
  validateForPublish,
  type TemplateSchema,
} from "@inspectstack/domain";
import type { Database } from "./client";
import { inspections, templateVersions, templates } from "./schema";
import type { OrgScope } from "./repositories";

export type TemplateRecord = typeof templates.$inferSelect;
export type TemplateVersionRecord = typeof templateVersions.$inferSelect;

export type TemplateLibraryRow = TemplateRecord & {
  latestVersion: number | null;
  latestStatus: TemplateVersionRecord["status"] | null;
  latestVersionId: string | null;
  inspectionCount: number;
};

async function uniqueSlug(db: Database, organizationId: string, name: string, excludeId?: string) {
  const base = slugifyTemplateName(name);
  const rows = await db
    .select({ id: templates.id, slug: templates.slug })
    .from(templates)
    .where(eq(templates.organizationId, organizationId));
  const taken = new Set(rows.filter((row) => row.id !== excludeId).map((row) => row.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function getTemplate(db: Database, scope: OrgScope, templateId: string) {
  const [row] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.organizationId, scope.organizationId)))
    .limit(1);
  return row ?? null;
}

export async function getTemplateVersion(db: Database, scope: OrgScope, versionId: string) {
  const [row] = await db
    .select()
    .from(templateVersions)
    .where(
      and(
        eq(templateVersions.id, versionId),
        eq(templateVersions.organizationId, scope.organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listTemplateVersions(db: Database, scope: OrgScope, templateId: string) {
  return db
    .select()
    .from(templateVersions)
    .where(
      and(
        eq(templateVersions.templateId, templateId),
        eq(templateVersions.organizationId, scope.organizationId),
      ),
    )
    .orderBy(desc(templateVersions.version));
}

export async function listTemplateLibrary(
  db: Database,
  scope: OrgScope,
): Promise<TemplateLibraryRow[]> {
  const rows = await db
    .select()
    .from(templates)
    .where(eq(templates.organizationId, scope.organizationId))
    .orderBy(templates.name);
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const versions = await db
    .select()
    .from(templateVersions)
    .where(
      and(
        eq(templateVersions.organizationId, scope.organizationId),
        inArray(templateVersions.templateId, ids),
      ),
    )
    .orderBy(desc(templateVersions.version));

  const latestByTemplate = new Map<string, TemplateVersionRecord>();
  for (const version of versions) {
    if (!latestByTemplate.has(version.templateId))
      latestByTemplate.set(version.templateId, version);
  }

  const versionIds = versions.map((version) => version.id);
  const counts =
    versionIds.length === 0
      ? []
      : await db
          .select({
            templateVersionId: inspections.templateVersionId,
            n: sql<number>`count(*)::int`,
          })
          .from(inspections)
          .where(
            and(
              eq(inspections.organizationId, scope.organizationId),
              inArray(inspections.templateVersionId, versionIds),
            ),
          )
          .groupBy(inspections.templateVersionId);

  const countByVersion = new Map(counts.map((row) => [row.templateVersionId, Number(row.n)]));
  const countByTemplate = new Map<string, number>();
  for (const version of versions) {
    const n = countByVersion.get(version.id) ?? 0;
    countByTemplate.set(version.templateId, (countByTemplate.get(version.templateId) ?? 0) + n);
  }

  return rows.map((row) => {
    const latest = latestByTemplate.get(row.id);
    return {
      ...row,
      latestVersion: latest?.version ?? null,
      latestStatus: latest?.status ?? null,
      latestVersionId: latest?.id ?? null,
      inspectionCount: countByTemplate.get(row.id) ?? 0,
    };
  });
}

export async function listPublishedTemplateVersions(db: Database, scope: OrgScope) {
  return db
    .select({
      versionId: templateVersions.id,
      templateId: templates.id,
      templateName: templates.name,
      version: templateVersions.version,
      packKey: templates.packKey,
    })
    .from(templateVersions)
    .innerJoin(templates, eq(templates.id, templateVersions.templateId))
    .where(
      and(
        eq(templateVersions.organizationId, scope.organizationId),
        eq(templates.organizationId, scope.organizationId),
        eq(templateVersions.status, "published"),
        isNull(templates.archivedAt),
      ),
    )
    .orderBy(templates.name, desc(templateVersions.version));
}

export async function countInspectionsForVersion(db: Database, scope: OrgScope, versionId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(inspections)
    .where(
      and(
        eq(inspections.organizationId, scope.organizationId),
        eq(inspections.templateVersionId, versionId),
      ),
    );
  return Number(row?.n ?? 0);
}

async function insertTemplateWithVersion(
  db: Database,
  input: {
    organizationId: string;
    name: string;
    slug: string;
    packKey?: string | null;
    schema: TemplateSchema;
    status: "draft" | "published";
    createdByUserId: string;
  },
) {
  const [template] = await db
    .insert(templates)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      slug: input.slug,
      packKey: input.packKey ?? null,
    })
    .returning();
  if (!template) throw new Error("Could not create template");
  const [version] = await db
    .insert(templateVersions)
    .values({
      organizationId: input.organizationId,
      templateId: template.id,
      version: 1,
      status: input.status,
      schema: input.schema,
      publishedAt: input.status === "published" ? new Date() : null,
      createdByUserId: input.createdByUserId,
    })
    .returning();
  if (!version) throw new Error("Could not create template version");
  return { template, version };
}

export async function createBlankTemplate(
  db: Database,
  input: { organizationId: string; name: string; createdByUserId: string },
) {
  const name = input.name.trim();
  if (!name) throw new Error("Name a template before creating it.");
  const slug = await uniqueSlug(db, input.organizationId, name);
  return insertTemplateWithVersion(db, {
    organizationId: input.organizationId,
    name,
    slug,
    schema: parseTemplateSchema({}),
    status: "draft",
    createdByUserId: input.createdByUserId,
  });
}

export async function cloneStarterPack(
  db: Database,
  input: { organizationId: string; packKey: string; createdByUserId: string },
) {
  const pack = starterPackByKey(input.packKey);
  if (!pack) throw new Error("Unknown starter pack.");
  const slug = await uniqueSlug(db, input.organizationId, pack.name);
  return insertTemplateWithVersion(db, {
    organizationId: input.organizationId,
    name: pack.name,
    slug,
    packKey: pack.key,
    schema: parseTemplateSchema(pack.schema),
    status: "draft",
    createdByUserId: input.createdByUserId,
  });
}

export async function cloneTemplate(
  db: Database,
  input: { organizationId: string; templateId: string; createdByUserId: string },
) {
  const source = await getTemplate(db, { organizationId: input.organizationId }, input.templateId);
  if (!source) return null;
  const versions = await listTemplateVersions(
    db,
    { organizationId: input.organizationId },
    source.id,
  );
  const latest = versions[0];
  if (!latest) return null;
  const slug = await uniqueSlug(db, input.organizationId, `${source.name} copy`);
  return insertTemplateWithVersion(db, {
    organizationId: input.organizationId,
    name: `${source.name} copy`,
    slug,
    packKey: source.packKey,
    schema: parseTemplateSchema(latest.schema),
    status: "draft",
    createdByUserId: input.createdByUserId,
  });
}

export async function retireTemplate(db: Database, scope: OrgScope, templateId: string) {
  const [row] = await db
    .update(templates)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(templates.id, templateId), eq(templates.organizationId, scope.organizationId)))
    .returning();
  return row ?? null;
}

export async function renameTemplate(
  db: Database,
  scope: OrgScope,
  templateId: string,
  name: string,
) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Template needs a name.");
  const [row] = await db
    .update(templates)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(and(eq(templates.id, templateId), eq(templates.organizationId, scope.organizationId)))
    .returning();
  return row ?? null;
}

export async function saveDraftSchema(
  db: Database,
  input: { organizationId: string; versionId: string; schema: unknown },
) {
  const version = await getTemplateVersion(
    db,
    { organizationId: input.organizationId },
    input.versionId,
  );
  if (!version) return { ok: false as const, error: "Draft not found in this workspace." };
  try {
    assertDraftMutable(version.status);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Locked." };
  }
  const schema = parseTemplateSchema(input.schema);
  const cycle = findCircularRuleCycle(schema);
  if (cycle) {
    return { ok: false as const, error: `Circular rule blocked: ${cycle.join(" → ")}.` };
  }
  const [row] = await db
    .update(templateVersions)
    .set({ schema })
    .where(
      and(
        eq(templateVersions.id, version.id),
        eq(templateVersions.organizationId, input.organizationId),
        eq(templateVersions.status, "draft"),
      ),
    )
    .returning();
  if (!row)
    return {
      ok: false as const,
      error: "Published versions are locked. Edit a new draft instead.",
    };
  return { ok: true as const, version: row };
}

export async function ensureDraft(
  db: Database,
  input: { organizationId: string; templateId: string; createdByUserId: string },
) {
  const template = await getTemplate(
    db,
    { organizationId: input.organizationId },
    input.templateId,
  );
  if (!template) return null;
  const versions = await listTemplateVersions(
    db,
    { organizationId: input.organizationId },
    template.id,
  );
  const latest = versions[0];
  if (!latest) return null;
  if (latest.status === "draft") return { template, version: latest, created: false };
  const [draft] = await db
    .insert(templateVersions)
    .values({
      organizationId: input.organizationId,
      templateId: template.id,
      version: latest.version + 1,
      status: "draft",
      schema: parseTemplateSchema(latest.schema),
      createdByUserId: input.createdByUserId,
    })
    .returning();
  if (!draft) throw new Error("Could not open a new draft");
  return { template, version: draft, created: true };
}

export async function publishTemplateVersion(
  db: Database,
  input: { organizationId: string; versionId: string },
) {
  const version = await getTemplateVersion(
    db,
    { organizationId: input.organizationId },
    input.versionId,
  );
  if (!version) return { ok: false as const, error: "Version not found in this workspace." };
  if (version.status !== "draft") {
    return { ok: false as const, error: "Only a draft can be published." };
  }
  const schema = parseTemplateSchema(version.schema);
  const issues = validateForPublish(schema);
  if (issues.length > 0) {
    return { ok: false as const, error: issues[0]!.message, issues };
  }
  const [row] = await db
    .update(templateVersions)
    .set({ status: "published", publishedAt: new Date(), schema })
    .where(
      and(
        eq(templateVersions.id, version.id),
        eq(templateVersions.organizationId, input.organizationId),
        eq(templateVersions.status, "draft"),
      ),
    )
    .returning();
  if (!row) return { ok: false as const, error: "Could not publish this draft." };
  return { ok: true as const, version: row };
}

export async function getPublishedSchemaSnapshot(
  db: Database,
  scope: OrgScope,
  versionId: string,
): Promise<TemplateSchema | null> {
  const version = await getTemplateVersion(db, scope, versionId);
  if (!version) return null;
  return parseTemplateSchema(version.schema);
}
