import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/public";
import { mapDbToCatalogItem, type DbRow } from "./mapDbToProduct";

export async function getProduct(
  section: string,
  slug: string,
): Promise<ReturnType<typeof mapDbToCatalogItem> | null> {
  noStore();
  const sb = createClient();

  // 1) Intentar obtener el producto desde la vista canónica
  //    api_catalog_with_images (section + slug)
  const { data, error } = await sb
    .from("api_catalog_with_images")
    .select("*")
    .eq("section", section)
    .eq("product_slug", slug)
    .maybeSingle();

  if (!error && data) {
    const item = mapDbToCatalogItem(data as DbRow);
    // Regla de negocio: si no está activo, tratar como no disponible
    if (!item.is_active) return null;
    return item;
  }

  // 2) Fallback: buscar por slug en cualquier sección dentro de la vista
  const { data: dataBySlug, error: errorBySlug } = await sb
    .from("api_catalog_with_images")
    .select("*")
    .eq("product_slug", slug)
    .maybeSingle();

  if (!errorBySlug && dataBySlug) {
    const item = mapDbToCatalogItem(dataBySlug as DbRow);
    if (!item.is_active) return null;
    return item;
  }

  // Si no está en la vista, lo tratamos como no disponible
  return null;
}

