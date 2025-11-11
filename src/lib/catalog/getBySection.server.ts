import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/public";
import { mapDbToCatalogItem } from "./mapDbToProduct";

export async function getBySection(section: string) {
  noStore();
  const sb = createClient();

  const { data, error } = await sb
    .from("api_catalog_with_images")
    .select("*")
    .eq("section", section)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []).map(mapDbToCatalogItem);
}
