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
 * 
 * Reglas:
 * - Si in_stock es null/undefined, se considera disponible si is_active es true
 * - Si in_stock es false, está agotado
 * - Si is_active es false, no está disponible
 */
export function hasPurchasablePrice(
  item:
    | CatalogItem
    | { price_cents?: number | null; in_stock?: boolean | null; is_active?: boolean | null },
): boolean {
  const priceCents = normalizePrice(item.price_cents);
  if (priceCents <= 0) return false;
  
  // Si is_active es false, no está disponible
  if (item.is_active === false) return false;
  
  // Si in_stock es false, está agotado
  if (item.in_stock === false) return false;
  
  // Si in_stock es null/undefined pero is_active es true (o null), considerar disponible
  // (null significa "no especificado", no "agotado")
  return true;
}
