// src/lib/catalog/getProductsBySectionFromView.server.ts
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
 * Obtiene productos por sección desde la vista api_catalog_with_images.
 * Útil como fallback cuando la tabla sections está vacía o no hay section_id.
 */
export async function getProductsBySectionFromView(
  section: string,
  limit = 100,
  offset = 0,
): Promise<CatalogItem[]> {
  if (!hasSupabaseEnvs()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[catalog] missing supabase envs (using empty list)");
    }
    return [];
  }

  const supabase = createServerSupabase();

  try {
    const { data, error } = await supabase
      .from("api_catalog_with_images")
      .select("*")
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

    return data.map((item: any) => ({
      id: String(item.id),
      product_slug: String(item.product_slug ?? ""),
      section: String(item.section),
      title: String(item.title),
      description: item.description ?? null,
      price_cents: item.price_cents ?? null,
      currency: item.currency ?? "mxn",
      image_url: item.image_url ?? null,
      in_stock: item.in_stock ?? null,
      // La vista puede tener 'active' o 'is_active', mapear correctamente
      is_active: item.is_active ?? item.active ?? null,
    })) as CatalogItem[];
  } catch (error) {
    console.warn("[getProductsBySectionFromView] Error:", error);
    return [];
  }
}
