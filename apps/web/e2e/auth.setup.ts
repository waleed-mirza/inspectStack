import { expect, test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const password = process.env.SEED_PASSWORD ?? "";
const authFile = "e2e/.auth/user.json";

setup("authenticate reviewer", async ({ page }) => {
  setup.skip(!password, "SEED_PASSWORD is required (see .env.example)");
  mkdirSync(dirname(authFile), { recursive: true });
  await page.goto("/login");
  await page.getByLabel("Email").first().fill("reviewer@inspectstack.demo");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Job tickets" })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
