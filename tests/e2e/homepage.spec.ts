import { test, expect } from "@playwright/test";

test("home loads and shows a shop link", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Depósito|Dental|Noriega/i);
  await expect(
    page.getByRole("link", { name: /tienda|destacados/i }),
  ).toBeVisible();
});
