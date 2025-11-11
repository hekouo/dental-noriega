// Tipos mínimos de la vista
export type DbRow = {
  id: string;
  section: string;
  product_slug: string;
  title: string | null;
  description?: string | null;
  image_url?: string | null;
  // columnas que pueden existir en diferentes vistas
  price_cents?: number | null;
  price?: number | null; // legacy, ignorar si price_cents existe
  in_stock?: boolean | null;
  stock_qty?: number | null;
  is_active?: boolean | null;
  active?: boolean | null;
};

export type CatalogItem = {
  id: string;
  section: string;
  slug: string;
  title: string;
  description?: string;
  image_url?: string;
  price: number; // pesos
  in_stock: boolean;
  is_active: boolean;
};

const toBool = (v: unknown, fallback = false): boolean =>
  typeof v === "boolean" ? v : fallback;

export function mapDbToCatalogItem(r: DbRow): CatalogItem {
  const cents =
    r.price_cents ??
    (typeof r.price === "number" ? Math.round(r.price * 100) : 0);
  const price = Math.max(0, Number(cents || 0) / 100);
  const is_active = toBool(r.is_active ?? r.active, true);
  const in_stock = toBool(
    r.in_stock ?? (typeof r.stock_qty === "number" ? r.stock_qty > 0 : undefined),
    false,
  );

  return {
    id: r.id,
    section: r.section,
    slug: r.product_slug,
    title: r.title ?? "",
    description: r.description ?? undefined,
    image_url: r.image_url ?? undefined,
    price,
    in_stock,
    is_active,
  };
}

// Legacy: mantener Product type para compatibilidad temporal
export type Product = CatalogItem;

export function mapRow(r: DbRow): Product {
  return mapDbToCatalogItem(r);
}
