import { expect, test } from "@playwright/test";

test.describe("throttled mobile", () => {
  test("360px jobs list still renders under 3G-like latency", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-360", "mobile viewport only");
    const session = await page.context().newCDPSession(page);
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: Math.round((400 * 1024) / 8),
      uploadThroughput: Math.round((400 * 1024) / 8),
      latency: 400,
    });
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Job tickets" })).toBeVisible({
      timeout: 45_000,
    });
  });
});
