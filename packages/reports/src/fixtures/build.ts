import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildReportCanonical,
  type ReportCanonical,
  type ReportDocument,
  type ReportLayoutKey,
  type SnapshotFindingInput,
  type StarterPack,
} from "@inspectstack/domain";

const evidencePath = join(dirname(fileURLToPath(import.meta.url)), "evidence.png");

export function evidencePng(): Buffer {
  return readFileSync(evidencePath);
}

export function evidenceHash(): string {
  return createHash("sha256").update(evidencePng()).digest("hex");
}

export function goldenDocument(input: {
  pack: StarterPack;
  layoutKey: ReportLayoutKey;
  orgName: string;
  primaryColor: string;
  number: string;
  siteName: string;
  assetName: string;
  inspectorName: string;
  reviewerName: string;
  responses: Record<string, unknown>;
  findings: SnapshotFindingInput[];
  verificationCode: string;
}): { canonical: ReportCanonical; document: ReportDocument; images: Record<string, Buffer> } {
  const hash = evidenceHash();
  const canonical = buildReportCanonical({
    layoutKey: input.layoutKey,
    organization: {
      name: input.orgName,
      timezone: "Australia/Sydney",
      branding: {
        logoUrl: null,
        primaryColor: input.primaryColor,
        legalFooter: "Demo snapshot. Not a regulated certificate.",
        terminology: {
          inspection: "Inspection",
          site: "Site",
          asset: "Asset",
          finding: "Finding",
        },
      },
    },
    inspection: {
      number: input.number,
      templateName: input.pack.name,
      templateVersion: 1,
      siteName: input.siteName,
      assetName: input.assetName,
      inspectorName: input.inspectorName,
      reviewerName: input.reviewerName,
    },
    schema: input.pack.schema,
    responses: input.responses,
    findings: input.findings,
    media: [
      {
        id: "media-evidence",
        fieldKey: input.findings[0]?.fieldKey ?? "photo",
        caption: "Annotated evidence",
        contentType: "image/png",
        contentHash: hash,
        capturedAt: "2026-08-31T00:00:00.000Z",
        latitude: -33.8688,
        longitude: 151.2093,
      },
    ],
  });
  return {
    canonical,
    document: {
      ...canonical,
      envelope: {
        issuedAt: "2026-08-31T04:00:00.000Z",
        verificationCode: input.verificationCode,
        issuedByName: input.reviewerName,
      },
    },
    images: { [hash]: evidencePng() },
  };
}
