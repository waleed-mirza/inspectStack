import { expect, test } from "@playwright/test";

test.describe("storefront landing", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("home points at the MIT source and demo login", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /offline capture\. client-ready reports/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /see the walkthrough/i }).first()).toHaveAttribute(
      "href",
      "#walkthrough",
    );
    await expect(page.getByRole("link", { name: /open demo login/i })).toHaveAttribute(
      "href",
      "/login",
    );
    await expect(page.getByText("Free under the MIT license. You install and host it.")).toBeVisible();
    await expect(page.getByRole("heading", { name: /mit license/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /view source/i }).first()).toHaveAttribute(
      "href",
      "https://github.com/waleed-mirza/inspectStack",
    );
    await expect(page.getByRole("link", { name: /^Buy / })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Notify me" })).toHaveCount(0);
  });
});

test.describe("public report link", () => {
  test("unknown verification code hides the report", async ({ page }) => {
    await page.goto("/verify/IS-NOTAREAL");
    await expect(page.getByText(/no longer shared|not available|could not/i)).toBeVisible();
    await expect(page.getByText("Northline Property Group")).toHaveCount(0);
  });
});
