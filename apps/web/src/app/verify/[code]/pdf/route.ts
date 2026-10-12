import { NextResponse } from "next/server";
import {
  createStorageAdapter,
  getPublicReportByCode,
  getSnapshotPdfBytes,
  logReportDownload,
} from "@inspectstack/db";
import { renderReportPdf } from "@inspectstack/reports";
import { getDb } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const db = getDb();
  const result = await getPublicReportByCode(db, decodeURIComponent(code));
  if (!result.ok) {
    return new NextResponse("This report is no longer shared.", {
      status: 410,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "private, no-store, max-age=0, must-revalidate",
      },
    });
  }

  await logReportDownload(db, {
    organizationId: result.snapshot.organizationId,
    snapshotId: result.snapshot.id,
    source: "verify",
  });

  const storage = createStorageAdapter();
  let bytes = await getSnapshotPdfBytes(db, storage, result.snapshot);
  if (!bytes) {
    bytes = await renderReportPdf({
      document: {
        ...result.canonical,
        envelope: {
          issuedAt: result.snapshot.issuedAt.toISOString(),
          verificationCode: result.snapshot.verificationCode,
          issuedByName: null,
        },
      },
    });
  }

  return new NextResponse(Uint8Array.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${result.canonical.inspection.number}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
