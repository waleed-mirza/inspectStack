import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Font } from "@react-pdf/renderer";

function fontsDir() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../fonts"),
    join(here, "../../fonts"),
    join(process.cwd(), "packages/reports/fonts"),
    join(process.cwd(), "../../packages/reports/fonts"),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "SourceSans3-Regular.ttf"))) return dir;
  }
  return join(here, "../fonts");
}

const dir = fontsDir();

let registered = false;

export function registerReportFonts() {
  if (registered) return;
  Font.register({
    family: "Barlow Semi Condensed",
    fonts: [
      { src: join(dir, "BarlowSemiCondensed-SemiBold.ttf"), fontWeight: 600 },
      { src: join(dir, "BarlowSemiCondensed-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Source Sans 3",
    fonts: [
      { src: join(dir, "SourceSans3-Regular.ttf"), fontWeight: 400 },
      { src: join(dir, "SourceSans3-SemiBold.ttf"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: "Spline Sans Mono",
    src: join(dir, "SplineSansMono-Regular.ttf"),
  });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
