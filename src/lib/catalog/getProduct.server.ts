import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/public";
import { mapDbToCatalogItem } from "./mapDbToProduct";

export async function getProduct(
  section: string,
  slug: string,
): Promise<ReturnType<typeof mapDbToCatalogItem> | null> {
  noStore();
  const sb = createClient();
  
  // Primero intentar por section + slug
  const { data, error } = await sb
    .from("api_catalog_with_images")
    .select("*")
    .eq("section", section)
    .eq("product_slug", slug)
    .maybeSingle();

  if (!error && data) {
    return mapDbToCatalogItem(data);
  }

  // Si falla, intentar solo por slug
  const { data: dataBySlug, error: errorBySlug } = await sb
    .from("api_catalog_with_images")
    .select("*")
    .eq("product_slug", slug)
    .maybeSingle();

  if (errorBySlug || !dataBySlug) return null;
  return mapDbToCatalogItem(dataBySlug);
}
