import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("A11y (Axe)", () => {
  const routes = [
    "/",
    "/destacados",
    "/tienda",
    "/buscar?q=arco",
    "/checkout/datos",
  ];

  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(20000);
  });

  for (const route of routes) {
    test(`a11y ${route}`, async ({ page, baseURL }) => {
      const url = new URL(route, baseURL).toString();

      try {
        await page.goto(url, { waitUntil: "domcontentloaded" });
      } catch {
        // un intento más si el runner está tonto
        await page.goto(url);
      }

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const violations = results.violations?.length ?? 0;
      console.log(`[axe] route=${route} violations=${violations}`);
      expect(violations).toBeLessThanOrEqual(10);
    });
  }
});
