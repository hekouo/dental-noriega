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
  active?: boolean | null;
}): Product {
  const price = Number(r.price ?? 0);
  const active = r.active ?? true;
  const inStock = r.in_stock ?? false;
  
  return {
    id: r.id,
    section: r.section,
    slug: r.product_slug,
    title: r.title ?? "",
    description: r.description ?? "",
    price,
    // eslint-disable-next-line no-restricted-syntax
    imageUrl: r.image_url ?? "", // Product usa imageUrl, UI usa image_url
    inStock,
    active,
  };
}
