// src/lib/catalog/getProduct.server.ts
import "server-only";
import { findBySectionSlug, findFuzzy, type ProductLite } from "@/lib/data/catalog-index.server";

export type { ProductLite };

export async function getProductBySectionSlug(section: string, slug: string): Promise<ProductLite | null> {
  return findBySectionSlug(section, slug);
}

export async function resolveFallback(q: string): Promise<{ product?: ProductLite; suggestions: ProductLite[] }> {
  const result = findFuzzy(q);
  if (result.product) {
    return { product: result.product, suggestions: [] };
  }
  return { suggestions: result.suggestions };
}