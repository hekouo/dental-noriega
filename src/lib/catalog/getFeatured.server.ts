import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import { mapDbToCatalogItem, type CatalogItem } from "./mapDbToProduct";

export async function getFeatured(limit = 12): Promise<CatalogItem[]> {
  noStore();
  const sb = getPublicSupabase();

  // ¿Hay filas en featured?
  const { data: featRows, error: featErr } = await sb
    .from("featured")
    .select("position, product_id")
    .order("position", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (!featErr && featRows && featRows.length > 0) {
    const ids = featRows.map((f) => f.product_id);
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select("*")
      .in("id", ids);

    if (error) throw error;

    const map = new Map((data ?? []).map((r) => [r.id, r]));
    const ordered = ids
      .map((id) => map.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return ordered.map(mapDbToCatalogItem);
  }

  // Fallback solo si *no hay* filas en featured
  const { data, error } = await sb
    .from("api_catalog_with_images")
    .select("*")
    .eq("is_active", true) // si la vista tiene 'active', se mapea igual en el adaptador
    .eq("in_stock", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map(mapDbToCatalogItem);
}

// Legacy: mantener para compatibilidad con componentes que esperan FeaturedItem
export type FeaturedItem = CatalogItem & {
  product_id: string;
  product_slug: string;
  position: number;
  price_cents: number; // Legacy: mantener para compatibilidad
  image_url?: string | null; // Permitir null para compatibilidad
  description?: string | null; // Permitir null para compatibilidad
};

export async function getFeaturedItems(): Promise<FeaturedItem[]> {
  const items = await getFeatured();
  return items.map((item, idx) => ({
    ...item,
    product_id: item.id,
    product_slug: item.slug,
    position: idx,
    price_cents: Math.round(item.price * 100), // Convertir de pesos a centavos para compatibilidad
  }));
}
