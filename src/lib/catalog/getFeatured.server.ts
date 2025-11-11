"use server";

import { getPublicSupabase } from "@/lib/supabase/public";
import { unstable_noStore as noStore } from "next/cache";

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

export async function getFeatured(): Promise<FeaturedItem[]> {
  noStore(); // fuerza no-cache

  // leer cookies aquí (fuera de cualquier cache) si necesitas región
  // const region = cookies().get("region")?.value ?? null;

  const s = getPublicSupabase();

  // 1) leemos posiciones de featured
  const { data: feats, error: e1 } = await s
    .from("featured")
    .select("product_id, position")
    .order("position", { ascending: true });

  if (e1) throw e1;
  if (!feats?.length) return [];

  const ids = feats.map((f) => f.product_id);
  // 2) leemos vista canónica con imagen primaria
  const { data: items, error: e2 } = await s
    .from("api_catalog_with_images")
    .select("*")
    .in("id", ids);

  if (e2) throw e2;

  // ordenar según position
  const order = new Map(ids.map((id, i) => [id, i]));
  const sorted = (items ?? []).sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  );

  // Mapear a FeaturedItem
  return sorted.map((item, idx) => ({
    product_id: String(item.id),
    product_slug: String(item.product_slug ?? ""),
    section: String(item.section),
    title: String(item.title),
    description: item.description ?? null,
    price_cents: item.price_cents ?? null,
    currency: item.currency ?? "mxn",
    stock_qty: item.stock_qty ?? null,
    image_url: item.image_url ?? null,
    position: feats[idx]?.position ?? idx,
  }));
}

export async function revalidateFeatured() {
  // No-op: ya no usamos cache
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
