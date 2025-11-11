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
  in_stock?: boolean | null;
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
 * Verifica si un item tiene un precio comprable (price_cents > 0 y stock disponible)
 */
export function hasPurchasablePrice(
  item:
    | CatalogItem
    | { price_cents?: number | null; stock_qty?: number | null; in_stock?: boolean | null },
): boolean {
  const priceCents = normalizePrice(item.price_cents);
  // Si tiene in_stock explícito, usarlo; sino usar stock_qty
  if (item.in_stock !== undefined && item.in_stock !== null) {
    return priceCents > 0 && item.in_stock === true;
  }
  const stockQty = normalizePrice(item.stock_qty);
  return priceCents > 0 && stockQty > 0;
}
