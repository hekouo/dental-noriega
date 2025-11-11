import "server-only";
// Nada de cookies() aquí ni fetch a /api/debug/* en producción.

import { unstable_cache } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/client";
import {
  FEATURED_TAG,
  revalidateFeatured as revalidateFeaturedTag,
} from "@/lib/catalog/cache";

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

type FeaturedOpts = { region?: string | null }; // lo que sacabas de cookies

/**
 * Fetch puro de featured (sin cookies, sin cache)
 */
async function _fetchFeatured(opts: FeaturedOpts): Promise<FeaturedItem[]> {
  const s = getPublicSupabase();
  if (!s) {
    // Solo loggear en runtime, no en build
    if (process.env.NEXT_RUNTIME) {
      console.warn("[getFeatured] missing supabase envs (using empty list)");
    }
    return [];
  }

  try {
    // NO llames cookies aquí. Usa opts.region si lo necesitas.
    const { data: frows, error: ferr } = await s
      .from("featured")
      .select("product_id, position")
      .order("position", { ascending: true })
      .limit(8);

    if (ferr || !frows?.length) return [];

    const ids = frows.map((r: { product_id: string }) => r.product_id);
    const { data: view, error: verr } = await s
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, section, title, description, price_cents, currency, stock_qty, image_url",
      )
      .in("id", ids);

    if (verr || !view) return [];

    const byId = new Map(
      view.map((v: { id: string }) => [v.id, v]),
    );
    return frows
      .map((r: { product_id: string; position: number }) => {
        const v = byId.get(r.product_id);
        if (!v) return null;
        return {
          product_id: (v as { id: string }).id,
          product_slug: (v as { product_slug: string }).product_slug,
          section: (v as { section: string }).section,
          title: (v as { title: string }).title,
          description: (v as { description: string | null }).description ?? null,
          price_cents: (v as { price_cents: number | null }).price_cents ?? null,
          currency: (v as { currency: string | null }).currency ?? "mxn",
          stock_qty: (v as { stock_qty: number | null }).stock_qty ?? null,
          image_url: (v as { image_url: string | null }).image_url ?? null,
          position: r.position,
        } satisfies FeaturedItem;
      })
      .filter(Boolean) as FeaturedItem[];
  } catch (error) {
    if (process.env.NEXT_RUNTIME) {
      console.warn("[getFeatured] Error:", error);
    }
    return [];
  }
}

// cachea solo la parte pura (sin cookies)
export const getFeaturedCached = unstable_cache(
  async (key: string) => _fetchFeatured({ region: key }),
  ["featured:list:v1"],
  { revalidate: 60, tags: [FEATURED_TAG] } // 1 minuto
);

// wrapper por request: lee cookies AQUÍ, fuera de la cache
export async function getFeatured(): Promise<FeaturedItem[]> {
  // importa cookies solo aquí
  const { cookies } = await import("next/headers");
  const region = cookies().get("region")?.value ?? null;
  // pasa la señal como key (string estable)
  return getFeaturedCached(region ?? "no-region");
}

export function revalidateFeatured() {
  revalidateFeaturedTag();
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
