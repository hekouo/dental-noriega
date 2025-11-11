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
    // eslint-disable-next-line no-restricted-syntax
    image_url: p.imageUrl ?? null, // Product usa imageUrl, FeaturedItem usa image_url
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

  if (featError) {
    dbg("[featured] supabase error fetching featured", featError);
  }

  // Si no hay featured o hay error, usar fallback
  if (!featuredData || featuredData.length === 0) {
    dbg("[featured] No hay productos destacados, usando fallback");
    // Fallback: 12 más recientes activos y en stock
    const { data: fallbackData, error: fallbackError } = await supa
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, section, title, description, price, image_url, stock_qty, active"
      )
      .eq("active", true)
      .gt("stock_qty", 0)
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(12);

    if (fallbackError) {
      dbg("[featured] fallback error", fallbackError);
      return [];
    }

    return (fallbackData ?? []).map(mapRow).filter((p) => p.active && p.inStock);
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
    dbg("[featured] supabase error", error);
    // Si hay error, intentar fallback
    const { data: fallbackData } = await supa
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, section, title, description, price, image_url, stock_qty, active"
      )
      .eq("active", true)
      .gt("stock_qty", 0)
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(12);
    return (fallbackData ?? []).map(mapRow).filter((p) => p.active && p.inStock);
  }

  // Si la query devuelve 0 filas, usar fallback
  if (!data || data.length === 0) {
    dbg("[featured] Query devolvió 0 filas, usando fallback");
    const { data: fallbackData } = await supa
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, section, title, description, price, image_url, stock_qty, active"
      )
      .eq("active", true)
      .gt("stock_qty", 0)
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(12);
    return (fallbackData ?? []).map(mapRow).filter((p) => p.active && p.inStock);
  }

  // Debug: imprimir primer item desde DB y tras mapRow (solo en dev)
  if (data && data.length > 0) {
    const firstRaw = data[0];
    const firstMapped = mapRow(firstRaw);
    dbg("[featured] DEBUG - Primer item desde DB:", JSON.stringify({
      id: firstRaw.id,
      product_slug: firstRaw.product_slug,
      active: firstRaw.active,
      stock_qty: firstRaw.stock_qty,
      price: firstRaw.price,
    }));
    dbg("[featured] DEBUG - Tras mapRow:", JSON.stringify({
      id: firstMapped.id,
      slug: firstMapped.slug,
      active: firstMapped.active,
      inStock: firstMapped.inStock,
      price: firstMapped.price,
    }));
  }

  // Mapear y mantener orden según featured
  const bySlug = new Map((data ?? []).map((item) => [item.product_slug, item]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map(mapRow)
    .filter((p) => p.active && p.inStock);
}

// Función legacy para compatibilidad con componentes
export async function getFeaturedItems(): Promise<FeaturedItem[]> {
  const products = await getFeatured();
  return products.map((p, idx) => productToFeaturedItem(p, idx));
}
