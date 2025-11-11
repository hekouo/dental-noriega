// src/lib/catalog/getAllFromCatalog.server.ts
import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import type { CatalogItem } from "./model";

// Helper para logs de debug solo en desarrollo
const dbg = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
};

async function fetchAllFromCatalog(): Promise<CatalogItem[]> {
  noStore();
  const supabase = getPublicSupabase();

  try {
    const { data, error } = await supabase
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, section, title, description, price, currency, stock_qty, image_url, active"
      )
      .eq("active", true)
      .range(0, 1999); // suficiente para catálogo actual

    if (error) {
      dbg("[getAllFromCatalog] Error:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((d) => ({
      id: String(d.id),
      product_slug: String(d.product_slug ?? ""),
      section: String(d.section),
      title: String(d.title),
      description: d.description ?? null,
      price_cents: d.price ? Math.round(Number(d.price) * 100) : null,
      currency: d.currency ?? "mxn",
      stock_qty: d.stock_qty ?? null,
      image_url: d.image_url ?? null,
      in_stock: d.active && (d.stock_qty ?? 0) > 0,
    })) as CatalogItem[];
  } catch (error) {
    dbg("[getAllFromCatalog] Error:", error);
    return [];
  }
}

/**
 * Obtiene todos los productos del catálogo desde la vista canónica api_catalog_with_images
 */
export async function getAllFromCatalog(): Promise<CatalogItem[]> {
  return fetchAllFromCatalog();
}

export async function revalidateCatalog() {
  // No-op: ya no usamos cache
}
