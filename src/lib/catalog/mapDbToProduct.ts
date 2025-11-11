export type Product = {
  id: string;
  section: string;
  slug: string;
  title: string;
  description?: string;
  price: number;
  image_url?: string;
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
  stock_qty?: number | null;
  active?: boolean | null;
}): Product {
  const price = Number(r.price ?? 0);
  const stockQty = Number(r.stock_qty ?? 0);
  const active = r.active ?? true;
  return {
    id: r.id,
    section: r.section,
    slug: r.product_slug,
    title: r.title ?? "",
    description: r.description ?? "",
    price,
    image_url: r.image_url ?? undefined,
    inStock: active && stockQty > 0,
    active,
  };
}

