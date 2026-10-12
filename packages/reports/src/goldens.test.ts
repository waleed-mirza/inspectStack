import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hashReportCanonical } from "@inspectstack/domain";
import { GOLDEN_FIXTURES } from "./fixtures";
import { renderReportPdf } from "./render";

const goldens = join(dirname(fileURLToPath(import.meta.url)), "../goldens");

describe("golden report snapshots", () => {
  it("hashes identical canonical models the same for all four verticals", async () => {
    for (const fixture of GOLDEN_FIXTURES) {
      const a = await hashReportCanonical(fixture.build().canonical);
      const b = await hashReportCanonical(fixture.build().canonical);
      expect(a).toBe(b);
      expect(a).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("renders four PDFs that start with a PDF header", async () => {
    for (const fixture of GOLDEN_FIXTURES) {
      const built = fixture.build();
      const pdf = await renderReportPdf({ document: built.document, images: built.images });
      expect(pdf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
      expect(pdf.byteLength).toBeGreaterThan(2000);
    }
  });

  it("keeps committed golden files when they exist", () => {
    for (const fixture of GOLDEN_FIXTURES) {
      const path = join(goldens, fixture.file);
      if (!existsSync(path)) continue;
      const bytes = readFileSync(path);
      expect(bytes.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    }
  });
});
