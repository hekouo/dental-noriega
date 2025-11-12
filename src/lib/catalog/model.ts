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
  image_url?: string | null;
  in_stock?: boolean | null;
  is_active?: boolean | null;
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
    | { price_cents?: number | null; in_stock?: boolean | null; is_active?: boolean | null },
): boolean {
  const priceCents = normalizePrice(item.price_cents);
  // Usar in_stock e is_active
  const in_stock = item.in_stock ?? false;
  const is_active = item.is_active ?? true;
  return priceCents > 0 && in_stock && is_active;
}
