// src/lib/search.ts
import { searchProducts as searchProductsFromSupabase } from "@/lib/supabase/catalog";
import { mxnFromCents } from "@/lib/utils/currency";
import { normalizeText } from "@/lib/utils/text";

export type SearchItem = {
  sectionSlug: string;
  sectionName: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  image: string;
  imageResolved?: string;
};

export async function searchProducts(q: string): Promise<SearchItem[]> {
  const needle = normalizeText(q);
  if (!needle) return [];

  const results = await searchProductsFromSupabase(q, 24);

  return results.map((item) => ({
    sectionSlug: item.section,
    sectionName: item.section,
    slug: item.product_slug,
    title: item.title,
    description: item.title, // Usar title como description por ahora
    price: mxnFromCents(item.price_cents),
    image: item.image_url || "",
    imageResolved: item.image_url || undefined,
  }));
}
