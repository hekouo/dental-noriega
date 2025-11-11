"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import { mapRow, Product } from "./mapDbToProduct";

// Helper para logs de debug solo en desarrollo
const dbg = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
};

export async function getProduct(
  section: string,
  slug: string
): Promise<Product | null> {
  noStore();
  const supa = getPublicSupabase();

  // Primero intentar por section + slug
  let { data, error } = await supa
    .from("api_catalog_with_images")
    .select(
      "id, product_slug, section, title, description, price, image_url, stock_qty, active"
    )
    .eq("section", section)
    .eq("product_slug", slug)
    .limit(1)
    .maybeSingle();

  // Si no encuentra, intentar solo por slug (para evitar 404 falsos)
  if (!data && !error) {
    dbg(`[getProduct] No encontrado por section+slug, intentando solo por slug`);
    const result = await supa
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, section, title, description, price, image_url, stock_qty, active"
      )
      .eq("product_slug", slug)
      .limit(1)
      .maybeSingle();
    data = result.data;
    error = result.error;
  }

  if (error) {
    dbg("[getProduct] supabase error", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return mapRow(data);
}
