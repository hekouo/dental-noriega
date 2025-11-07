import "server-only";
// Nada de cookies() aquí ni fetch a /api/debug/* en producción.

import { unstable_cache } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { FEATURED_TAG, revalidateFeatured } from "@/lib/catalog/cache";

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

async function fetchFeatured(): Promise<FeaturedItem[]> {
  // Verificar envs antes de intentar conectar
  if (!hasSupabaseEnvs()) {
    console.warn("[getFeatured] missing supabase envs (using empty list)");
    return [];
  }

  try {
    // 1) Traer featured crudo (product_id + position)
    const supabase = createServerSupabase();
    const { data: frows, error: ferr } = await supabase
      .from("featured")
      .select("product_id, position")
      .order("position", { ascending: true })
      .limit(8);

    if (ferr || !frows?.length) return [];

    // 2) Resolver cada product_id contra la vista canónica
    //    OJO: usar in (...) para 1 roundtrip
    const ids = frows.map((r) => r.product_id);
    const { data: view, error: verr } = await supabase
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, section, title, description, price_cents, currency, stock_qty, image_url",
      )
      .in("id", ids);

    if (verr || !view) return [];

    // 3) Mapear respetando el orden por position
    const byId = new Map(view.map((v) => [v.id, v]));
    return frows
      .map((r) => {
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
    console.warn("[getFeatured] Error:", error);
    return [];
  }
}

const cachedGetFeatured = unstable_cache(fetchFeatured, ["featured-v1"], {
  revalidate: 120,
  tags: [FEATURED_TAG],
});

// Devuelve máximo 8, ordenados por position
export async function getFeatured(): Promise<FeaturedItem[]> {
  return cachedGetFeatured();
}

export { revalidateFeatured };

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
