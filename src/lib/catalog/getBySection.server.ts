import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import { mapDbToCatalogItem, type CatalogItem } from "./mapDbToProduct";

export async function getBySection(section: string): Promise<CatalogItem[]> {
  noStore();
  const sb = getPublicSupabase();

  const { data, error } = await sb
    .from("api_catalog_with_images")
    .select("*")
    .eq("section", section)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map(mapDbToCatalogItem);
}
