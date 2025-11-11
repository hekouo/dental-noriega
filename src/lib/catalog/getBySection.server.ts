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

  // Debug: imprimir primer item desde DB y tras mapRow
  if (data && data.length > 0) {
    const firstRaw = data[0];
    const firstMapped = mapRow(firstRaw);
    console.log("[bySection] DEBUG - Primer item desde DB:", JSON.stringify({
      id: firstRaw.id,
      product_slug: firstRaw.product_slug,
      active: firstRaw.active,
      stock_qty: firstRaw.stock_qty,
      price: firstRaw.price,
    }));
    console.log("[bySection] DEBUG - Tras mapRow:", JSON.stringify({
      id: firstMapped.id,
      slug: firstMapped.slug,
      active: firstMapped.active,
      inStock: firstMapped.inStock,
      price: firstMapped.price,
    }));
    console.log("[bySection] DEBUG - Total items desde DB:", data.length);
    console.log("[bySection] DEBUG - Total items tras mapRow y filter:", (data ?? []).map(mapRow).filter((p) => p.active).length);
  }

  return (data ?? []).map(mapRow).filter((p) => p.active);
}
