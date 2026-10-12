import { z } from "zod";
import { DEFAULT_BRANDING, type PaperSize, type SnapshotBranding } from "./branding";
import { listFields } from "./template-rules";
import { scoreTemplate } from "./template-scoring";
import type { TemplateField, TemplateSchema } from "./template-schema";
import { stableStringify } from "./inspection-ops";
import { sha256Hex } from "./sha256";
import { FINDING_STATUSES } from "./statuses";
import { FINDING_SEVERITIES } from "./template-fields";

export const REPORT_LAYOUTS = ["condition", "audit"] as const;
export type ReportLayoutKey = (typeof REPORT_LAYOUTS)[number];

export const REPORT_SNAPSHOT_SCHEMA_VERSION = 1 as const;

const brandingSchema: z.ZodType<SnapshotBranding> = z.object({
  logoUrl: z.string().nullable(),
  primaryColor: z.string(),
  legalFooter: z.string(),
  terminology: z.object({
    inspection: z.string(),
    site: z.string(),
    asset: z.string(),
    finding: z.string(),
  }),
});

const snapshotFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.string(),
  display: z.string(),
  result: z.enum(["pass", "fail", "na"]).optional(),
});

const snapshotSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  fields: z.array(snapshotFieldSchema),
});

const snapshotFindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.enum(FINDING_SEVERITIES),
  status: z.enum(FINDING_STATUSES),
  notes: z.string().nullable(),
  fieldKey: z.string().nullable(),
  ownerName: z.string().nullable(),
  dueAt: z.string().nullable(),
  evidenceHashes: z.array(z.string()),
});

const snapshotMediaSchema = z.object({
  id: z.string(),
  fieldKey: z.string().nullable(),
  caption: z.string().nullable(),
  contentType: z.string(),
  contentHash: z.string(),
  capturedAt: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

const snapshotSignatureSchema = z.object({
  fieldKey: z.string(),
  label: z.string(),
  contentHash: z.string().nullable(),
  display: z.string(),
});

export const reportCanonicalSchema = z.object({
  schemaVersion: z.literal(REPORT_SNAPSHOT_SCHEMA_VERSION),
  layoutKey: z.enum(REPORT_LAYOUTS),
  organization: z.object({
    name: z.string(),
    timezone: z.string(),
    branding: brandingSchema,
  }),
  inspection: z.object({
    number: z.string(),
    templateName: z.string(),
    templateVersion: z.number().int().positive(),
    siteName: z.string().nullable(),
    assetName: z.string().nullable(),
    inspectorName: z.string().nullable(),
    reviewerName: z.string().nullable(),
  }),
  summary: z.object({
    mode: z.string(),
    percentPass: z.number().nullable(),
    trafficLight: z.enum(["pass", "fail", "incomplete"]),
    failCount: z.number().int().nonnegative(),
    passCount: z.number().int().nonnegative(),
    naCount: z.number().int().nonnegative(),
    unanswered: z.number().int().nonnegative(),
    findingCount: z.number().int().nonnegative(),
    highFindingCount: z.number().int().nonnegative(),
  }),
  sections: z.array(snapshotSectionSchema),
  findings: z.array(snapshotFindingSchema),
  media: z.array(snapshotMediaSchema),
  signatures: z.array(snapshotSignatureSchema),
  legalFooter: z.string(),
});

export type ReportCanonical = z.infer<typeof reportCanonicalSchema>;

export type ReportEnvelope = {
  issuedAt: string;
  verificationCode: string;
  issuedByName: string | null;
  paperSize?: PaperSize;
};

export type ReportDocument = ReportCanonical & { envelope: ReportEnvelope };

export function parseReportCanonical(input: unknown): ReportCanonical {
  return reportCanonicalSchema.parse(input);
}

export function layoutForPack(packKey: string | null | undefined): ReportLayoutKey {
  if (packKey === "construction" || packKey === "workplace-safety") return "audit";
  return "condition";
}

function passFailOf(value: unknown): "pass" | "fail" | "na" | undefined {
  if (value === "pass" || value === "fail" || value === "na") return value;
  if (value && typeof value === "object" && "result" in value) {
    const result = (value as { result: unknown }).result;
    if (result === "pass" || result === "fail" || result === "na") return result;
  }
  return undefined;
}

export function formatAnswerDisplay(field: TemplateField, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "pass_fail") {
    const result = passFailOf(value);
    if (result === "pass") return "Pass";
    if (result === "fail") return "Fail";
    if (result === "na") return "N/A";
    return "—";
  }
  if (field.type === "boolean") {
    if (value === true || value === "yes" || value === "true") return "Yes";
    if (value === false || value === "no" || value === "false") return "No";
    return "—";
  }
  if (field.type === "acknowledgment") {
    return value === true || value === "acknowledged" ? "Acknowledged" : "—";
  }
  if (field.type === "signature" || field.type === "initials") {
    if (typeof value === "string" && value.startsWith("data:")) return "Signed";
    if (value && typeof value === "object" && "dataUrl" in value) return "Signed";
    return "—";
  }
  if (field.type === "gps") {
    if (!value || typeof value !== "object") return "—";
    const row = value as { latitude?: unknown; longitude?: unknown };
    if (Number.isFinite(row.latitude) && Number.isFinite(row.longitude)) {
      return `${Number(row.latitude).toFixed(5)}, ${Number(row.longitude).toFixed(5)}`;
    }
    return "—";
  }
  if (field.type === "photo_group") return "See evidence";
  if (field.type === "multi_select" && Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "number" && Number.isFinite(value)) {
    return field.unit ? `${value} ${field.unit}` : String(value);
  }
  if (typeof value === "string") return value.trim() || "—";
  if (value && typeof value === "object" && "result" in value) {
    return String((value as { result: unknown }).result ?? "—");
  }
  return String(value);
}

function answerFor(
  schema: TemplateSchema,
  responses: Record<string, unknown>,
  field: TemplateField,
): unknown {
  if (Object.prototype.hasOwnProperty.call(responses, field.id)) return responses[field.id];
  if (Object.prototype.hasOwnProperty.call(responses, field.key)) return responses[field.key];
  return undefined;
}

export type SnapshotFindingInput = {
  id: string;
  title: string;
  severity: string;
  status: string;
  notes: string | null;
  fieldKey: string | null;
  ownerName: string | null;
  dueAt: string | null;
  evidenceHashes: string[];
};

export type SnapshotMediaInput = {
  id: string;
  fieldKey: string | null;
  caption: string | null;
  contentType: string;
  contentHash: string;
  capturedAt: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function buildReportCanonical(input: {
  layoutKey: ReportLayoutKey;
  organization: { name: string; timezone: string; branding?: SnapshotBranding | null };
  inspection: {
    number: string;
    templateName: string;
    templateVersion: number;
    siteName: string | null;
    assetName: string | null;
    inspectorName: string | null;
    reviewerName: string | null;
  };
  schema: TemplateSchema;
  responses: Record<string, unknown>;
  findings: SnapshotFindingInput[];
  media: SnapshotMediaInput[];
}): ReportCanonical {
  const branding = input.organization.branding ?? DEFAULT_BRANDING;
  const score = scoreTemplate(
    input.schema,
    Object.entries(input.responses).map(([fieldKey, value]) => ({ fieldKey, value })),
  );
  const sections = input.schema.sections.map((section) => ({
    id: section.id,
    title: section.title,
    fields: section.fields
      .filter((field) => field.type !== "computed")
      .map((field) => {
        const value = answerFor(input.schema, input.responses, field);
        return {
          key: field.key,
          label: field.label,
          type: field.type,
          display: formatAnswerDisplay(field, value),
          result: field.type === "pass_fail" ? passFailOf(value) : undefined,
        };
      }),
  }));
  const findings = input.findings.map((row) => ({
    id: row.id,
    title: row.title,
    severity: (FINDING_SEVERITIES as readonly string[]).includes(row.severity)
      ? (row.severity as (typeof FINDING_SEVERITIES)[number])
      : "medium",
    status: (FINDING_STATUSES as readonly string[]).includes(row.status)
      ? (row.status as (typeof FINDING_STATUSES)[number])
      : "open",
    notes: row.notes,
    fieldKey: row.fieldKey,
    ownerName: row.ownerName,
    dueAt: row.dueAt,
    evidenceHashes: [...row.evidenceHashes].sort(),
  }));
  const media = [...input.media].sort((a, b) => a.contentHash.localeCompare(b.contentHash));
  const signatureFields = listFields(input.schema).filter(
    (field) =>
      field.type === "signature" || field.type === "initials" || field.type === "acknowledgment",
  );
  const signatures = signatureFields.map((field) => {
    const value = answerFor(input.schema, input.responses, field);
    const related = media.find((item) => item.fieldKey === field.key || item.fieldKey === field.id);
    return {
      fieldKey: field.key,
      label: field.label,
      contentHash: related?.contentHash ?? null,
      display: formatAnswerDisplay(field, value),
    };
  });

  return reportCanonicalSchema.parse({
    schemaVersion: REPORT_SNAPSHOT_SCHEMA_VERSION,
    layoutKey: input.layoutKey,
    organization: {
      name: input.organization.name,
      timezone: input.organization.timezone,
      branding: {
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor,
        legalFooter: branding.legalFooter,
        terminology: { ...branding.terminology },
      },
    },
    inspection: { ...input.inspection },
    summary: {
      mode: score.mode,
      percentPass: score.percentPass,
      trafficLight: score.trafficLight,
      failCount: score.failCount,
      passCount: score.passCount,
      naCount: score.naCount,
      unanswered: score.unanswered,
      findingCount: findings.length,
      highFindingCount: findings.filter((row) => row.severity === "high").length,
    },
    sections,
    findings,
    media,
    signatures,
    legalFooter: branding.legalFooter,
  });
}

export async function hashReportCanonical(canonical: ReportCanonical): Promise<string> {
  const Encoder = (
    globalThis as { TextEncoder?: new () => { encode: (input: string) => Uint8Array } }
  ).TextEncoder;
  if (!Encoder) throw new Error("SHA-256 is not available in this runtime");
  return sha256Hex(new Encoder().encode(stableStringify(canonical)));
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newVerificationCode(bytes: Uint8Array): string {
  let out = "IS-";
  for (let i = 0; i < 8; i += 1) {
    out += CODE_ALPHABET[(bytes[i] ?? 0) % CODE_ALPHABET.length];
  }
  return out;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const g = globalThis as unknown as {
    crypto?: { getRandomValues?: (bytes: Uint8Array) => Uint8Array };
  };
  if (g.crypto?.getRandomValues) g.crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

export function mintVerificationCode(): string {
  return newVerificationCode(randomBytes(8));
}

export function mintShareToken(): string {
  return [...randomBytes(24)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isShareUnavailable(input: {
  revokedAt: Date | string | null | undefined;
  expiresAt?: Date | string | null | undefined;
  now?: Date;
}): boolean {
  if (input.revokedAt) return true;
  if (!input.expiresAt) return false;
  const expires = input.expiresAt instanceof Date ? input.expiresAt : new Date(input.expiresAt);
  const now = input.now ?? new Date();
  return expires.getTime() <= now.getTime();
}
