// scripts/audit/axe.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = [
  "/",
  "/destacados",
  "/tienda",
  "/buscar?q=arco",
  "/checkout/datos",
];

// Umbral flexible: hasta 10 violaciones por página (ajustable)
const MAX_VIOLATIONS = 10;

for (const route of ROUTES) {
  test(`axe: ${route}`, async ({ page, baseURL }) => {
    const url = new URL(route, baseURL).toString();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    // Log para debugging en CI
    console.log(`[axe] ${route}: violations=${results.violations.length}`);
    for (const v of results.violations.slice(0, 5)) {
      console.log(
        `[axe] rule=${v.id} impact=${v.impact} nodes=${v.nodes.length}`,
      );
    }

    expect(results.violations.length).toBeLessThanOrEqual(MAX_VIOLATIONS);
  });
}
