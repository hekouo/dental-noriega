import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import { mapDbToCatalogItem, type CatalogItem } from "./mapDbToProduct";

export async function getProduct(
  section: string,
  slug: string,
): Promise<CatalogItem | null> {
  noStore();
  const sb = getPublicSupabase();

  // Primero intentar por section + slug
  let { data, error } = await sb
    .from("api_catalog_with_images")
    .select("*")
    .eq("section", section)
    .eq("product_slug", slug)
    .maybeSingle();

  // Si no encuentra, intentar solo por slug (para evitar 404 falsos)
  if (!data && !error) {
    const result = await sb
      .from("api_catalog_with_images")
      .select("*")
      .eq("product_slug", slug)
      .maybeSingle();
    data = result.data;
    error = result.error;
  }

  if (error) return null;
  if (!data) return null;

  return mapDbToCatalogItem(data);
}
