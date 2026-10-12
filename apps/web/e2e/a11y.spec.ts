import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { AxeResults } from "axe-core";

function axeMinPath() {
  const candidates = [
    join(process.cwd(), "node_modules/axe-core/axe.min.js"),
    join(process.cwd(), "../../node_modules/axe-core/axe.min.js"),
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error("axe-core/axe.min.js not found from apps/web or repo root");
  return found;
}

const axePath = axeMinPath();
const loggedOut = { cookies: [], origins: [] };

async function seriousViolations(page: import("@playwright/test").Page) {
  await page.addScriptTag({ path: axePath });
  const results = await page.evaluate(async () => {
    return (globalThis as unknown as { axe: { run: () => Promise<AxeResults> } }).axe.run();
  });
  return results.violations.filter((row) => row.impact === "serious" || row.impact === "critical");
}

test.describe("accessibility", () => {
  test.describe("logged out", () => {
    test.use({ storageState: loggedOut });

    test("login has no critical or serious axe findings", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium-1280", "axe once at desktop width");
      await page.goto("/login");
      const hits = await seriousViolations(page);
      expect(hits, JSON.stringify(hits.map((h) => h.id))).toEqual([]);
    });

    test("keyboard reaches email then password on login", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium-1280", "keyboard path at desktop width");
      await page.goto("/login");
      await page.getByLabel("Email").first().focus();
      await expect(page.getByLabel("Email").first()).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Password")).toBeFocused();
    });
  });

  test("jobs list has no critical or serious axe findings", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-1280", "axe once at desktop width");
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Job tickets" })).toBeVisible();
    const hits = await seriousViolations(page);
    expect(hits, JSON.stringify(hits.map((h) => h.id))).toEqual([]);
  });
});
