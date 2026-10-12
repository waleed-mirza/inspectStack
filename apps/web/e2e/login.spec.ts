import { expect, test } from "@playwright/test";

const password = process.env.SEED_PASSWORD ?? "";
const loggedOut = { cookies: [], origins: [] };

test.describe("login page", () => {
  test.use({ storageState: loggedOut });

  test("shows evaluator copy and demo personas", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Open a workspace" })).toBeVisible();
    await expect(page.getByText("Amina Owner")).toBeVisible();
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeAttached();
  });

  test("password sign-in opens job tickets", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-1280",
      "one password login; others reuse the session",
    );
    test.skip(!password, "SEED_PASSWORD is required (see .env.example)");
    await page.goto("/login");
    await page.getByLabel("Email").first().fill("westfield.owner@inspectstack.demo");
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByRole("heading", { name: "Job tickets" })).toBeVisible();
    await expect(page.getByText(/WV-\d+/).first()).toBeVisible();
  });
});
