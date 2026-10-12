import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hashReportCanonical } from "@inspectstack/domain";
import { GOLDEN_FIXTURES } from "./fixtures";
import { renderReportPdf } from "./render";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../goldens");

async function main() {
  mkdirSync(outDir, { recursive: true });
  const hashes: Record<string, string> = {};
  for (const fixture of GOLDEN_FIXTURES) {
    const built = fixture.build();
    const hash = await hashReportCanonical(built.canonical);
    hashes[fixture.id] = hash;
    const pdf = await renderReportPdf({ document: built.document, images: built.images });
    writeFileSync(join(outDir, fixture.file), pdf);
    console.log(`${fixture.file}  ${pdf.byteLength} bytes  hash ${hash.slice(0, 16)}…`);
  }
  writeFileSync(join(outDir, "hashes.json"), `${JSON.stringify(hashes, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
