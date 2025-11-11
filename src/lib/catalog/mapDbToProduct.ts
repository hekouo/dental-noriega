export type Product = {
  id: string;
  section: string;
  slug: string;
  title: string;
  description?: string;
  price: number;
  // eslint-disable-next-line no-restricted-syntax
  imageUrl?: string; // Tipo interno Product usa camelCase, UI usa snake_case
  inStock: boolean;
  active: boolean;
};

export function mapRow(r: {
  id: string;
  product_slug: string;
  section: string;
  title: string;
  description?: string | null;
  price: number | string | null;
  image_url?: string | null;
  in_stock?: boolean | null;
  stock_qty?: number | null; // Legacy: mantener por compatibilidad
  active?: boolean | null;
}): Product {
  const price = Number(r.price ?? 0);
  // Tratar null como true (productos sin active definido se consideran activos)
  // Si active=false, también tratarlo como activo para mostrar productos
  const active = r.active ?? true;
  // Si tiene in_stock explícito, usarlo; sino usar stock_qty como fallback
  const inStock = r.in_stock !== undefined && r.in_stock !== null
    ? r.in_stock
    : (r.stock_qty === null || Number(r.stock_qty ?? 0) >= 0);
  
  return {
    id: r.id,
    section: r.section,
    slug: r.product_slug,
    title: r.title ?? "",
    description: r.description ?? "",
    price,
    // eslint-disable-next-line no-restricted-syntax
    imageUrl: r.image_url ?? undefined, // Tipo interno Product usa camelCase
    inStock,
    active,
  };
}
