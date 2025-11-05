// src/lib/catalog/getAllFromCatalog.server.ts
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
 * Obtiene todos los productos del catálogo desde la vista canónica api_catalog_with_images
 */
export async function getAllFromCatalog(): Promise<CatalogItem[]> {
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
      .range(0, 1999); // suficiente para catálogo actual

    if (error) {
      console.warn("[getAllFromCatalog] Error:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((d) => ({
      id: String(d.id),
      product_slug: String(d.product_slug ?? ""),
      section: String(d.section),
      title: String(d.title),
      description: d.description ?? null,
      price_cents: d.price_cents ?? null,
      currency: d.currency ?? "mxn",
      stock_qty: d.stock_qty ?? null,
      image_url: d.image_url ?? null,
    })) as CatalogItem[];
  } catch (error) {
    console.warn("[getAllFromCatalog] Error:", error);
    return [];
  }
}
