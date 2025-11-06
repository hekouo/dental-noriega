import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = [
  "/",
  "/destacados",
  "/tienda",
  "/buscar?q=arco",
  "/checkout/datos",
];
const MAX_VIOLATIONS = 10;

test.describe("A11y (Axe)", () => {
  for (const route of ROUTES) {
    test(`a11y ${route}`, async ({ page, baseURL }) => {
      const url = new URL(route, baseURL).toString();
      await page.goto(url, { waitUntil: "networkidle" });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      console.log(
        `[axe] route=${route} violations=${results.violations.length}`,
      );
      expect(results.violations.length).toBeLessThanOrEqual(MAX_VIOLATIONS);
    });
  }
});
