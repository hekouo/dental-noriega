"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import { mapRow, Product } from "./mapDbToProduct";

// Tipo legacy para compatibilidad con componentes existentes
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

// Adaptador Product -> FeaturedItem
function productToFeaturedItem(p: Product, position: number): FeaturedItem {
  return {
    product_id: p.id,
    product_slug: p.slug,
    section: p.section,
    title: p.title,
    description: p.description ?? null,
    price_cents: Math.round(p.price * 100), // convertir a centavos
    currency: "mxn",
    stock_qty: p.inStock ? 1 : 0,
    image_url: p.image_url ?? null,
    position,
  };
}

export async function getFeatured(): Promise<Product[]> {
  noStore(); // nada de cache
  const supa = getPublicSupabase();

  // Obtener featured primero
  const { data: featuredData, error: featError } = await supa
    .from("featured")
    .select("product_slug")
    .order("position", { ascending: true });

  if (featError || !featuredData?.length) {
    if (featError) {
      console.error("[featured] supabase error fetching featured", featError);
    }
    return [];
  }

  const slugs = featuredData.map((x) => x.product_slug);

  // join vista + featured
  const { data, error } = await supa
    .from("api_catalog_with_images")
    .select(
      "id, product_slug, section, title, description, price, image_url, stock_qty, active"
    )
    .in("product_slug", slugs);

  if (error) {
    console.error("[featured] supabase error", error);
    return [];
  }

  // Mapear y mantener orden según featured
  const bySlug = new Map((data ?? []).map((item) => [item.product_slug, item]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map(mapRow)
    .filter((p) => p.active);
}

// Función legacy para compatibilidad con componentes
export async function getFeaturedItems(): Promise<FeaturedItem[]> {
  const products = await getFeatured();
  return products.map((p, idx) => productToFeaturedItem(p, idx));
}
