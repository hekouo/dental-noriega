"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import type { CatalogItem } from "./model";

/**
 * Obtiene productos por sección desde la vista canónica api_catalog_with_images
 * Sin cache, runtime puro.
 */
export async function getProductsBySection(
  section: string,
  limit = 100,
  offset = 0
): Promise<CatalogItem[]> {
  noStore();

  const s = getPublicSupabase();
  const { data, error } = await s
    .from("api_catalog_with_images")
    .select(
      "id, product_slug, section, title, description, price_cents, currency, stock_qty, image_url"
    )
    .eq("section", section)
    .eq("active", true)
    .order("title", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  if (!data || data.length === 0) {
    return [];
  }

  type CatalogRow = {
    id: string | number;
    product_slug: string | null;
    section: string;
    title: string;
    description: string | null;
    price_cents: number | null;
    currency: string | null;
    stock_qty: number | null;
    image_url: string | null;
  };

  return (data as CatalogRow[]).map((item) => ({
    id: String(item.id),
    product_slug: String(item.product_slug ?? ""),
    section: String(item.section),
    title: String(item.title),
    description: item.description ?? null,
    price_cents: item.price_cents ?? null,
    currency: item.currency ?? "mxn",
    stock_qty: item.stock_qty ?? null,
    image_url: item.image_url ?? null,
  })) as CatalogItem[];
}

export async function revalidateCatalog() {
  // No-op: ya no usamos cache
}
