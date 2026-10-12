export { renderReportPdf } from "./render";
export { ReportPdfDocument, type ReportImages } from "./document";
export { registerReportFonts } from "./fonts";
export {
  GOLDEN_FIXTURES,
  propertyGolden,
  vehicleGolden,
  constructionGolden,
  safetyGolden,
} from "./fixtures";

export function reportPackageReady(): true {
  return true;
}
