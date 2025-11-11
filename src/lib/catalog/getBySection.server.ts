// src/lib/catalog/getBySection.server.ts
import "server-only";

import { unstable_cache, revalidateTag } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import type { CatalogItem } from "./model";

const CATALOG_CACHE_KEY = "catalog:by-section:v3"; // bump para invalidar v2/v1

/**
 * Función pura que NO llama cookies() dentro de unstable_cache
 */
async function fetchProductsBySectionPure(
  section: string,
  limit = 100,
  offset = 0,
): Promise<CatalogItem[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[catalog] missing supabase envs (using empty list)");
    }
    return [];
  }

  try {
    const supabase = getPublicSupabase();
    if (!supabase) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[getProductsBySection] supabase client not available");
      }
      return [];
    }

    const { data, error } = await supabase
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, section, title, description, price_cents, currency, stock_qty, image_url",
      )
      .eq("section", section)
      .order("title", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[getProductsBySection] Error:", error.message);
      }
      return [];
    }

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
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getProductsBySection] Error:", error);
    }
    return [];
  }
}

// Cachea solo la parte pura (sin cookies) con fallback si trae 0 items
const cachedGetProductsBySection = unstable_cache(
  async (section: string, limit: number, offset: number) => {
    const items = await fetchProductsBySectionPure(section, limit, offset);
    // Fallback: si caché trae 0, rehacer una vez sin caché
    if (!items?.length) {
      return fetchProductsBySectionPure(section, limit, offset);
    }
    return items;
  },
  [CATALOG_CACHE_KEY],
  { revalidate: 120, tags: ["catalog"] }
);

/**
 * Obtiene productos por sección desde la vista canónica api_catalog_with_images
 */
export async function getProductsBySection(
  section: string,
  limit = 100,
  offset = 0,
): Promise<CatalogItem[]> {
  return cachedGetProductsBySection(section, limit, offset);
}

export function revalidateCatalog() {
  revalidateTag("catalog");
}
