// src/lib/catalog/getFeatured.server.ts
import "server-only";

import { createClient } from "@/lib/supabase/client";

export type FeaturedItem = {
  id: string; // UUID (string)
  product_slug: string;
  title: string;
  section: string;
  price_cents: number;
  image_url?: string | null;
  in_stock?: boolean | null;
  sku?: string | null;
};

const FALLBACK_SLUGS = (process.env.NEXT_PUBLIC_FEATURED_FALLBACK_SLUGS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export async function getFeaturedProducts(): Promise<FeaturedItem[]> {
  const supabase = createClient();

  // 1) featured → posiciones + UUIDs
  const { data: frows, error: ferr } = await supabase
    .from("featured")
    .select("position, product_id")
    .order("position", { ascending: true });

  if (ferr) {
    console.warn("[featured] error leyendo featured:", ferr.message);
  }

  if (!frows || frows.length === 0) {
    // Fallback por slugs si no hay rows en featured (no rompe prod)
    if (FALLBACK_SLUGS.length === 0) return [];
    const { data: v2, error: e2 } = await supabase
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, title, section, price_cents, image_url, in_stock, sku",
      )
      .in("product_slug", FALLBACK_SLUGS);

    if (e2 || !v2) return [];
    // Reordenar según orden de FALLBACK_SLUGS
    const order = new Map(FALLBACK_SLUGS.map((slug, i) => [slug, i]));
    return [...v2]
      .sort(
        (a, b) =>
          (order.get(a.product_slug) ?? 999) -
          (order.get(b.product_slug) ?? 999),
      )
      .map((x) => ({
        id: String(x.id),
        product_slug: x.product_slug,
        title: x.title,
        section: x.section,
        price_cents: x.price_cents,
        image_url: x.image_url,
        in_stock: x.in_stock,
        sku: x.sku ?? null,
      }));
  }

  const ordered = frows
    .filter((r) => !!r.product_id)
    .sort((a, b) => a.position - b.position);

  const ids = ordered.map((r) => r.product_id);

  // 2) Vista: pedir por UUIDs (id es UUID en la vista)
  const { data: vrows, error: verr } = await supabase
    .from("api_catalog_with_images")
    .select(
      "id, product_slug, title, section, price_cents, image_url, in_stock, sku",
    )
    .in("id", ids);

  if (verr || !vrows) {
    console.warn("[featured] error leyendo vista:", verr?.message);
    return [];
  }

  // 3) Reorder por position
  const byId = new Map(vrows.map((x) => [String(x.id), x]));
  return ordered
    .map((r) => byId.get(String(r.product_id)))
    .filter(Boolean)
    .map((x) => ({
      id: String(x!.id),
      product_slug: x!.product_slug,
      title: x!.title,
      section: x!.section,
      price_cents: x!.price_cents,
      image_url: x!.image_url,
      in_stock: x!.in_stock,
      sku: x!.sku ?? null,
    }));
}
