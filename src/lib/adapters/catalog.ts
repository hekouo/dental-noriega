import type { CatalogItem } from "@/lib/supabase/catalog";

export function toCardProps(x: CatalogItem) {
  return {
    id: x.id,
    section: x.section,
    slug: x.product_slug,
    title: x.title,
    price_cents: x.price_cents,
    image_url: x.image_url,
    in_stock: x.in_stock,
    is_active: x.is_active ?? true,
  };
}
