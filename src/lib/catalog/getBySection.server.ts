"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import { mapRow, Product } from "./mapDbToProduct";

export async function getBySection(section: string): Promise<Product[]> {
  noStore();
  const supa = getPublicSupabase();
  const { data, error } = await supa
    .from("api_catalog_with_images")
    .select(
      "id, product_slug, section, title, description, price, image_url, stock_qty, active"
    )
    .eq("section", section)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[bySection] supabase error", error);
    return [];
  }
  return (data ?? []).map(mapRow).filter((p) => p.active);
}
