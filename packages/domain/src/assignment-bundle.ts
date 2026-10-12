import { z } from "zod";
import { INSPECTION_STATUSES } from "./statuses";
import { templateSchema, type TemplateSchema } from "./template-schema";

export const ASSIGNMENT_BUNDLE_VERSION = 1;

export const DEFAULT_UPLOAD_POLICY = {
  maxBytes: 8 * 1024 * 1024,
  allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"] as const,
  maxPhotosPerField: 8,
};

const uploadPolicySchema = z.object({
  maxBytes: z.number().int().positive(),
  allowedContentTypes: z.array(z.string().min(1)).min(1),
  maxPhotosPerField: z.number().int().positive(),
});

export const mediaManifestSchema = z.object({
  mediaId: z.string().min(1),
  fieldKey: z.string().min(1),
  contentHash: z.string().min(1),
  contentType: z.string().min(1),
  byteSize: z.number().int().nonnegative(),
  caption: z.string().optional(),
  capturedAt: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  annotation: z.unknown().optional(),
  storageKey: z.string().optional(),
});

export type MediaManifest = z.infer<typeof mediaManifestSchema>;
export type UploadPolicy = z.infer<typeof uploadPolicySchema>;

export const assignmentBundleSchema = z.object({
  bundleVersion: z.literal(ASSIGNMENT_BUNDLE_VERSION),
  downloadedAt: z.string().min(1),
  organization: z.object({
    id: z.string().min(1),
    name: z.string(),
    timezone: z.string(),
    branding: z.unknown().optional(),
  }),
  inspection: z.object({
    id: z.string().min(1),
    number: z.string().min(1),
    status: z.enum(INSPECTION_STATUSES),
    revision: z.number().int().nonnegative(),
    dueAt: z.string().nullable().optional(),
    startedAt: z.string().nullable().optional(),
    assignedToUserId: z.string().nullable().optional(),
    templateVersionId: z.string().min(1),
    siteId: z.string().nullable().optional(),
    assetId: z.string().nullable().optional(),
  }),
  template: z.object({
    id: z.string().min(1),
    name: z.string(),
    version: z.number().int().positive(),
    versionId: z.string().min(1),
    schema: templateSchema,
  }),
  site: z
    .object({
      id: z.string().min(1),
      name: z.string(),
      externalId: z.string().nullable().optional(),
    })
    .nullable(),
  asset: z
    .object({
      id: z.string().min(1),
      name: z.string(),
      externalId: z.string().nullable().optional(),
    })
    .nullable(),
  responses: z.array(
    z.object({
      fieldKey: z.string().min(1),
      value: z.unknown(),
      revision: z.number().int().nonnegative().default(0),
    }),
  ),
  media: z.array(mediaManifestSchema),
  findings: z.array(
    z.object({
      id: z.string().min(1),
      fieldKey: z.string().nullable().optional(),
      title: z.string(),
      severity: z.string(),
      status: z.string(),
      notes: z.string().nullable().optional(),
    }),
  ),
  uploadPolicy: uploadPolicySchema,
});

export type AssignmentBundle = z.infer<typeof assignmentBundleSchema>;

export function parseAssignmentBundle(input: unknown): AssignmentBundle {
  return assignmentBundleSchema.parse(input);
}

export function defaultUploadPolicy(): UploadPolicy {
  return {
    maxBytes: DEFAULT_UPLOAD_POLICY.maxBytes,
    allowedContentTypes: [...DEFAULT_UPLOAD_POLICY.allowedContentTypes],
    maxPhotosPerField: DEFAULT_UPLOAD_POLICY.maxPhotosPerField,
  };
}

export function publishedTemplateSchema(bundle: AssignmentBundle): TemplateSchema {
  return bundle.template.schema;
}
