// src/lib/catalog/getAllFromView.server.ts
import "server-only";
import { listCatalog } from "@/lib/supabase/catalog";

export type CatalogItemLite = {
  id: string;
  product_slug: string;
  section: string;
  title: string;
  price: number;
  price_cents: number;
  image_url: string | null;
};

/**
 * Obtiene todos los productos desde api_catalog_with_images
 * Devuelve formato simplificado para búsqueda
 */
export async function getAllFromView(): Promise<CatalogItemLite[]> {
  const items = await listCatalog();
  return items.map((item) => ({
    id: item.id,
    product_slug: item.product_slug,
    section: item.section,
    title: item.title,
    price: Math.round(item.price_cents / 100),
    price_cents: item.price_cents,
    image_url: item.image_url,
  }));
}

