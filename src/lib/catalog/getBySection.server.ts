// src/lib/catalog/getBySection.server.ts
import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import type { CatalogItem } from "./model";

/**
 * Verifica si las variables de entorno de Supabase están presentes
 */
function hasSupabaseEnvs(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Obtiene productos por sección desde la vista canónica api_catalog_with_images
 */
export async function getProductsBySection(
  section: string,
  limit = 100,
  offset = 0,
): Promise<CatalogItem[]> {
  if (!hasSupabaseEnvs()) {
    console.warn("[catalog] missing supabase envs (using empty list)");
    return [];
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, section, title, description, price_cents, currency, stock_qty, image_url",
      )
      .eq("section", section)
      .order("title", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn("[getProductsBySection] Error:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((item) => ({
      id: String(item.id),
      product_slug: String(item.product_slug ?? ""),
      section: String(item.section),
      title: String(item.title),
      description: item.description ?? null,
      price_cents: item.price_cents ?? null,
      currency: item.currency ?? "mxn",
      stock_qty: item.stock_qty ?? null,
      image_url: item.image_url ?? null,
    })) as CatalogItem[];
  } catch (error) {
    console.warn("[getProductsBySection] Error:", error);
    return [];
  }
}
