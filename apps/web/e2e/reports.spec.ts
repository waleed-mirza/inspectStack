import { expect, test } from "@playwright/test";

test.describe("issued report", () => {
  test("session can open a snapshot from Reports", async ({ page }) => {
    await page.goto("/app/reports");
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(page.getByText("NL-1002").first()).toBeVisible();
    await expect(page.getByText(/snapshot/i).first()).toBeVisible();
  });
});
