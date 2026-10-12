import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  doublePrecision,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  FeatureFlags,
  ReportCanonical,
  TemplateSchema,
  WorkspaceBranding,
} from "@inspectstack/domain";

export const membershipRoleEnum = pgEnum("membership_role", [
  "owner",
  "admin",
  "template_manager",
  "inspector",
  "reviewer",
  "client_viewer",
]);

export const membershipStatusEnum = pgEnum("membership_status", ["invited", "active", "suspended"]);

export const appModeEnum = pgEnum("app_mode", ["single_company", "saas"]);

export const inspectionStatusEnum = pgEnum("inspection_status", [
  "draft",
  "assigned",
  "in_progress",
  "submitted",
  "approved",
  "returned",
  "archived",
]);

export const findingStatusEnum = pgEnum("finding_status", [
  "open",
  "acknowledged",
  "in_progress",
  "ready_for_review",
  "closed",
  "reopened",
]);

export const templateVersionStatusEnum = pgEnum("template_version_status", [
  "draft",
  "published",
  "retired",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "queued",
  "sending",
  "applied",
  "conflict",
  "failed",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  timezone: text("timezone").notNull().default("Australia/Sydney"),
  appMode: appModeEnum("app_mode").notNull().default("single_company"),
  branding: jsonb("branding")
    .$type<WorkspaceBranding>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  planKey: text("plan_key").notNull().default("single"),
  featureFlags: jsonb("feature_flags")
    .$type<FeatureFlags>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamps.createdAt,
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
  createdAt: timestamps.createdAt,
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").notNull().default("active"),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    uniqueIndex("memberships_organization_id_user_id_key").on(table.organizationId, table.userId),
    index("memberships_user_idx").on(table.userId),
    index("memberships_org_idx").on(table.organizationId),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: membershipRoleEnum("role").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamps.createdAt,
  },
  (table) => [index("invitations_org_idx").on(table.organizationId)],
);

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    addressLine: text("address_line"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'`),
    externalId: text("external_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sites_org_idx").on(table.organizationId),
    uniqueIndex("sites_org_external_uidx").on(table.organizationId, table.externalId),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "sites_parent_id_fkey",
    }).onDelete("set null"),
  ],
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'`),
    externalId: text("external_id"),
    qrToken: text("qr_token").unique(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("assets_org_idx").on(table.organizationId),
    index("assets_site_idx").on(table.siteId),
    uniqueIndex("assets_org_external_uidx").on(table.organizationId, table.externalId),
  ],
);

export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    packKey: text("pack_key"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("templates_org_slug_uidx").on(table.organizationId, table.slug),
    index("templates_org_idx").on(table.organizationId),
  ],
);

export const templateVersions = pgTable(
  "template_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: templateVersionStatusEnum("status").notNull().default("draft"),
    schema: jsonb("schema")
      .$type<TemplateSchema>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    uniqueIndex("template_versions_uidx").on(table.templateId, table.version),
    index("template_versions_org_idx").on(table.organizationId),
  ],
);

export const inspections = pgTable(
  "inspections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    templateVersionId: uuid("template_version_id")
      .notNull()
      .references(() => templateVersions.id),
    siteId: uuid("site_id").references(() => sites.id, { onDelete: "set null" }),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: inspectionStatusEnum("status").notNull().default("draft"),
    number: text("number").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    revision: integer("revision").notNull().default(0),
    createdAt: timestamps.createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("inspections_org_number_uidx").on(table.organizationId, table.number),
    index("inspections_org_idx").on(table.organizationId),
    index("inspections_assignee_idx").on(table.assignedToUserId),
  ],
);

export const responses = pgTable(
  "responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => inspections.id, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(),
    value: jsonb("value")
      .$type<unknown>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    revision: integer("revision").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("responses_inspection_field_uidx").on(table.inspectionId, table.fieldKey),
    index("responses_org_idx").on(table.organizationId),
  ],
);

export const findings = pgTable(
  "findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => inspections.id, { onDelete: "cascade" }),
    fieldKey: text("field_key"),
    title: text("title").notNull(),
    severity: text("severity").notNull().default("medium"),
    status: findingStatusEnum("status").notNull().default("open"),
    notes: text("notes"),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("findings_org_idx").on(table.organizationId),
    index("findings_inspection_idx").on(table.inspectionId),
  ],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => inspections.id, { onDelete: "cascade" }),
    findingId: uuid("finding_id").references(() => findings.id, { onDelete: "set null" }),
    fieldKey: text("field_key"),
    storageKey: text("storage_key").notNull().unique(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size"),
    contentHash: text("content_hash"),
    caption: text("caption"),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    annotation: jsonb("annotation")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    index("media_org_idx").on(table.organizationId),
    index("media_inspection_idx").on(table.inspectionId),
    index("media_field_idx").on(table.inspectionId, table.fieldKey),
  ],
);

export const reportSnapshots = pgTable(
  "report_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => inspections.id, { onDelete: "cascade" }),
    layoutKey: text("layout_key").notNull().default("condition"),
    contentHash: text("content_hash").notNull(),
    storageKey: text("storage_key"),
    verificationCode: text("verification_code").notNull().unique(),
    snapshot: jsonb("snapshot")
      .$type<ReportCanonical>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    issuedByUserId: uuid("issued_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("report_snapshots_org_idx").on(table.organizationId),
    index("report_snapshots_inspection_idx").on(table.inspectionId),
  ],
);

export const reportShareLinks = pgTable(
  "report_share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => reportSnapshots.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    index("report_share_links_org_idx").on(table.organizationId),
    index("report_share_links_snapshot_idx").on(table.snapshotId),
  ],
);

export const reportDownloads = pgTable(
  "report_downloads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => reportSnapshots.id, { onDelete: "cascade" }),
    shareLinkId: uuid("share_link_id").references(() => reportShareLinks.id, {
      onDelete: "set null",
    }),
    source: text("source").notNull().default("verify"),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    index("report_downloads_org_idx").on(table.organizationId),
    index("report_downloads_snapshot_idx").on(table.snapshotId),
  ],
);

export const syncOperations = pgTable(
  "sync_operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    inspectionId: uuid("inspection_id").references(() => inspections.id, {
      onDelete: "cascade",
    }),
    clientOperationId: text("client_operation_id").notNull(),
    status: syncStatusEnum("status").notNull().default("queued"),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    result: jsonb("result").$type<Record<string, unknown> | null>(),
    createdAt: timestamps.createdAt,
    appliedAt: timestamp("applied_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("sync_operations_client_uidx").on(table.organizationId, table.clientOperationId),
    index("sync_operations_org_idx").on(table.organizationId),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    index("audit_events_org_idx").on(table.organizationId),
    index("audit_events_created_idx").on(table.createdAt),
  ],
);

export const impersonationSessions = pgTable(
  "impersonation_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetOrganizationId: uuid("target_organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    index("impersonation_sessions_actor_idx").on(table.actorUserId),
    index("impersonation_sessions_org_idx").on(table.targetOrganizationId),
  ],
);

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    bucketKey: text("bucket_key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    hitCount: integer("hit_count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.bucketKey, table.windowStart], name: "rate_limit_buckets_pkey" }),
  ],
);

export const scheduleRules = pgTable(
  "schedule_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").references(() => sites.id, { onDelete: "set null" }),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
    templateVersionId: uuid("template_version_id")
      .notNull()
      .references(() => templateVersions.id),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    frequency: text("frequency").notNull(),
    timeZone: text("time_zone").notNull(),
    localHour: integer("local_hour").notNull().default(17),
    localMinute: integer("local_minute").notNull().default(0),
    weekday: integer("weekday"),
    dayOfMonth: integer("day_of_month"),
    intervalDays: integer("interval_days"),
    onceLocalDate: date("once_local_date", { mode: "string" }),
    nextRunLocalDate: date("next_run_local_date", { mode: "string" }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("schedule_rules_org_idx").on(table.organizationId),
    index("schedule_rules_next_idx").on(table.nextRunLocalDate),
  ],
);

export const scheduleJobs = pgTable(
  "schedule_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    scheduleRuleId: uuid("schedule_rule_id")
      .notNull()
      .references(() => scheduleRules.id, { onDelete: "cascade" }),
    localDate: date("local_date", { mode: "string" }).notNull(),
    inspectionId: uuid("inspection_id").references(() => inspections.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("pending"),
    error: text("error"),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    uniqueIndex("schedule_jobs_rule_date_uidx").on(table.scheduleRuleId, table.localDate),
    index("schedule_jobs_org_idx").on(table.organizationId),
  ],
);

export const findingComments = pgTable(
  "finding_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    findingId: uuid("finding_id")
      .notNull()
      .references(() => findings.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    index("finding_comments_org_idx").on(table.organizationId),
    index("finding_comments_finding_idx").on(table.findingId),
  ],
);
