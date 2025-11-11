import "server-only";
// Nada de cookies() aquí ni fetch a /api/debug/* en producción.

import { unstable_cache, revalidateTag } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";

export type FeaturedItem = {
  product_id: string;
  product_slug: string;
  section: string;
  title: string;
  description: string | null;
  price_cents: number | null;
  currency: string | null;
  stock_qty: number | null;
  image_url: string | null;
  position: number;
};

const FEATURED_CACHE_KEY = "featured:v3"; // bump para invalidar v2/v1

/**
 * Función pura que NO llama cookies() dentro de unstable_cache
 */
async function fetchFeaturedPure(regionKey: string): Promise<FeaturedItem[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getFeatured] missing supabase envs (using empty list)");
    }
    return [];
  }

  try {
    const supabase = getPublicSupabase();
    if (!supabase) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[getFeatured] supabase client not available");
      }
      return [];
    }

    // NO llames cookies aquí. Usa regionKey si lo necesitas en el futuro.
    const { data: frows, error: ferr } = await supabase
      .from("featured")
      .select("product_id, position")
      .order("position", { ascending: true })
      .limit(8);

    if (ferr || !frows?.length) return [];

    const ids = frows.map((r: { product_id: string }) => r.product_id);
    const { data: view, error: verr } = await supabase
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, section, title, description, price_cents, currency, stock_qty, image_url",
      )
      .in("id", ids);

    if (verr || !view) return [];

    type ViewItem = {
      id: string;
      product_slug: string;
      section: string;
      title: string;
      description: string | null;
      price_cents: number | null;
      currency: string | null;
      stock_qty: number | null;
      image_url: string | null;
    };

    const byId = new Map<string, ViewItem>(view.map((v: ViewItem) => [v.id, v]));
    return frows
      .map((r: { product_id: string; position: number }) => {
        const v = byId.get(r.product_id);
        if (!v) return null;
        return {
          product_id: v.id,
          product_slug: v.product_slug,
          section: v.section,
          title: v.title,
          description: v.description ?? null,
          price_cents: v.price_cents ?? null,
          currency: v.currency ?? "mxn",
          stock_qty: v.stock_qty ?? null,
          image_url: v.image_url ?? null,
          position: r.position,
        } satisfies FeaturedItem;
      })
      .filter(Boolean) as FeaturedItem[];
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getFeatured] Error:", error);
    }
    return [];
  }
}

// Cachea solo la parte pura (sin cookies) con fallback si trae 0 items
export const getFeaturedCached = unstable_cache(
  async (regionKey: string) => {
    const items = await fetchFeaturedPure(regionKey);
    // Fallback: si caché trae 0, rehacer una vez sin caché
    if (!items?.length) {
      return fetchFeaturedPure(regionKey);
    }
    return items;
  },
  [FEATURED_CACHE_KEY],
  { revalidate: 60, tags: ["featured"] }
);

// Wrapper por request: lee cookies AQUÍ, fuera de la cache
export async function getFeatured(): Promise<FeaturedItem[]> {
  const { cookies } = await import("next/headers");
  const region = cookies().get("region")?.value ?? "no-region";
  return getFeaturedCached(region);
}

export function revalidateFeatured() {
  revalidateTag("featured");
}

// Alias para compatibilidad con código existente
export async function getFeaturedProducts(): Promise<
  Array<{
    id: string;
    product_slug: string;
    title: string;
    section: string;
    price_cents: number;
    image_url?: string | null;
    in_stock?: boolean | null;
    sku?: string | null;
  }>
> {
  const items = await getFeatured();
  return items.map((item) => ({
    id: item.product_id,
    product_slug: item.product_slug,
    title: item.title,
    section: item.section,
    price_cents: item.price_cents ?? 0,
    image_url: item.image_url,
    in_stock: item.stock_qty !== null ? item.stock_qty > 0 : null,
    sku: null,
  }));
}
