/**
 * Modelo normalizado para items del catálogo
 * Alineado con la vista canónica: api_catalog_with_images
 */

export type CatalogItem = {
  id: string; // uuid
  product_slug: string;
  section: string;
  title: string;
  description?: string | null;
  price_cents?: number | null;
  currency?: string | null;
  stock_qty?: number | null;
  image_url?: string | null;
};

/**
 * Normaliza un valor de precio a número (centavos)
 * Si value es centavos -> number; si undefined/null -> 0
 */
export function normalizePrice(value?: number | string | null): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === "string") {
    const n = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) {
      return Math.max(0, Math.round(n));
    }
  }
  return 0;
}

/**
 * Verifica si un item tiene un precio comprable (price_cents > 0 y stock_qty > 0)
 */
export function hasPurchasablePrice(
  item:
    | CatalogItem
    | { price_cents?: number | null; stock_qty?: number | null },
): boolean {
  const priceCents = normalizePrice(item.price_cents);
  const stockQty = normalizePrice(item.stock_qty);
  return priceCents > 0 && stockQty > 0;
}
