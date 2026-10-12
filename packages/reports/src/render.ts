import { renderToBuffer } from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
import { createElement } from "react";
import type { ReportDocument } from "@inspectstack/domain";
import { ReportPdfDocument, type ReportImages } from "./document";
import { registerReportFonts } from "./fonts";

export async function renderReportPdf(input: {
  document: ReportDocument;
  images?: ReportImages;
}): Promise<Buffer> {
  registerReportFonts();
  const element = createElement(ReportPdfDocument, {
    document: input.document,
    images: input.images ?? {},
  });
  const raw = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
  const pdf = await PDFDocument.load(raw);
  pdf.setTitle(`${input.document.inspection.number} · ${input.document.organization.name}`);
  pdf.setAuthor(input.document.organization.name);
  pdf.setSubject(`Verification ${input.document.envelope.verificationCode}`);
  pdf.setProducer("InspectStack");
  pdf.setCreator("InspectStack");
  const issued = new Date(input.document.envelope.issuedAt);
  if (!Number.isNaN(issued.getTime())) {
    pdf.setCreationDate(issued);
    pdf.setModificationDate(issued);
  }
  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}
