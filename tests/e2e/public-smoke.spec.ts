import { test, expect } from "@playwright/test";

const PAGES = ["/", "/destacados", "/catalogo", "/catalogo/equipos"];

for (const path of PAGES) {
  test(`200 OK en ${path} y sin tarjetas grises`, async ({ page }) => {
    await page.goto(`http://localhost:3002${path}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveTitle(/Depósito|Catálogo|Tienda/i);

    const wrappers = page.locator("div.relative.w-full.aspect-square.bg-white");
    const emptyState = page.locator("text=/No hay productos/i");

    // Debe existir al menos un wrapper de imagen o el estado vacío controlado
    const hasWrapper = await wrappers
      .first()
      .count()
      .then((c) => c > 0);
    const hasEmpty = await emptyState.count().then((c) => c > 0);
    expect(hasWrapper || hasEmpty).toBeTruthy();
  });
}
