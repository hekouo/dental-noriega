// scripts/audit/axe.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import * as fs from "node:fs";
import * as path from "node:path";

// Páginas representativas
const PAGES = [
  "/", // Home
  "/destacados", // Destacados
  "/tienda", // Tienda
  "/buscar?q=arco", // Búsqueda
  "/checkout/datos", // Paso de checkout (sin datos sensibles)
];

test.describe("A11y (axe) smoke", () => {
  for (const route of PAGES) {
    test(`axe: ${route}`, async ({ page }) => {
      const base =
        process.env.AUDIT_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "http://localhost:3000";
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });

      const results = await new AxeBuilder({ page })
        .disableRules(["color-contrast"]) // opcional si hay falsos positivos iniciales
        .analyze();

      // Guarda reporte JSON
      const outDir =
        process.env.AXE_OUT_DIR || path.resolve(process.cwd(), "reports/axe");
      fs.mkdirSync(outDir, { recursive: true });
      const safeRoute = route.replace(/[^\w]/g, "_");
      const reportPath = path.join(outDir, `${safeRoute}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

      const violations = results.violations || [];
      // No fallar el build inicialmente: solo warn si hay violaciones (>0)
      console.log(`♿ ${route} → ${violations.length} violaciones`);
      for (const v of violations) {
        console.log(` - ${v.id}: ${v.help} (${v.impact})`);
      }
      expect(violations.length).toBeLessThan(10); // umbral tolerante para MVP
    });
  }
});
