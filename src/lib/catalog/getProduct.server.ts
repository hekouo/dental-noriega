"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import { mapRow, Product } from "./mapDbToProduct";

export async function getProduct(
  section: string,
  slug: string
): Promise<Product | null> {
  noStore();
  const supa = getPublicSupabase();
  const { data, error } = await supa
    .from("api_catalog_with_images")
    .select(
      "id, product_slug, section, title, description, price, image_url, stock_qty, active"
    )
    .eq("section", section)
    .eq("product_slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getProduct] supabase error", error);
    return null;
  }
  return data ? mapRow(data) : null;
}
