import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/public";
import { mapDbToCatalogItem } from "./mapDbToProduct";

export async function getFeatured(limit = 12) {
  noStore();
  const sb = createClient();

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
    const map = new Map(data!.map((r) => [r.id, r]));
    const ordered = ids.map((id) => map.get(id)).filter(Boolean);
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

// Legacy export para compatibilidad
export type FeaturedItem = {
  product_id: string;
  product_slug: string;
  section: string;
  title: string;
  description: string | null;
  price_cents: number | null;
  currency: string | null;
  image_url: string | null;
  in_stock: boolean | null;
  is_active: boolean | null;
  position: number;
};

export async function getFeaturedItems(): Promise<FeaturedItem[]> {
  const items = await getFeatured();
  return items.map((item, idx) => ({
    product_id: item.id,
    product_slug: item.slug,
    section: item.section,
    title: item.title,
    description: item.description ?? null,
    price_cents: Math.round(item.price * 100),
    currency: "mxn",
    image_url: item.image_url ?? null,
    in_stock: item.in_stock,
    is_active: item.is_active,
    position: idx,
  }));
}
