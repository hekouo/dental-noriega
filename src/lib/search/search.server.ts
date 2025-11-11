// src/lib/search/search.server.ts
import "server-only";

import { createServerSupabase } from "@/lib/supabase/server-auth";

export type SearchResult = {
  id: string;
  section: string;
  product_slug: string;
  title: string;
  price_cents: number;
  image_url?: string | null;
  in_stock?: boolean | null;
};

/**
 * Búsqueda con tokenización básica y paginación.
 * Busca por section OR title (normalized_title).
 */
export async function searchProductsServer(
  query: string,
  limit = 20,
  offset = 0,
): Promise<SearchResult[]> {
  const supabase = createServerSupabase();

  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();

  try {
    // Buscar por section OR normalized_title (tokenizado)
    const { data, error } = await supabase
      .from("api_catalog_with_images")
      .select(
        "id, section, product_slug, title, price_cents, image_url, in_stock",
      )
      .or(
        `section.ilike.%${normalizedQuery}%,normalized_title.ilike.%${normalizedQuery}%`,
      )
      .eq("is_active", true)
      .order("title", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn("[searchProductsServer] Error:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((item) => ({
      id: String(item.id),
      section: String(item.section),
      product_slug: String(item.product_slug),
      title: String(item.title),
      price_cents: Number(item.price_cents),
      image_url: item.image_url ?? null,
      in_stock: item.in_stock ?? null,
    }));
  } catch (error) {
    console.warn("[searchProductsServer] Error:", error);
    return [];
  }
}
