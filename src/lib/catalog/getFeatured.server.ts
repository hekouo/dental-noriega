import "server-only";
// Nada de cookies() aquí ni fetch a /api/debug/* en producción.

import { unstable_cache } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
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

/**
 * Verifica si las variables de entorno de Supabase están presentes
 */
function hasSupabaseEnvs(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

type FeaturedOpts = { region?: string | null }; // lo que sacabas de cookies

/**
 * Función pura que NO llama cookies() dentro de unstable_cache
 */
async function _fetchFeatured(opts: FeaturedOpts): Promise<FeaturedItem[]> {
  if (!hasSupabaseEnvs()) {
    // Solo loggear en runtime, no en build
    if (process.env.NEXT_RUNTIME) {
      console.warn("[getFeatured] missing supabase envs (using empty list)");
    }
    return [];
  }

  try {
    const supabase = getPublicSupabase();
    if (!supabase) {
      if (process.env.NEXT_RUNTIME) {
        console.warn("[getFeatured] supabase client not available");
      }
      return [];
    }

    // NO llames cookies aquí. Usa opts.region si lo necesitas en el futuro.
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
    if (process.env.NEXT_RUNTIME) {
      console.warn("[getFeatured] Error:", error);
    }
    return [];
  }
}

// Cachea solo la parte pura (sin cookies)
export const getFeaturedCached = unstable_cache(
  async (key: string) => _fetchFeatured({ region: key }),
  ["featured:list:v1"],
  { revalidate: 60, tags: [FEATURED_TAG] } // 1 minuto
);

// Wrapper por request: lee cookies AQUÍ, fuera de la cache
export async function getFeatured(): Promise<FeaturedItem[]> {
  // Por ahora no usamos cookies, pero la estructura está lista
  // Si en el futuro necesitas region, puedes hacer:
  // const { cookies } = await import('next/headers');
  // const region = cookies().get('region')?.value ?? null;
  // return getFeaturedCached(region ?? 'no-region');
  
  // Por ahora, usa una key estable
  return getFeaturedCached("no-region");
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
