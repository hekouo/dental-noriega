// src/lib/catalog/getProductsBySectionFromView.server.ts
import "server-only";

import { createServerSupabase } from "@/lib/supabase/server-auth";
import type { CatalogItem } from "@/lib/supabase/catalog";

/**
 * Obtiene productos por sección desde la vista api_catalog_with_images.
 * Útil como fallback cuando la tabla sections está vacía o no hay section_id.
 */
export async function getProductsBySectionFromView(
  section: string,
  limit = 100,
  offset = 0,
): Promise<CatalogItem[]> {
  const supabase = createServerSupabase();

  try {
    const { data, error } = await supabase
      .from("api_catalog_with_images")
      .select("id, section, product_slug, title, price_cents, image_url, in_stock, stock_qty")
      .eq("section", section)
      .order("title", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn("[getProductsBySectionFromView] Error:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return (data as CatalogItem[]).map((item) => ({
      id: String(item.id),
      section: item.section,
      product_slug: item.product_slug,
      title: item.title,
      price_cents: item.price_cents,
      image_url: item.image_url,
      in_stock: item.in_stock ?? null,
      stock_qty: item.stock_qty ?? null,
    }));
  } catch (error) {
    console.warn("[getProductsBySectionFromView] Error:", error);
    return [];
  }
}

